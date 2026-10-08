// الملف العام للمستخدم: GET /api/users/:id (بدون جوال ولا بريد ولا اسم العائلة)
import { Hono } from 'hono';
import { eq, and, desc, count } from 'drizzle-orm';
import { db, user, profiles, properties, reviews } from '../db/index.js';
import { ApiError } from '../lib/http.js';
import { ratingOf, completedDealsCount, firstName } from '../lib/userStats.js';

export const usersRoutes = new Hono();

usersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [u] = await db.select().from(user).where(eq(user.id, id));
  if (!u) throw new ApiError(404, 'NOT_FOUND', 'المستخدم غير موجود');
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, id));
  const rating = await ratingOf(id);
  const [{ n: activeListings }] = await db
    .select({ n: count() })
    .from(properties)
    .where(and(eq(properties.ownerId, id), eq(properties.status, 'active')));

  const rows = await db
    .select({ rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, reviewerName: user.name })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.reviewerId))
    .where(eq(reviews.revieweeId, id))
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  return c.json({
    id: u.id,
    firstName: firstName(u.name),
    avatarUrl: p?.avatarUrl || null,
    bio: p?.bio || null,
    memberSince: u.createdAt,
    ...rating,
    verified: { phone: !!p?.phoneVerified, address: !!p?.nationalAddressVerified },
    completedDeals: await completedDealsCount(id),
    activeListings,
    reviews: rows.map((r) => ({ rating: r.rating, comment: r.comment, createdAt: r.createdAt, reviewerFirstName: firstName(r.reviewerName) })),
  });
});
