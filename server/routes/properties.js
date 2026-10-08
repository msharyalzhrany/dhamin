import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, gte, lte, like, or, count, desc, asc, inArray, getTableColumns } from 'drizzle-orm';
import { db, user, properties, investments, favorites, propertyMedia, propertyViews, profiles } from '../db/index.js';
import { requireAuth, getUser, readJson, parse, ApiError } from '../lib/http.js';
import { JEDDAH_DISTRICTS, LISTING_TYPES, PROPERTY_TYPES, USAGES, RENT_PERIODS, AMENITIES, LIMITS, ids } from '../lib/constants.js';
import { mediaSummary } from '../lib/dealLogic.js';
import { ratingOf } from '../lib/userStats.js';

export const propertiesRoutes = new Hono();

const enumOf = (list) => z.enum(ids(list), { error: 'قيمة غير مسموحة' });

// ------------------------------------------------------------------
// أدوات مساعدة
// ------------------------------------------------------------------
const publicFields = {
  ...getTableColumns(properties),
  ownerName: user.name,
  targetAmount: investments.targetAmount,
  raisedAmount: investments.raisedAmount,
  minInvestment: investments.minInvestment,
  durationMonths: investments.durationMonths,
  expectedReturnPct: investments.expectedReturnPct,
};

// نعرض الاسم الأول فقط للعامة (خصوصية)
function shape(row) {
  const { ownerName, targetAmount, raisedAmount, minInvestment, durationMonths, expectedReturnPct, ...p } = row;
  const out = { ...p, ownerFirstName: ownerName?.trim().split(/\s+/)[0] ?? null };
  if (p.listingType === 'invest') {
    out.investment = {
      targetAmount,
      raisedAmount,
      progressPct: targetAmount ? Math.min(100, Math.round((raisedAmount / targetAmount) * 100)) : 0,
      minInvestment,
      durationMonths,
      expectedReturnPct,
    };
  }
  return out;
}

async function countActiveListings(userId) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(properties)
    .where(and(eq(properties.ownerId, userId), eq(properties.status, 'active')));
  return n;
}

function limitFor(u) {
  return (LIMITS[u.accountType] ?? LIMITS.individual).activeListings;
}

// يضيف لكل عقار: cover و mediaCount و amenities، وisFavorite (إذا المستخدم مسجّل)، وviewsCount (لعقاراتي)
async function decorate(items, viewerId, { views = false } = {}) {
  const idList = items.map((i) => i.id);
  if (!idList.length) return items;
  const media = await mediaSummary(idList);
  let favSet = new Set();
  if (viewerId) {
    const f = await db.select({ id: favorites.propertyId }).from(favorites).where(and(eq(favorites.userId, viewerId), inArray(favorites.propertyId, idList)));
    favSet = new Set(f.map((x) => x.id));
  }
  let viewMap = new Map();
  if (views) {
    const v = await db.select({ id: propertyViews.propertyId, n: count() }).from(propertyViews).where(inArray(propertyViews.propertyId, idList)).groupBy(propertyViews.propertyId);
    viewMap = new Map(v.map((x) => [x.id, x.n]));
  }
  return items.map((i) => ({
    ...i,
    cover: media.get(i.id)?.cover ?? null,
    mediaCount: media.get(i.id)?.count ?? 0,
    ...(viewerId ? { isFavorite: favSet.has(i.id) } : {}),
    ...(views ? { viewsCount: viewMap.get(i.id) ?? 0 } : {}),
  }));
}

// صورة مرفوعة عبر /api/uploads (مسار محلي فقط، ممنوع الخروج من المجلد)
const imageUrl = z
  .string()
  .max(300)
  .refine((v) => v.startsWith('/uploads/') && !v.includes('..'), 'رابط الصورة غير صالح');
const imagesField = z.array(imageUrl).max(10, 'الحد الأقصى 10 صور');
const amenitiesField = z.array(z.enum(ids(AMENITIES), { error: 'مرفق غير معروف' })).max(14);

async function saveImages(propertyId, urls) {
  await db.delete(propertyMedia).where(eq(propertyMedia.propertyId, propertyId));
  if (urls.length) await db.insert(propertyMedia).values(urls.map((url, i) => ({ propertyId, url, sortOrder: i })));
}

// ------------------------------------------------------------------
// GET /api/properties  — عام (بدون تسجيل دخول) مع الفلاتر
// ------------------------------------------------------------------
const listQuery = z.object({
  listingType: enumOf(LISTING_TYPES).optional(),
  propertyType: enumOf(PROPERTY_TYPES).optional(),
  usage: enumOf(USAGES).optional(),
  district: enumOf(JEDDAH_DISTRICTS).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  maxMinInvestment: z.coerce.number().int().min(0).optional(), // ميزانية المستثمر
  bedrooms: z.coerce.number().int().min(0).optional(),
  minArea: z.coerce.number().int().min(0).optional(),
  maxArea: z.coerce.number().int().min(0).optional(),
  amenity: z.enum(ids(AMENITIES), { error: 'مرفق غير معروف' }).optional(),
  q: z.string().trim().max(60).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

propertiesRoutes.get('/', async (c) => {
  const q = parse(listQuery, c.req.query());

  const conds = [eq(properties.status, 'active')];
  if (q.listingType) conds.push(eq(properties.listingType, q.listingType));
  if (q.propertyType) conds.push(eq(properties.propertyType, q.propertyType));
  if (q.usage) conds.push(eq(properties.usage, q.usage));
  if (q.district) conds.push(eq(properties.district, q.district));
  if (q.minPrice !== undefined) conds.push(gte(properties.price, q.minPrice));
  if (q.maxPrice !== undefined) conds.push(lte(properties.price, q.maxPrice));
  if (q.bedrooms !== undefined) conds.push(gte(properties.bedrooms, q.bedrooms));
  if (q.minArea !== undefined) conds.push(gte(properties.areaSqm, q.minArea));
  if (q.maxArea !== undefined) conds.push(lte(properties.areaSqm, q.maxArea));
  if (q.amenity) conds.push(like(properties.amenities, `%"${q.amenity}"%`)); // المصفوفة مخزنة كنص JSON
  if (q.maxMinInvestment !== undefined) conds.push(lte(investments.minInvestment, q.maxMinInvestment));
  if (q.q) conds.push(or(like(properties.title, `%${q.q}%`), like(properties.description, `%${q.q}%`)));

  const order = { newest: desc(properties.createdAt), price_asc: asc(properties.price), price_desc: desc(properties.price) }[q.sort];

  const base = db
    .select(publicFields)
    .from(properties)
    .innerJoin(user, eq(user.id, properties.ownerId))
    .leftJoin(investments, eq(investments.propertyId, properties.id))
    .where(and(...conds));

  const rows = await base.orderBy(order).limit(q.pageSize).offset((q.page - 1) * q.pageSize);

  const [{ n: total }] = await db
    .select({ n: count() })
    .from(properties)
    .leftJoin(investments, eq(investments.propertyId, properties.id))
    .where(and(...conds));

  const viewer = await getUser(c);
  const items = await decorate(rows.map(shape), viewer?.id);
  return c.json({ items, page: q.page, pageSize: q.pageSize, total });
});

// ------------------------------------------------------------------
// GET /api/properties/mine — عقاراتي (كل الحالات)
// (لازم يكون قبل /:id)
// ------------------------------------------------------------------
propertiesRoutes.get('/mine', requireAuth, async (c) => {
  const u = c.get('user');
  const rows = await db
    .select(publicFields)
    .from(properties)
    .innerJoin(user, eq(user.id, properties.ownerId))
    .leftJoin(investments, eq(investments.propertyId, properties.id))
    .where(eq(properties.ownerId, u.id))
    .orderBy(desc(properties.createdAt));
  return c.json({ items: await decorate(rows.map(shape), u.id, { views: true }) });
});

// المفضلة
propertiesRoutes.get('/favorites', requireAuth, async (c) => {
  const u = c.get('user');
  const rows = await db
    .select(publicFields)
    .from(favorites)
    .innerJoin(properties, eq(properties.id, favorites.propertyId))
    .innerJoin(user, eq(user.id, properties.ownerId))
    .leftJoin(investments, eq(investments.propertyId, properties.id))
    .where(eq(favorites.userId, u.id))
    .orderBy(desc(favorites.createdAt));
  return c.json({ items: await decorate(rows.map(shape), u.id) });
});

// ------------------------------------------------------------------
// GET /api/properties/:id — عام
// ------------------------------------------------------------------
propertiesRoutes.get('/:id', async (c) => {
  const [row] = await db
    .select(publicFields)
    .from(properties)
    .innerJoin(user, eq(user.id, properties.ownerId))
    .leftJoin(investments, eq(investments.propertyId, properties.id))
    .where(eq(properties.id, c.req.param('id')));
  if (!row || row.status === 'archived') throw new ApiError(404, 'NOT_FOUND', 'العقار غير موجود');

  const viewer = await getUser(c);
  // نسجّل مشاهدة (إلا إذا كان الزائر هو صاحب العقار)
  if (viewer?.id !== row.ownerId) await db.insert(propertyViews).values({ propertyId: row.id, viewerId: viewer?.id ?? null });

  const [item] = await decorate([shape(row)], viewer?.id, { views: true });
  const media = await db.select({ url: propertyMedia.url }).from(propertyMedia).where(eq(propertyMedia.propertyId, row.id)).orderBy(asc(propertyMedia.sortOrder));

  // بيانات المالك العامة: الاسم الأول فقط، بدون بريد أو جوال
  const [ownerUser] = await db.select({ createdAt: user.createdAt }).from(user).where(eq(user.id, row.ownerId));
  const [prof] = await db.select().from(profiles).where(eq(profiles.userId, row.ownerId));
  const rating = await ratingOf(row.ownerId);
  const owner = {
    id: row.ownerId,
    firstName: item.ownerFirstName,
    avatarUrl: prof?.avatarUrl || null,
    ...rating,
    memberSince: ownerUser.createdAt,
    verified: { phone: !!prof?.phoneVerified, address: !!prof?.nationalAddressVerified },
  };
  return c.json({ ...item, media: media.map((m) => m.url), owner });
});

// ------------------------------------------------------------------
// POST /api/properties — إضافة عقار (يتطلب تسجيل دخول)
// ------------------------------------------------------------------
const createSchema = z
  .object({
    listingType: enumOf(LISTING_TYPES),
    propertyType: enumOf(PROPERTY_TYPES),
    usage: enumOf(USAGES),
    title: z.string().trim().min(5, 'العنوان قصير').max(120),
    description: z.string().trim().max(2000).default(''),
    price: z.number().int().positive('السعر لازم يكون أكبر من صفر'),
    rentPeriod: enumOf(RENT_PERIODS).optional(),
    areaSqm: z.number().int().positive().max(10_000_000).optional(),
    bedrooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(50).optional(),
    district: enumOf(JEDDAH_DISTRICTS),
    addressNote: z.string().trim().max(200).optional(),
    images: imagesField.default([]),
    amenities: amenitiesField.default([]),
    // حقول الاستثمار (تُطلب فقط إذا النوع invest)
    investment: z
      .object({
        targetAmount: z.number().int().positive(),
        minInvestment: z.number().int().positive(),
        durationMonths: z.number().int().min(1).max(240),
        expectedReturnPct: z.number().min(0).max(100),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.listingType === 'rent' && !v.rentPeriod) ctx.addIssue({ code: 'custom', path: ['rentPeriod'], message: 'حدد فترة الإيجار' });
    if (v.listingType === 'invest' && !v.investment) ctx.addIssue({ code: 'custom', path: ['investment'], message: 'بيانات الفرصة الاستثمارية مطلوبة' });
    if (v.investment && v.investment.minInvestment > v.investment.targetAmount)
      ctx.addIssue({ code: 'custom', path: ['investment', 'minInvestment'], message: 'الحد الأدنى أكبر من المبلغ المطلوب' });
  });

propertiesRoutes.post('/', requireAuth, async (c) => {
  const u = c.get('user');
  if (u.accountType !== 'individual') throw new ApiError(403, 'NOT_SUPPORTED_YET', 'هذا النوع من الحسابات سيتوفر قريباً');

  const body = parse(createSchema, await readJson(c));

  const limit = limitFor(u);
  if ((await countActiveListings(u.id)) >= limit)
    throw new ApiError(409, 'LIMIT_REACHED', `وصلت للحد الأقصى (${limit} عقارات نشطة). أغلق إعلاناً قبل إضافة جديد.`);

  const { investment, images, ...p } = body;
  const [created] = await db
    .insert(properties)
    .values({ ...p, amenities: [...new Set(p.amenities)], ownerId: u.id, rentPeriod: p.listingType === 'rent' ? p.rentPeriod : null })
    .returning();
  if (images.length) await saveImages(created.id, images);

  if (p.listingType === 'invest') await db.insert(investments).values({ propertyId: created.id, ...investment });

  return c.json({ id: created.id }, 201);
});

// ------------------------------------------------------------------
// PATCH /api/properties/:id — تعديل (صاحب العقار فقط)
// ------------------------------------------------------------------
const patchSchema = z.object({
  title: z.string().trim().min(5).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.number().int().positive().optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  areaSqm: z.number().int().positive().max(10_000_000).optional(),
  district: enumOf(JEDDAH_DISTRICTS).optional(),
  addressNote: z.string().trim().max(200).optional(),
  amenities: amenitiesField.optional(),
  images: imagesField.optional(), // يستبدل مجموعة الصور كاملة
  status: z.enum(['active', 'closed', 'archived']).optional(),
});

propertiesRoutes.patch('/:id', requireAuth, async (c) => {
  const u = c.get('user');
  const id = c.req.param('id');
  const body = parse(patchSchema, await readJson(c));

  const [p] = await db.select().from(properties).where(eq(properties.id, id));
  if (!p) throw new ApiError(404, 'NOT_FOUND', 'العقار غير موجود');
  if (p.ownerId !== u.id) throw new ApiError(403, 'FORBIDDEN', 'هذا العقار ليس لك');

  if (body.status === 'active' && p.status !== 'active') {
    const limit = limitFor(u);
    if ((await countActiveListings(u.id)) >= limit) throw new ApiError(409, 'LIMIT_REACHED', `وصلت للحد الأقصى (${limit} عقارات نشطة).`);
  }

  const { images, ...fields } = body;
  if (fields.amenities) fields.amenities = [...new Set(fields.amenities)];
  if (Object.keys(fields).length) await db.update(properties).set(fields).where(eq(properties.id, id));
  if (images) await saveImages(id, images);
  return c.json({ ok: true });
});

// ------------------------------------------------------------------
// المفضلة: POST/DELETE /api/properties/:id/favorite
// ------------------------------------------------------------------
propertiesRoutes.post('/:id/favorite', requireAuth, async (c) => {
  const u = c.get('user');
  const id = c.req.param('id');
  const [p] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, id));
  if (!p) throw new ApiError(404, 'NOT_FOUND', 'العقار غير موجود');
  await db.insert(favorites).values({ userId: u.id, propertyId: id }).onConflictDoNothing();
  return c.json({ ok: true }, 201);
});

propertiesRoutes.delete('/:id/favorite', requireAuth, async (c) => {
  const u = c.get('user');
  await db.delete(favorites).where(and(eq(favorites.userId, u.id), eq(favorites.propertyId, c.req.param('id'))));
  return c.json({ ok: true });
});
