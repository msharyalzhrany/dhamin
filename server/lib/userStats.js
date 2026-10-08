// دوال مساعدة لإحصاءات المستخدمين (التقييم، الصفقات المكتملة) — تُستخدم في أكثر من مسار
import { eq, and, or, count, avg, inArray } from 'drizzle-orm';
import { db, reviews, deals, profiles } from '../db/index.js';

const round1 = (n) => (n == null ? 0 : Math.round(Number(n) * 10) / 10);

// متوسط التقييم وعدده لقائمة مستخدمين → Map(userId → {ratingAvg, ratingCount})
export async function ratingsFor(userIds) {
  const map = new Map(userIds.map((id) => [id, { ratingAvg: 0, ratingCount: 0 }]));
  if (!userIds.length) return map;
  const rows = await db
    .select({ id: reviews.revieweeId, a: avg(reviews.rating), n: count() })
    .from(reviews)
    .where(inArray(reviews.revieweeId, userIds))
    .groupBy(reviews.revieweeId);
  for (const r of rows) map.set(r.id, { ratingAvg: round1(r.a), ratingCount: r.n });
  return map;
}

export async function ratingOf(userId) {
  return (await ratingsFor([userId])).get(userId);
}

export async function completedDealsCount(userId) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(deals)
    .where(and(eq(deals.status, 'completed'), or(eq(deals.ownerId, userId), eq(deals.counterpartyId, userId))));
  return n;
}

// الملفات الشخصية لقائمة مستخدمين → Map(userId → profile)
export async function profilesFor(userIds) {
  const map = new Map();
  if (!userIds.length) return map;
  const rows = await db.select().from(profiles).where(inArray(profiles.userId, userIds));
  for (const p of rows) map.set(p.userId, p);
  return map;
}

export const firstName = (name) => (name ?? '').trim().split(/\s+/)[0] || null;
