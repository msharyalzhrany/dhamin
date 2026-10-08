// إحصاءات عامة للصفحة الرئيسية: GET /api/stats
import { Hono } from 'hono';
import { eq, count, countDistinct } from 'drizzle-orm';
import { db, user, properties, deals } from '../db/index.js';

export const statsRoutes = new Hono();

statsRoutes.get('/', async (c) => {
  const [{ n: activeListings, d: districts }] = await db
    .select({ n: count(), d: countDistinct(properties.district) })
    .from(properties)
    .where(eq(properties.status, 'active'));
  const [{ n: completedDeals }] = await db.select({ n: count() }).from(deals).where(eq(deals.status, 'completed'));
  const [{ n: members }] = await db.select({ n: count() }).from(user);
  return c.json({ activeListings, completedDeals, members, districts });
});
