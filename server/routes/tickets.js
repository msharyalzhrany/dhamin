import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db, tickets } from '../db/index.js';
import { requireAuth, readJson, parse, ApiError } from '../lib/http.js';
import { markDisputedByTicket } from '../lib/dealLogic.js';

export const ticketsRoutes = new Hono();
ticketsRoutes.use('*', requireAuth);

const createSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10, 'اشرح المشكلة بشكل أوضح').max(3000),
  dealId: z.string().optional(),
});

// فتح تذكرة دعم (مثلاً عند إشكالية في صفقة)
ticketsRoutes.post('/', async (c) => {
  const u = c.get('user');
  const body = parse(createSchema, await readJson(c));
  // إذا التذكرة مرتبطة بصفقة: لازم تكون صفقتي، وتتحول لـ "متنازع عليها" إن كانت في مرحلة التحويل/الاستلام
  if (body.dealId) await markDisputedByTicket(u, body.dealId);
  const [t] = await db.insert(tickets).values({ ...body, userId: u.id }).returning();
  return c.json({ id: t.id, status: t.status }, 201);
});

// تذاكري وحالتها (المستخدم يشوف الحالة فقط — المعالجة من لوحة المشرف لاحقاً)
ticketsRoutes.get('/', async (c) => {
  const u = c.get('user');
  const rows = await db.select().from(tickets).where(eq(tickets.userId, u.id)).orderBy(desc(tickets.createdAt));
  return c.json({ items: rows });
});

ticketsRoutes.get('/:id', async (c) => {
  const u = c.get('user');
  const [t] = await db.select().from(tickets).where(and(eq(tickets.id, c.req.param('id')), eq(tickets.userId, u.id)));
  if (!t) throw new ApiError(404, 'NOT_FOUND', 'التذكرة غير موجودة');
  return c.json(t);
});
