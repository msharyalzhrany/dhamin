// لوحة التحكم: GET /api/dashboard — كل أرقام المالك في طلب واحد
import { Hono } from 'hono';
import { eq, and, or, ne, inArray, isNull, desc, count } from 'drizzle-orm';
import { db, user, properties, propertyViews, favorites, conversations, messages } from '../db/index.js';
import { requireAuth } from '../lib/http.js';
import { mediaSummary, OPEN_STATUSES } from '../lib/dealLogic.js';
import { myDealItems, actionDeals } from '../lib/dashboardData.js';
import { ratingOf, firstName } from '../lib/userStats.js';
import { DEAL_STATUSES } from '../lib/constants.js';

export const dashboardRoutes = new Hono();
dashboardRoutes.use('*', requireAuth);

const RIYADH_MS = 3 * 3600 * 1000; // نحسب الأيام بتوقيت السعودية (UTC+3)
const dayKey = (ms) => new Date(ms + RIYADH_MS).toISOString().slice(0, 10);

dashboardRoutes.get('/', async (c) => {
  const u = c.get('user');
  const mine = await db.select().from(properties).where(eq(properties.ownerId, u.id));
  const myIds = mine.map((p) => p.id);
  const since = new Date(Date.now() - 31 * 24 * 3600 * 1000);

  // ---- المشاهدات ----
  const viewRows = myIds.length
    ? await db.select({ propertyId: propertyViews.propertyId, createdAt: propertyViews.createdAt }).from(propertyViews).where(inArray(propertyViews.propertyId, myIds))
    : [];
  const viewsTotal = new Map();
  const perDay = new Map();
  for (const v of viewRows) {
    viewsTotal.set(v.propertyId, (viewsTotal.get(v.propertyId) ?? 0) + 1);
    if (v.createdAt >= since) perDay.set(dayKey(+v.createdAt), (perDay.get(dayKey(+v.createdAt)) ?? 0) + 1);
  }
  const now = Date.now();
  const viewsSeries = [];
  for (let i = 29; i >= 0; i--) {
    const date = dayKey(now - i * 24 * 3600 * 1000);
    viewsSeries.push({ date, views: perDay.get(date) ?? 0 });
  }
  const views30d = viewsSeries.reduce((a, b) => a + b.views, 0);

  // ---- المفضلة، الرسائل، الصفقات ----
  const [{ n: favoritesReceived }] = myIds.length
    ? await db.select({ n: count() }).from(favorites).where(inArray(favorites.propertyId, myIds))
    : [{ n: 0 }];

  const allConvs = await db.select().from(conversations).where(or(eq(conversations.ownerId, u.id), eq(conversations.initiatorId, u.id)));
  const convs = allConvs.filter((x) => x.ownerId === u.id); // محادثات على عقاراتي (المهتمون)
  const myConvIds = allConvs.map((x) => x.id);
  const unreadRows = myConvIds.length
    ? await db
        .select({ cid: messages.conversationId, n: count() })
        .from(messages)
        .where(and(inArray(messages.conversationId, myConvIds), ne(messages.senderId, u.id), isNull(messages.readAt)))
        .groupBy(messages.conversationId)
    : [];
  const unread = new Map(unreadRows.map((r) => [r.cid, r.n]));
  const unreadMessages = unreadRows.reduce((a, r) => a + r.n, 0);

  const dealItems = await myDealItems(u.id);
  const dealsByStatus = Object.fromEntries(DEAL_STATUSES.map((s) => [s.id, 0]));
  for (const d of dealItems) dealsByStatus[d.status] = (dealsByStatus[d.status] ?? 0) + 1;

  const rating = await ratingOf(u.id);
  const media = await mediaSummary(myIds);

  // ---- أكثر عقاراتي مشاهدة ----
  let topProperty = null;
  const top = [...mine].sort((a, b) => (viewsTotal.get(b.id) ?? 0) - (viewsTotal.get(a.id) ?? 0))[0];
  if (top) {
    topProperty = { id: top.id, title: top.title, cover: media.get(top.id)?.cover ?? null, price: top.price, viewsCount: viewsTotal.get(top.id) ?? 0, listingType: top.listingType, district: top.district };
  }

  // ---- المهتمون بعقاراتي (آخر 6 محادثات) ----
  const propMap = new Map(mine.map((p) => [p.id, p]));
  const leadRows = await Promise.all(
    convs.map(async (conv) => {
      const [last] = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(desc(messages.createdAt)).limit(1);
      const [who] = await db.select({ name: user.name }).from(user).where(eq(user.id, conv.initiatorId));
      const p = propMap.get(conv.propertyId);
      return {
        conversationId: conv.id,
        name: firstName(who?.name),
        property: { id: conv.propertyId, title: p?.title ?? '' },
        lastMessage: last?.body ?? null,
        unread: unread.get(conv.id) ?? 0,
        at: last?.createdAt ?? conv.createdAt,
      };
    }),
  );
  leadRows.sort((a, b) => new Date(b.at) - new Date(a.at));

  const actions = (await actionDeals(u.id, dealItems)).map((d) => ({ dealId: d.id, action: d.nextAction, propertyTitle: d.property.title, other: { id: d.other.id, name: d.other.name } }));

  return c.json({
    kpis: {
      activeListings: mine.filter((p) => p.status === 'active').length,
      views30d,
      favoritesReceived,
      activeDeals: dealItems.filter((d) => OPEN_STATUSES.includes(d.status)).length,
      completedDeals: dealItems.filter((d) => d.status === 'completed').length,
      unreadMessages,
      ...rating,
    },
    viewsSeries,
    dealsByStatus,
    topProperty,
    actions,
    leads: leadRows.slice(0, 6),
    recentDeals: dealItems.slice(0, 5),
  });
});
