// المساعد: POST /api/assistant — Gemini إن توفر المفتاح، وإلا إجابات جاهزة (FAQ)
import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count, desc } from 'drizzle-orm';
import { db, properties } from '../db/index.js';
import { getUser, readJson, parse } from '../lib/http.js';
import { faqAnswer } from '../lib/faq.js';
import { systemPrompt } from '../lib/assistantKnowledge.js';
import { countOpenDeals, limitsFor } from '../lib/dealLogic.js';
import { actionDeals } from '../lib/dashboardData.js';
import { firstName } from '../lib/userStats.js';
import { normalize } from '../lib/faq.js';
import { JEDDAH_DISTRICTS, PROPERTY_TYPES } from '../lib/constants.js';

export const assistantRoutes = new Hono();

const bodySchema = z.object({
  message: z.string().trim().min(1, 'اكتب سؤالك').max(500),
  lang: z.enum(['ar', 'en']).default('ar'),
  page: z.string().max(120).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1000) })).max(30).optional(),
});

async function userContext(u) {
  if (!u) return null;
  const lim = limitsFor(u);
  const [{ n: activeListings }] = await db.select({ n: count() }).from(properties).where(and(eq(properties.ownerId, u.id), eq(properties.status, 'active')));
  return {
    firstName: firstName(u.name),
    activeListings, maxListings: lim.activeListings,
    activeDeals: await countOpenDeals(u.id), maxDeals: lim.activeDeals,
    actions: (await actionDeals(u.id)).length,
  };
}

// يبحث في العقارات الفعلية حسب كلام المستخدم (حي / نوع عقار / بيع أو إيجار) ليجيب المساعد بأمثلة حقيقية
const TYPE_WORDS = { villa: ['فيلا', 'فلل', 'villa'], apartment: ['شقه', 'شقق', 'apartment', 'flat'], building: ['عماره', 'عمائر', 'عماير', 'building'], floor: ['دور', 'floor'], land: ['ارض', 'اراضي', 'land'], shop: ['محل', 'محلات', 'shop'], office: ['مكتب', 'مكاتب', 'office'] };
async function listingsContext(message, history) {
  const text = ` ${normalize([...(history ?? []).filter((h) => h.role === 'user').slice(-2).map((h) => h.text), message].join(' '))} `;
  const district = JEDDAH_DISTRICTS.filter((d) => text.includes(normalize(d.ar)) || text.includes(` ${d.en.toLowerCase()} `)).sort((a, b) => b.ar.length - a.ar.length)[0];
  const type = Object.entries(TYPE_WORDS).find(([, ws]) => ws.some((w) => text.includes(` ${w} `) || text.includes(` ${w}`)))?.[0];
  const listingType = /ايجار|اجار|rent/.test(text) ? 'rent' : /استثمار|استثمر|invest/.test(text) ? 'invest' : /بيع|شراء|اشتري|ابيع|buy|sale/.test(text) ? 'sale' : null;
  if (!district && !type && !listingType) return null;
  const conds = [eq(properties.status, 'active')];
  if (district) conds.push(eq(properties.district, district.id));
  if (type) conds.push(eq(properties.propertyType, type));
  if (listingType) conds.push(eq(properties.listingType, listingType));
  const rows = await db.select().from(properties).where(and(...conds)).orderBy(desc(properties.createdAt)).limit(5);
  const total = (await db.select({ n: count() }).from(properties).where(and(...conds)))[0].n;
  const names = { sale: 'بيع', rent: 'إيجار', invest: 'استثمار' };
  return {
    total,
    items: rows.map((r) => ({
      title: r.title, district: JEDDAH_DISTRICTS.find((d) => d.id === r.district)?.ar ?? r.district,
      type: PROPERTY_TYPES.find((t) => t.id === r.propertyType)?.ar ?? r.propertyType,
      op: names[r.listingType], price: r.price, area: r.areaSqm, link: `/properties/${r.id}`,
    })),
  };
}

async function askGemini({ message, lang, page, history, ctx, listings }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  // Gemini يشترط أن تبدأ المحادثة برسالة من المستخدم
  const turns = (history ?? []).slice(-8).map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  turns.push({ role: 'user', parts: [{ text: message }] });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(lang, { page, user: ctx, listings }) }] },
      contents: turns,
      generationConfig: { temperature: 0.5, maxOutputTokens: 700, thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let msg = body.slice(0, 200);
    try { msg = JSON.parse(body)?.error?.message ?? msg; } catch {}
    throw new Error(`gemini status ${res.status}: ${msg}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('gemini empty reply');
  return text;
}

assistantRoutes.post('/', async (c) => {
  const body = parse(bodySchema, await readJson(c));
  if (process.env.GEMINI_API_KEY) {
    try {
      const ctx = await userContext(await getUser(c));
      const listings = await listingsContext(body.message, body.history).catch(() => null);
      const reply = await askGemini({ ...body, ctx, listings });
      return c.json({ reply, source: 'gemini' });
    } catch (e) {
      // لا نطبع المفتاح أبداً؛ نكتفي بنوع الخطأ
      console.warn('المساعد: تعذّر Gemini، نستخدم الإجابات الجاهزة —', e?.name === 'TimeoutError' ? 'timeout' : e?.message);
    }
  }
  // بدون Gemini: إذا كان السؤال عن عقارات نعرض نتائج حقيقية من قاعدة البيانات
  const found = await listingsContext(body.message, body.history).catch(() => null);
  if (found?.items.length) {
    const ar = body.lang !== 'en';
    const lines = found.items.map((x) => `• ${x.title} — ${x.district} — ${x.price.toLocaleString('en-US')} ${ar ? 'ريال' : 'SAR'}\n  ${x.link}`);
    const head = ar ? `لقيت لك ${found.total} عقار مطابق، هذي أحدث ${found.items.length}:` : `Found ${found.total} matching properties, newest ${found.items.length}:`;
    return c.json({ reply: `${head}\n${lines.join('\n')}`, source: 'search' });
  }
  return c.json({ reply: faqAnswer(body.message, body.lang), source: 'faq' });
});
