// لوحة الأدمن: GET /api/admin/overview  (للقراءة فقط)
// الدخول مسموح فقط للإيميلات الموجودة في متغير ADMIN_EMAILS (مفصولة بفاصلة)
// أو للحساب من نوع staff.
import { Hono } from 'hono';
import { desc, count, eq, or, inArray } from 'drizzle-orm';
import { db, user, properties, deals, conversations, messages, tickets } from '../db/index.js';
import { ApiError, requireAuth, readJson } from '../lib/http.js';

export const adminRoutes = new Hono();

adminRoutes.use('*', requireAuth, async (c, next) => {
  const u = c.get('user');
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(u.email.toLowerCase()) && u.accountType !== 'staff') throw new ApiError(403, 'FORBIDDEN', 'هذه الصفحة للمشرفين فقط');
  await next();
});

adminRoutes.get('/overview', async (c) => {
  const n = async (t) => (await db.select({ n: count() }).from(t))[0].n;
  const [users, props, dls, tks] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email, phone: user.phone, accountType: user.accountType, createdAt: user.createdAt }).from(user).orderBy(desc(user.createdAt)).limit(200),
    db.select({ id: properties.id, title: properties.title, listingType: properties.listingType, propertyType: properties.propertyType, district: properties.district, price: properties.price, status: properties.status, createdAt: properties.createdAt }).from(properties).orderBy(desc(properties.createdAt)).limit(200),
    db.select({ id: deals.id, kind: deals.kind, status: deals.status, agreedPrice: deals.agreedPrice, ownerId: deals.ownerId, counterpartyId: deals.counterpartyId, createdAt: deals.createdAt }).from(deals).orderBy(desc(deals.createdAt)).limit(200),
    db.select({ id: tickets.id, subject: tickets.subject, status: tickets.status, userId: tickets.userId, createdAt: tickets.createdAt }).from(tickets).orderBy(desc(tickets.createdAt)).limit(100),
  ]);
  return c.json({
    counts: { users: await n(user), properties: await n(properties), deals: await n(deals), conversations: await n(conversations), messages: await n(messages), tickets: await n(tickets) },
    users, properties: props, deals: dls, tickets: tks,
  });
});

// ---------------- تعديل وحذف ----------------
const ACCOUNT_TYPES = ['individual', 'company', 'staff'];
const PROP_STATUS = ['active', 'reserved', 'closed', 'archived'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

// يحذف الصفقات (ومعها العقود والتوقيعات والتقييمات) ويفك ارتباط التذاكر بها
async function removeDeals(tx, dealIds) {
  if (!dealIds.length) return;
  await tx.update(tickets).set({ dealId: null }).where(inArray(tickets.dealId, dealIds));
  await tx.delete(deals).where(inArray(deals.id, dealIds));
}

async function removeProperties(tx, propIds) {
  if (!propIds.length) return;
  const d = await tx.select({ id: deals.id }).from(deals).where(inArray(deals.propertyId, propIds));
  await removeDeals(tx, d.map((x) => x.id));
  await tx.delete(conversations).where(inArray(conversations.propertyId, propIds));
  await tx.delete(properties).where(inArray(properties.id, propIds));
}

adminRoutes.patch('/users/:id', async (c) => {
  const b = await readJson(c);
  const set = {};
  const name = str(b.name, 100);
  if (name) set.name = name;
  if (b.phone !== undefined) set.phone = str(b.phone, 30) || null;
  if (b.accountType !== undefined) {
    if (!ACCOUNT_TYPES.includes(b.accountType)) throw new ApiError(400, 'VALIDATION', 'نوع الحساب غير صحيح');
    set.accountType = b.accountType;
  }
  if (!Object.keys(set).length) throw new ApiError(400, 'VALIDATION', 'لا يوجد شيء للتعديل');
  await db.update(user).set(set).where(eq(user.id, c.req.param('id')));
  return c.json({ ok: true });
});

adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  if (id === c.get('user').id) throw new ApiError(400, 'VALIDATION', 'ما تقدر تحذف حسابك أنت');
  await db.transaction(async (tx) => {
    const own = (await tx.select({ id: properties.id }).from(properties).where(eq(properties.ownerId, id))).map((x) => x.id);
    const d = await tx.select({ id: deals.id }).from(deals).where(or(eq(deals.ownerId, id), eq(deals.counterpartyId, id), eq(deals.proposedBy, id), own.length ? inArray(deals.propertyId, own) : undefined));
    await removeDeals(tx, d.map((x) => x.id));
    await tx.delete(conversations).where(or(eq(conversations.ownerId, id), eq(conversations.initiatorId, id)));
    await removeProperties(tx, own);
    await tx.delete(user).where(eq(user.id, id));
  });
  return c.json({ ok: true });
});

adminRoutes.patch('/properties/:id', async (c) => {
  const b = await readJson(c);
  const set = {};
  const title = str(b.title, 200);
  if (title) set.title = title;
  if (b.price !== undefined) {
    const p = Number(b.price);
    if (!Number.isFinite(p) || p < 0) throw new ApiError(400, 'VALIDATION', 'السعر غير صحيح');
    set.price = Math.round(p);
  }
  if (b.status !== undefined) {
    if (!PROP_STATUS.includes(b.status)) throw new ApiError(400, 'VALIDATION', 'الحالة غير صحيحة');
    set.status = b.status;
  }
  if (!Object.keys(set).length) throw new ApiError(400, 'VALIDATION', 'لا يوجد شيء للتعديل');
  await db.update(properties).set(set).where(eq(properties.id, c.req.param('id')));
  return c.json({ ok: true });
});

adminRoutes.delete('/properties/:id', async (c) => {
  await db.transaction((tx) => removeProperties(tx, [c.req.param('id')]));
  return c.json({ ok: true });
});

adminRoutes.delete('/deals/:id', async (c) => {
  await db.transaction((tx) => removeDeals(tx, [c.req.param('id')]));
  return c.json({ ok: true });
});
