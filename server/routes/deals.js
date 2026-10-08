// مسار الصفقة (الثقة): اقتراح ← قبول + عقد ← توقيع ← تحويل ← استلام ← تقييم
// المنطق الفعلي في lib/dealLogic.js (مشترك مع سكربت seed)؛ هنا فقط التحقق من المدخلات وعرض النتائج.
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, or, desc } from 'drizzle-orm';
import { db, user, properties, deals } from '../db/index.js';
import { requireAuth, readJson, parse } from '../lib/http.js';
import { clientIp } from '../lib/rateLimit.js';
import {
  createDeal, acceptDeal, signDeal, confirmTransfer, confirmReceipt, cancelDeal, reviewDeal,
  getDealFor, buildDealItems, loadDealCtx, nextActionFor, mediaSummary, isRevealed,
  ratingsFor, profilesFor, firstName,
} from '../lib/dealLogic.js';

export const dealsRoutes = new Hono();
dealsRoutes.use('*', requireAuth);

const createSchema = z.object({
  conversationId: z.string().min(1),
  agreedPrice: z.number().int().positive('السعر لازم يكون أكبر من صفر'),
  durationMonths: z.number().int().min(1).max(120).optional(),
});

dealsRoutes.post('/', async (c) => {
  const u = c.get('user');
  const deal = await createDeal(u, parse(createSchema, await readJson(c)));
  return c.json({ id: deal.id, status: deal.status }, 201);
});

dealsRoutes.get('/', async (c) => {
  const u = c.get('user');
  const rows = await db.select().from(deals).where(or(eq(deals.ownerId, u.id), eq(deals.counterpartyId, u.id))).orderBy(desc(deals.updatedAt));
  return c.json({ items: await buildDealItems(rows, u.id) });
});

dealsRoutes.get('/:id', async (c) => {
  const u = c.get('user');
  const d = await getDealFor(c.req.param('id'), u.id);
  const ctx = await loadDealCtx([d]);
  const contract = ctx.contracts.get(d.id) ?? null;
  const [prop] = await db.select().from(properties).where(eq(properties.id, d.propertyId));
  const media = await mediaSummary([prop.id]);

  const partyIds = [d.ownerId, d.counterpartyId];
  const users = await Promise.all(partyIds.map((id) => db.select().from(user).where(eq(user.id, id)).then((r) => r[0])));
  const [ratings, profs] = await Promise.all([ratingsFor(partyIds), profilesFor(partyIds)]);
  const revealed = isRevealed(d.status);
  const party = (x) => ({
    id: x.id,
    name: revealed ? x.name : firstName(x.name),
    avatarUrl: profs.get(x.id)?.avatarUrl || null,
    phone: revealed ? x.phone ?? null : null,
    ratingAvg: ratings.get(x.id).ratingAvg,
  });

  const rv = ctx.reviews.get(d.id) ?? [];
  const pick = (r) => (r ? { rating: r.rating, comment: r.comment } : null);

  return c.json({
    id: d.id, status: d.status, kind: d.kind, agreedPrice: d.agreedPrice, durationMonths: d.durationMonths,
    proposedBy: d.proposedBy, cancelReason: d.cancelReason,
    payerConfirmedAt: d.payerConfirmedAt, receiverConfirmedAt: d.receiverConfirmedAt,
    createdAt: d.createdAt, updatedAt: d.updatedAt,
    property: { id: prop.id, title: prop.title, cover: media.get(prop.id)?.cover ?? null, district: prop.district, propertyType: prop.propertyType, price: prop.price, listingType: prop.listingType },
    owner: party(users[0]),
    counterparty: party(users[1]),
    role: d.ownerId === u.id ? 'owner' : 'counterparty',
    payerIsMe: d.counterpartyId === u.id,
    nextAction: nextActionFor(d, u.id, ctx),
    contract: contract && {
      id: contract.id, number: contract.number, status: contract.status, sealHash: contract.sealHash, snapshot: contract.snapshot, signedAt: contract.signedAt,
      signatures: (ctx.sigs.get(contract.id) ?? []).map((s) => ({ userId: s.userId, role: s.role, signedName: s.signedName, signedAt: s.signedAt })),
    },
    reviews: { mine: pick(rv.find((r) => r.reviewerId === u.id)), theirs: pick(rv.find((r) => r.revieweeId === u.id)) },
    conversationId: d.conversationId,
  });
});

dealsRoutes.post('/:id/accept', async (c) => {
  const { deal, contract } = await acceptDeal(c.get('user'), c.req.param('id'));
  return c.json({ id: deal.id, status: deal.status, contractNumber: contract.number });
});

dealsRoutes.post('/:id/sign', async (c) => {
  const { signedName } = parse(z.object({ signedName: z.string().trim().min(2).max(100) }), await readJson(c));
  const r = await signDeal(c.get('user'), c.req.param('id'), signedName, clientIp(c));
  return c.json({ ok: true, ...r });
});

dealsRoutes.post('/:id/confirm-transfer', async (c) => {
  const d = await confirmTransfer(c.get('user'), c.req.param('id'));
  return c.json({ id: d.id, status: d.status });
});

dealsRoutes.post('/:id/confirm-receipt', async (c) => {
  const d = await confirmReceipt(c.get('user'), c.req.param('id'));
  return c.json({ id: d.id, status: d.status });
});

dealsRoutes.post('/:id/cancel', async (c) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(3, 'اكتب سبب الإلغاء').max(300) }), await readJson(c));
  const d = await cancelDeal(c.get('user'), c.req.param('id'), reason);
  return c.json({ id: d.id, status: d.status });
});

dealsRoutes.post('/:id/review', async (c) => {
  const body = parse(z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(500).optional() }), await readJson(c));
  await reviewDeal(c.get('user'), c.req.param('id'), body);
  return c.json({ ok: true }, 201);
});
