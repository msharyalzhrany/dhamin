// لوحة الأدمن: GET /api/admin/overview  (للقراءة فقط)
// الدخول مسموح فقط للإيميلات الموجودة في متغير ADMIN_EMAILS (مفصولة بفاصلة)
// أو للحساب من نوع staff.
import { Hono } from 'hono';
import { desc, count } from 'drizzle-orm';
import { db, user, properties, deals, conversations, messages, tickets } from '../db/index.js';
import { ApiError, requireAuth } from '../lib/http.js';

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
