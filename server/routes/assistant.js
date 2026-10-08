// المساعد: POST /api/assistant — Gemini إن توفر المفتاح، وإلا إجابات جاهزة (FAQ)
import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, count } from 'drizzle-orm';
import { db, properties } from '../db/index.js';
import { getUser, readJson, parse } from '../lib/http.js';
import { faqAnswer } from '../lib/faq.js';
import { systemPrompt } from '../lib/assistantKnowledge.js';
import { countOpenDeals, limitsFor } from '../lib/dealLogic.js';
import { actionDeals } from '../lib/dashboardData.js';
import { firstName } from '../lib/userStats.js';

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

async function askGemini({ message, lang, page, history, ctx }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  // Gemini يشترط أن تبدأ المحادثة برسالة من المستخدم
  const turns = (history ?? []).slice(-8).map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  turns.push({ role: 'user', parts: [{ text: message }] });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(lang, { page, user: ctx }) }] },
      contents: turns,
      generationConfig: { temperature: 0.4, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`gemini status ${res.status}`);
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
      const reply = await askGemini({ ...body, ctx });
      return c.json({ reply, source: 'gemini' });
    } catch (e) {
      // لا نطبع المفتاح أبداً؛ نكتفي بنوع الخطأ
      console.warn('المساعد: تعذّر Gemini، نستخدم الإجابات الجاهزة —', e?.name === 'TimeoutError' ? 'timeout' : e?.message);
    }
  }
  return c.json({ reply: faqAnswer(body.message, body.lang), source: 'faq' });
});
