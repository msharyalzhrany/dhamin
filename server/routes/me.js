import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, count } from 'drizzle-orm';
import { db, user, profiles, properties, favorites } from '../db/index.js';
import { requireAuth, readJson, parse } from '../lib/http.js';
import { LIMITS } from '../lib/constants.js';
import { countOpenDeals } from '../lib/dealLogic.js';
import { ratingOf, completedDealsCount } from '../lib/userStats.js';

export const me = new Hono();
me.use('*', requireAuth);

async function getOrCreateProfile(userId) {
  let [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!p) {
    await db.insert(profiles).values({ userId });
    [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  }
  return p;
}

// جوال سعودي: 05xxxxxxxx أو +9665xxxxxxxx → نخزّنه بصيغة +9665xxxxxxxx
const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?966|0)?5\d{8}$/, 'رقم جوال سعودي غير صحيح')
  .transform((v) => '+966' + v.replace(/^(?:\+?966|0)/, ''));

// العنوان الوطني المختصر: 4 حروف + 4 أرقام (مثل RRRD2929)
const nationalAddressSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{4}\d{4}$/, 'العنوان الوطني المختصر = 4 حروف + 4 أرقام')
  .transform((v) => v.toUpperCase());

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: phoneSchema.optional(),
  nationalAddress: nationalAddressSchema.optional(),
  bio: z.string().trim().max(300).optional(),
  // '' = حذف الصورة، وإلا لازم تكون صورة مرفوعة عبر /api/uploads
  avatarUrl: z.string().trim().max(300).refine((v) => v === '' || (v.startsWith('/uploads/') && !v.includes('..')), 'رابط الصورة غير صالح').optional(),
});

me.get('/', async (c) => {
  const u = c.get('user');
  const profile = await getOrCreateProfile(u.id);
  const limits = LIMITS[u.accountType] ?? LIMITS.individual;

  const [{ n: activeListings }] = await db
    .select({ n: count() })
    .from(properties)
    .where(and(eq(properties.ownerId, u.id), eq(properties.status, 'active')));

  // الصفقات النشطة: أي صفقة غير نهائية أنا طرف فيها (مالك أو الطرف الآخر)
  const activeDeals = await countOpenDeals(u.id);
  const rating = await ratingOf(u.id);
  const [{ n: favs }] = await db.select({ n: count() }).from(favorites).where(eq(favorites.userId, u.id));

  const first = u.name.trim().split(/\s+/)[0];
  return c.json({
    user: { id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, accountType: u.accountType, phone: u.phone },
    profile: { ...profile, ...rating },
    stats: { completedDeals: await completedDealsCount(u.id), favorites: favs },
    welcome: { ar: `مرحباً ${first}`, en: `Welcome, ${first}` },
    limits,
    usage: { activeListings, activeDeals },
  });
});

me.patch('/', async (c) => {
  const u = c.get('user');
  const body = parse(patchSchema, await readJson(c));
  await getOrCreateProfile(u.id);

  const userUpdates = {};
  if (body.name) userUpdates.name = body.name;
  if (body.phone) userUpdates.phone = body.phone;
  if (Object.keys(userUpdates).length) await db.update(user).set(userUpdates).where(eq(user.id, u.id));

  const profileUpdates = {};
  if (body.nationalAddress) Object.assign(profileUpdates, { nationalAddress: body.nationalAddress, nationalAddressVerified: false });
  if (body.phone) profileUpdates.phoneVerified = false; // تغيير الجوال يلغي التوثيق
  if (body.bio !== undefined) profileUpdates.bio = body.bio;
  if (body.avatarUrl !== undefined) profileUpdates.avatarUrl = body.avatarUrl || null;
  if (Object.keys(profileUpdates).length) await db.update(profiles).set(profileUpdates).where(eq(profiles.userId, u.id));

  return c.json({ ok: true });
});
