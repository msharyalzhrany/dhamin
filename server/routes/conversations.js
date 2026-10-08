// المحادثات والرسائل بين المهتم وصاحب العقار (الواجهة تستعلم عن الرسائل كل ~3 ثوانٍ بالمعامل after)
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, or, ne, gt, isNull, desc, asc, count, inArray } from 'drizzle-orm';
import { db, user, properties, conversations, messages, deals } from '../db/index.js';
import { requireAuth, readJson, parse, ApiError } from '../lib/http.js';
import { OPEN_STATUSES, isRevealed, mediaSummary, profilesFor, firstName } from '../lib/dealLogic.js';

export const conversationsRoutes = new Hono();
conversationsRoutes.use('*', requireAuth);

// أحدث صفقة لكل محادثة (نفضّل الجارية، وإلا الأحدث) → Map(convId → deal)
async function dealsByConversation(convIds) {
  const map = new Map();
  if (!convIds.length) return map;
  const rows = await db.select().from(deals).where(inArray(deals.conversationId, convIds)).orderBy(asc(deals.createdAt));
  for (const d of rows) {
    const cur = map.get(d.conversationId);
    // الصفقات مرتبة من الأقدم للأحدث؛ الجارية تتغلب على غير الجارية، وإلا الأحدث يغلب
    if (!cur || OPEN_STATUSES.includes(d.status) || !OPEN_STATUSES.includes(cur.status)) map.set(d.conversationId, d);
  }
  return map;
}

// يبني بيانات العرض المشتركة لمجموعة محادثات
async function describe(convs, meId) {
  const propIds = [...new Set(convs.map((c) => c.propertyId))];
  const otherIds = [...new Set(convs.map((c) => (c.ownerId === meId ? c.initiatorId : c.ownerId)))];
  const [props, media, users, profs, dealMap] = await Promise.all([
    propIds.length ? db.select().from(properties).where(inArray(properties.id, propIds)) : [],
    mediaSummary(propIds),
    otherIds.length ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, otherIds)) : [],
    profilesFor(otherIds),
    dealsByConversation(convs.map((c) => c.id)),
  ]);
  const propMap = new Map(props.map((p) => [p.id, p]));
  const userMap = new Map(users.map((x) => [x.id, x]));

  // الاسم الكامل يظهر فقط بعد أن تصل صفقة المحادثة لمرحلة "تم الاتفاق" فما بعد
  const revealedConvs = new Set();
  if (convs.length) {
    const rows = await db.select({ cid: deals.conversationId, status: deals.status }).from(deals).where(inArray(deals.conversationId, convs.map((c) => c.id)));
    for (const r of rows) if (isRevealed(r.status)) revealedConvs.add(r.cid);
  }

  return (conv) => {
    const p = propMap.get(conv.propertyId);
    const otherId = conv.ownerId === meId ? conv.initiatorId : conv.ownerId;
    const o = userMap.get(otherId);
    const d = dealMap.get(conv.id);
    return {
      property: { id: p.id, title: p.title, cover: media.get(p.id)?.cover ?? null, listingType: p.listingType, price: p.price, district: p.district, propertyType: p.propertyType },
      other: { id: otherId, name: revealedConvs.has(conv.id) ? o?.name : firstName(o?.name), avatarUrl: profs.get(otherId)?.avatarUrl || null },
      deal: d ? { id: d.id, status: d.status } : null,
    };
  };
}

// ---- فتح محادثة (أو الرجوع لمحادثة موجودة) ----
conversationsRoutes.post('/', async (c) => {
  const u = c.get('user');
  const { propertyId } = parse(z.object({ propertyId: z.string().min(1) }), await readJson(c));
  const [p] = await db.select().from(properties).where(eq(properties.id, propertyId));
  if (!p || p.status !== 'active') throw new ApiError(404, 'NOT_FOUND', 'العقار غير موجود أو غير متاح');
  if (p.ownerId === u.id) throw new ApiError(400, 'OWN_PROPERTY', 'هذا عقارك، لا يمكنك مراسلة نفسك');

  const [existing] = await db.select().from(conversations).where(and(eq(conversations.propertyId, p.id), eq(conversations.initiatorId, u.id)));
  if (existing) return c.json({ id: existing.id }, 200);
  const [created] = await db.insert(conversations).values({ propertyId: p.id, ownerId: p.ownerId, initiatorId: u.id }).returning();
  return c.json({ id: created.id }, 201);
});

// ---- قائمة محادثاتي ----
conversationsRoutes.get('/', async (c) => {
  const u = c.get('user');
  const convs = await db.select().from(conversations).where(or(eq(conversations.ownerId, u.id), eq(conversations.initiatorId, u.id)));
  const ids = convs.map((x) => x.id);
  const describeConv = await describe(convs, u.id);

  const unreadRows = ids.length
    ? await db
        .select({ cid: messages.conversationId, n: count() })
        .from(messages)
        .where(and(inArray(messages.conversationId, ids), ne(messages.senderId, u.id), isNull(messages.readAt)))
        .groupBy(messages.conversationId)
    : [];
  const unread = new Map(unreadRows.map((r) => [r.cid, r.n]));

  const items = await Promise.all(
    convs.map(async (conv) => {
      const [last] = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(desc(messages.createdAt)).limit(1);
      return {
        id: conv.id,
        ...describeConv(conv),
        lastMessage: last ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId, kind: last.kind } : null,
        unread: unread.get(conv.id) ?? 0,
        updatedAt: last?.createdAt ?? conv.createdAt,
      };
    }),
  );
  items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return c.json({ items });
});

async function myConversation(id, userId) {
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) throw new ApiError(404, 'NOT_FOUND', 'المحادثة غير موجودة');
  if (conv.ownerId !== userId && conv.initiatorId !== userId) throw new ApiError(403, 'FORBIDDEN', 'هذه المحادثة ليست لك');
  return conv;
}

// ---- تفاصيل محادثة ----
conversationsRoutes.get('/:id', async (c) => {
  const u = c.get('user');
  const conv = await myConversation(c.req.param('id'), u.id);
  const describeConv = await describe([conv], u.id);
  return c.json({ id: conv.id, ...describeConv(conv), meId: u.id });
});

// ---- الرسائل (after = وقت ISO أو ملّي ثانية؛ نرجع الأحدث منه فقط) ----
function parseAfter(v) {
  if (!v) return null;
  const t = /^\d+$/.test(v) ? Number(v) : Date.parse(v);
  if (Number.isNaN(t)) throw new ApiError(400, 'VALIDATION', 'after: وقت غير صالح');
  return new Date(t);
}

conversationsRoutes.get('/:id/messages', async (c) => {
  const u = c.get('user');
  const conv = await myConversation(c.req.param('id'), u.id);
  const after = parseAfter(c.req.query('after'));

  const conds = [eq(messages.conversationId, conv.id)];
  if (after) conds.push(gt(messages.createdAt, after));
  const rows = await db.select().from(messages).where(and(...conds)).orderBy(asc(messages.createdAt), asc(messages.id));

  // قراءة رسائل الطرف الآخر = تعليمها مقروءة
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.conversationId, conv.id), ne(messages.senderId, u.id), isNull(messages.readAt)));

  return c.json({ items: rows.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, kind: m.kind, createdAt: m.createdAt })) });
});

conversationsRoutes.post('/:id/messages', async (c) => {
  const u = c.get('user');
  const conv = await myConversation(c.req.param('id'), u.id);
  const { body } = parse(z.object({ body: z.string().trim().min(1, 'الرسالة فارغة').max(1000, 'الرسالة طويلة (الحد 1000 حرف)') }), await readJson(c));
  const [m] = await db.insert(messages).values({ conversationId: conv.id, senderId: u.id, body }).returning();
  return c.json({ id: m.id, senderId: m.senderId, body: m.body, kind: m.kind, createdAt: m.createdAt }, 201);
});
