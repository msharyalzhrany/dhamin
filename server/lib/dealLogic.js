// =====================================================================
// منطق الصفقات المشترك — تستخدمه المسارات (routes/deals.js) وسكربت البيانات التجريبية (seed).
// حتى تبقى البيانات التجريبية مطابقة تماماً لما يحدث في الاستخدام الحقيقي.
//
// الأدوار: صاحب العقار (owner) = المستلم دائماً، والطرف الآخر (counterparty) = الدافع دائماً.
// المسار: negotiating → agreed → awaiting_signatures → awaiting_transfer → awaiting_receipt → completed
// حالتان نهائيتان: cancelled و disputed
// =====================================================================
import { createHash } from 'node:crypto';
import { eq, and, or, ne, count, inArray, asc, sql } from 'drizzle-orm';
import {
  db, user, profiles, properties, investments, investmentCommitments, propertyMedia,
  conversations, messages, deals, contracts, signatures, reviews,
} from '../db/index.js';
import { ApiError } from './http.js';
import { LIMITS } from './constants.js';
import { ratingsFor, profilesFor, firstName } from './userStats.js';

// صفقة "غير نهائية" = تُحسب ضمن الحد الأقصى للصفقات النشطة
export const OPEN_STATUSES = ['negotiating', 'agreed', 'awaiting_signatures', 'awaiting_transfer', 'awaiting_receipt'];
// من هذه الحالة وما بعدها تظهر الأسماء الكاملة وأرقام الجوال
const REVEALED_STATUSES = ['agreed', 'awaiting_signatures', 'awaiting_transfer', 'awaiting_receipt', 'completed', 'disputed'];
export const isRevealed = (status) => REVEALED_STATUSES.includes(status);

// drizzle يغلّف أخطاء SQLite، فنفحص الرسالة والسبب الأصلي معاً
const isUnique = (e) => /UNIQUE/i.test(`${e?.message} ${e?.cause?.message} ${e?.cause?.code}`);

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

export const limitsFor = (u) => LIMITS[u.accountType] ?? LIMITS.individual;

// ---------------------------------------------------------------------
// أدوات صغيرة
// ---------------------------------------------------------------------

// JSON "قانوني": نفس البيانات ← نفس النص دائماً (نرتب المفاتيح أبجدياً) حتى تكون البصمة ثابتة
export function canonicalJson(v) {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export const sealOf = (snapshot, number) => createHash('sha256').update(canonicalJson(snapshot) + number).digest('hex');

// تطبيع الاسم للمقارنة: بدون مسافات ولا فروق حروف
export const normName = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');

// رسالة نظام داخل المحادثة (تظهر للطرفين كإشعار بتغيّر الحالة)
export async function systemMessage(conversationId, senderId, body, createdAt) {
  if (!conversationId) return;
  await db.insert(messages).values({ conversationId, senderId, body, kind: 'system', ...(createdAt ? { createdAt } : {}) });
}

// عدد الصفقات المفتوحة للمستخدم (سواء كان مالكاً أو الطرف الآخر)
export async function countOpenDeals(userId, excludeDealId) {
  const conds = [inArray(deals.status, OPEN_STATUSES), or(eq(deals.ownerId, userId), eq(deals.counterpartyId, userId))];
  if (excludeDealId) conds.push(ne(deals.id, excludeDealId));
  const [{ n }] = await db.select({ n: count() }).from(deals).where(and(...conds));
  return n;
}

async function assertDealLimit(u, excludeDealId) {
  const max = limitsFor(u).activeDeals;
  if ((await countOpenDeals(u.id, excludeDealId)) >= max)
    throw new ApiError(409, 'DEAL_LIMIT', `وصلت للحد الأقصى (${max} صفقات نشطة). أنهِ أو ألغِ صفقة قبل بدء صفقة جديدة.`);
}

// يجلب الصفقة ويتأكد أن المستخدم أحد طرفيها
export async function getDealFor(dealId, userId) {
  const [d] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!d) throw new ApiError(404, 'NOT_FOUND', 'الصفقة غير موجودة');
  if (d.ownerId !== userId && d.counterpartyId !== userId) throw new ApiError(403, 'FORBIDDEN', 'هذه الصفقة ليست لك');
  return d;
}

// تحديث الحالة بشرط أن تكون الحالة الحالية كما نتوقع (يمنع التعارض لو ضغط الطرفان معاً)
async function moveStatus(dealId, from, patch) {
  const rows = await db
    .update(deals)
    .set(patch)
    .where(and(eq(deals.id, dealId), eq(deals.status, from)))
    .returning();
  if (!rows.length) throw new ApiError(409, 'BAD_STATE', 'تغيّرت حالة الصفقة، حدّث الصفحة وحاول مرة أخرى');
  return rows[0];
}

// ---------------------------------------------------------------------
// 1) إنشاء صفقة (اقتراح)
// ---------------------------------------------------------------------
export async function createDeal(u, { conversationId, agreedPrice, durationMonths }) {
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conv) throw new ApiError(404, 'NOT_FOUND', 'المحادثة غير موجودة');
  if (conv.ownerId !== u.id && conv.initiatorId !== u.id) throw new ApiError(403, 'FORBIDDEN', 'هذه المحادثة ليست لك');

  const [prop] = await db.select().from(properties).where(eq(properties.id, conv.propertyId));
  if (!prop || prop.status !== 'active') throw new ApiError(409, 'PROPERTY_UNAVAILABLE', 'هذا العقار لم يعد متاحاً');

  const [existing] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.conversationId, conv.id), inArray(deals.status, OPEN_STATUSES)));
  if (existing) throw new ApiError(409, 'DEAL_EXISTS', 'توجد صفقة جارية في هذه المحادثة. أنهِها أو ألغِها أولاً.');

  const kind = prop.listingType;
  let months = null;
  if (kind === 'rent') {
    if (!durationMonths) throw new ApiError(400, 'VALIDATION', 'durationMonths: مدة الإيجار بالأشهر مطلوبة');
    months = durationMonths;
  } else if (kind === 'invest') {
    const [inv] = await db.select().from(investments).where(eq(investments.propertyId, prop.id));
    if (!inv) throw new ApiError(409, 'PROPERTY_UNAVAILABLE', 'بيانات الفرصة الاستثمارية غير مكتملة');
    const remaining = inv.targetAmount - inv.raisedAmount;
    if (agreedPrice < inv.minInvestment)
      throw new ApiError(400, 'VALIDATION', `agreedPrice: الحد الأدنى للاستثمار ${fmt(inv.minInvestment)} ريال`);
    if (agreedPrice > remaining)
      throw new ApiError(400, 'VALIDATION', `agreedPrice: المتبقي في الفرصة ${fmt(remaining)} ريال فقط`);
    months = durationMonths ?? inv.durationMonths;
  }

  await assertDealLimit(u);

  const [deal] = await db
    .insert(deals)
    .values({
      propertyId: prop.id, conversationId: conv.id, ownerId: conv.ownerId, counterpartyId: conv.initiatorId,
      kind, agreedPrice, durationMonths: months, status: 'negotiating', proposedBy: u.id,
    })
    .returning();

  const extra = months ? ` لمدة ${months} شهراً` : '';
  await systemMessage(conv.id, u.id, `${firstName(u.name)} اقترح صفقة بسعر ${fmt(agreedPrice)} ريال${extra}. بانتظار موافقة الطرف الآخر.`);
  return deal;
}

// ---------------------------------------------------------------------
// 2) قبول الصفقة ← إنشاء العقد فوراً ← بانتظار التوقيع
// ---------------------------------------------------------------------
async function nextContractNumber() {
  const year = new Date().getFullYear();
  const [{ n }] = await db.select({ n: count() }).from(contracts);
  return (offset = 0) => `DH-${year}-${String(n + 1 + offset).padStart(6, '0')}`;
}

async function partyInfo(userId) {
  const [u] = await db.select().from(user).where(eq(user.id, userId));
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return { id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, nationalAddress: p?.nationalAddress ?? null };
}

export async function generateContract(deal) {
  const [prop] = await db.select().from(properties).where(eq(properties.id, deal.propertyId));
  const snapshot = {
    templateType: deal.kind,
    createdAt: new Date().toISOString(),
    property: {
      id: prop.id, title: prop.title, propertyType: prop.propertyType, usage: prop.usage,
      district: prop.district, areaSqm: prop.areaSqm ?? null, addressNote: prop.addressNote ?? null,
    },
    price: deal.agreedPrice,
    durationMonths: deal.durationMonths ?? null,
    owner: await partyInfo(deal.ownerId),
    counterparty: await partyInfo(deal.counterpartyId),
  };
  if (deal.kind === 'rent') snapshot.rentPeriod = prop.rentPeriod;
  if (deal.kind === 'invest') {
    const [inv] = await db.select().from(investments).where(eq(investments.propertyId, prop.id));
    snapshot.investment = { expectedReturnPct: inv.expectedReturnPct, durationMonths: inv.durationMonths };
  }

  const nextNumber = await nextContractNumber();
  // لو تكرر الرقم (نادراً، عند قبولين متزامنين) نجرب الرقم التالي
  for (let i = 0; i < 5; i++) {
    const number = nextNumber(i);
    const full = { number, ...snapshot };
    try {
      const [c] = await db
        .insert(contracts)
        .values({ dealId: deal.id, number, templateType: deal.kind, snapshot: full, sealHash: sealOf(full, number) })
        .returning();
      return c;
    } catch (e) {
      if (!isUnique(e) || i === 4) throw e;
    }
  }
}

export async function acceptDeal(u, dealId) {
  const d = await getDealFor(dealId, u.id);
  if (d.status !== 'negotiating') throw new ApiError(409, 'BAD_STATE', 'لا يمكن قبول هذه الصفقة في حالتها الحالية');
  if (d.proposedBy === u.id) throw new ApiError(403, 'FORBIDDEN', 'الطرف الآخر هو من يقبل اقتراحك');

  const [prop] = await db.select().from(properties).where(eq(properties.id, d.propertyId));
  if (!prop || prop.status !== 'active') throw new ApiError(409, 'PROPERTY_UNAVAILABLE', 'هذا العقار لم يعد متاحاً');
  await assertDealLimit(u, d.id); // صفقاتي الأخرى (هذه الصفقة محسوبة أصلاً)

  // الخطوة 1: negotiating → agreed (شرطية، تمنع القبول المزدوج)
  await moveStatus(d.id, 'negotiating', { status: 'agreed' });

  // الخطوة 2: حجز العقار (إلا الاستثمار يبقى متاحاً لمستثمرين آخرين)
  let reserved = false;
  try {
    if (d.kind !== 'invest') {
      const r = await db.update(properties).set({ status: 'reserved' }).where(and(eq(properties.id, d.propertyId), eq(properties.status, 'active'))).returning();
      if (!r.length) throw new ApiError(409, 'PROPERTY_UNAVAILABLE', 'هذا العقار لم يعد متاحاً');
      reserved = true;
    }
    // الخطوة 3: توليد العقد والانتقال لمرحلة التوقيع
    const contract = await generateContract(d);
    const updated = await moveStatus(d.id, 'agreed', { status: 'awaiting_signatures' });
    await systemMessage(d.conversationId, u.id, `وافق ${firstName(u.name)} على الصفقة. تم إنشاء العقد رقم ${contract.number}، وهو بانتظار توقيع الطرفين.`);
    return { deal: updated, contract };
  } catch (e) {
    // أي فشل: نتراجع حتى لا تبقى الصفقة معلّقة في منتصف الطريق
    await db.delete(contracts).where(and(eq(contracts.dealId, d.id), eq(contracts.status, 'pending_signatures')));
    if (reserved) await db.update(properties).set({ status: 'active' }).where(eq(properties.id, d.propertyId));
    await db.update(deals).set({ status: 'negotiating' }).where(and(eq(deals.id, d.id), eq(deals.status, 'agreed')));
    throw e;
  }
}

// ---------------------------------------------------------------------
// 3) التوقيع الإلكتروني
// ---------------------------------------------------------------------
export async function signDeal(u, dealId, signedName, ip) {
  const d = await getDealFor(dealId, u.id);
  if (d.status !== 'awaiting_signatures') throw new ApiError(409, 'BAD_STATE', 'العقد ليس في مرحلة التوقيع');
  if (normName(signedName) !== normName(u.name))
    throw new ApiError(400, 'NAME_MISMATCH', 'اكتب اسمك تماماً كما هو مسجّل في حسابك للتوقيع');

  const [contract] = await db.select().from(contracts).where(eq(contracts.dealId, d.id));
  const role = d.ownerId === u.id ? 'owner' : 'counterparty';
  try {
    await db.insert(signatures).values({ contractId: contract.id, userId: u.id, role, signedName: signedName.trim(), ipAddress: ip ?? null });
  } catch (e) {
    if (isUnique(e)) throw new ApiError(409, 'ALREADY_SIGNED', 'وقّعت هذا العقد من قبل');
    throw e;
  }

  const [{ n }] = await db.select({ n: count() }).from(signatures).where(eq(signatures.contractId, contract.id));
  if (n >= 2) {
    const done = await db
      .update(contracts)
      .set({ status: 'signed', signedAt: new Date() })
      .where(and(eq(contracts.id, contract.id), eq(contracts.status, 'pending_signatures')))
      .returning();
    if (done.length) {
      await moveStatus(d.id, 'awaiting_signatures', { status: 'awaiting_transfer' });
      await systemMessage(d.conversationId, u.id, `وقّع ${firstName(u.name)} العقد. اكتمل توقيع الطرفين، وبانتظار تحويل المبلغ من الطرف الدافع.`);
      return { allSigned: true };
    }
  }
  await systemMessage(d.conversationId, u.id, `وقّع ${firstName(u.name)} العقد، وبانتظار توقيع الطرف الآخر.`);
  return { allSigned: false };
}

// ---------------------------------------------------------------------
// 4) تم التحويل (الدافع) ثم تم الاستلام (المستلم)
// ---------------------------------------------------------------------
export async function confirmTransfer(u, dealId) {
  const d = await getDealFor(dealId, u.id);
  if (d.counterpartyId !== u.id) throw new ApiError(403, 'FORBIDDEN', 'تأكيد التحويل من الطرف الدافع فقط');
  if (d.status !== 'awaiting_transfer') throw new ApiError(409, 'BAD_STATE', 'الصفقة ليست في مرحلة التحويل');
  const updated = await moveStatus(d.id, 'awaiting_transfer', { status: 'awaiting_receipt', payerConfirmedAt: new Date() });
  await systemMessage(d.conversationId, u.id, `أكّد ${firstName(u.name)} أنه حوّل المبلغ. بانتظار تأكيد المستلم.`);
  return updated;
}

export async function confirmReceipt(u, dealId) {
  const d = await getDealFor(dealId, u.id);
  if (d.ownerId !== u.id) throw new ApiError(403, 'FORBIDDEN', 'تأكيد الاستلام من الطرف المستلم فقط');
  if (d.status !== 'awaiting_receipt') throw new ApiError(409, 'BAD_STATE', 'الصفقة ليست في مرحلة الاستلام');
  const updated = await moveStatus(d.id, 'awaiting_receipt', { status: 'completed', receiverConfirmedAt: new Date() });

  if (d.kind === 'invest') {
    // محاكاة: نزيد المبلغ المحصّل ونسجّل مساهمة المستثمر
    await db.update(investments).set({ raisedAmount: sql`${investments.raisedAmount} + ${d.agreedPrice}` }).where(eq(investments.propertyId, d.propertyId));
    await db.insert(investmentCommitments).values({ propertyId: d.propertyId, userId: d.counterpartyId, amount: d.agreedPrice, status: 'confirmed' });
    const [inv] = await db.select().from(investments).where(eq(investments.propertyId, d.propertyId));
    if (inv.raisedAmount >= inv.targetAmount) await db.update(properties).set({ status: 'closed' }).where(eq(properties.id, d.propertyId));
  } else {
    await db.update(properties).set({ status: 'closed' }).where(eq(properties.id, d.propertyId));
  }
  await systemMessage(d.conversationId, u.id, `أكّد ${firstName(u.name)} استلام المبلغ. اكتملت الصفقة بنجاح، ويمكن للطرفين الآن تقييم بعضهما.`);
  return updated;
}

// ---------------------------------------------------------------------
// 5) الإلغاء (قبل التحويل فقط)
// ---------------------------------------------------------------------
export async function cancelDeal(u, dealId, reason) {
  const d = await getDealFor(dealId, u.id);
  if (d.status === 'awaiting_receipt')
    throw new ApiError(409, 'USE_TICKET', 'بعد تأكيد التحويل لا يمكن الإلغاء مباشرة. افتح تذكرة دعم وسيراجعها فريق ضامن.');
  if (!['negotiating', 'agreed', 'awaiting_signatures', 'awaiting_transfer'].includes(d.status))
    throw new ApiError(409, 'BAD_STATE', 'لا يمكن إلغاء هذه الصفقة في حالتها الحالية');

  const updated = await moveStatus(d.id, d.status, { status: 'cancelled', cancelReason: reason });
  // نرجع العقار متاحاً إذا كان محجوزاً بسبب هذه الصفقة
  await db.update(properties).set({ status: 'active' }).where(and(eq(properties.id, d.propertyId), eq(properties.status, 'reserved')));
  await db.update(contracts).set({ status: 'cancelled' }).where(and(eq(contracts.dealId, d.id), ne(contracts.status, 'signed')));
  await systemMessage(d.conversationId, u.id, `ألغى ${firstName(u.name)} الصفقة. السبب: ${reason}`);
  return updated;
}

// ---------------------------------------------------------------------
// 6) التقييم بعد اكتمال الصفقة
// ---------------------------------------------------------------------
export async function reviewDeal(u, dealId, { rating, comment }) {
  const d = await getDealFor(dealId, u.id);
  if (d.status !== 'completed') throw new ApiError(409, 'BAD_STATE', 'التقييم متاح بعد اكتمال الصفقة فقط');
  const revieweeId = d.ownerId === u.id ? d.counterpartyId : d.ownerId;
  try {
    const [r] = await db.insert(reviews).values({ dealId: d.id, reviewerId: u.id, revieweeId, rating, comment: comment || null }).returning();
    return r;
  } catch (e) {
    if (isUnique(e)) throw new ApiError(409, 'ALREADY_REVIEWED', 'قيّمت هذه الصفقة من قبل');
    throw e;
  }
}

// عند فتح تذكرة دعم مرتبطة بصفقة (يُستدعى من routes/tickets.js)
export async function markDisputedByTicket(u, dealId) {
  const d = await getDealFor(dealId, u.id).catch((e) => {
    if (e instanceof ApiError) throw new ApiError(404, 'NOT_FOUND', 'الصفقة غير موجودة');
    throw e;
  });
  if (['awaiting_transfer', 'awaiting_receipt'].includes(d.status)) {
    await moveStatus(d.id, d.status, { status: 'disputed' });
    await systemMessage(d.conversationId, u.id, 'تم فتح تذكرة دعم بخصوص هذه الصفقة، وتحوّلت حالتها إلى "متنازع عليها" لحين مراجعة فريق ضامن.');
  }
}

// ---------------------------------------------------------------------
// عرض الصفقات: الإجراء التالي + بناء عناصر القائمة
// ---------------------------------------------------------------------

// بيانات مساعدة لحساب nextAction لمجموعة صفقات دفعة واحدة
export async function loadDealCtx(dealRows) {
  const ids = dealRows.map((d) => d.id);
  const ctx = { contracts: new Map(), sigs: new Map(), reviews: new Map() };
  if (!ids.length) return ctx;
  const cs = await db.select().from(contracts).where(inArray(contracts.dealId, ids));
  for (const c of cs) ctx.contracts.set(c.dealId, c);
  if (cs.length) {
    const sg = await db.select().from(signatures).where(inArray(signatures.contractId, cs.map((c) => c.id)));
    for (const s of sg) ctx.sigs.set(s.contractId, [...(ctx.sigs.get(s.contractId) ?? []), s]);
  }
  const rv = await db.select().from(reviews).where(inArray(reviews.dealId, ids));
  for (const r of rv) ctx.reviews.set(r.dealId, [...(ctx.reviews.get(r.dealId) ?? []), r]);
  return ctx;
}

export function nextActionFor(d, meId, ctx) {
  const contract = ctx.contracts.get(d.id);
  const signed = contract && (ctx.sigs.get(contract.id) ?? []).some((s) => s.userId === meId);
  const reviewed = (ctx.reviews.get(d.id) ?? []).some((r) => r.reviewerId === meId);
  switch (d.status) {
    case 'negotiating': return d.proposedBy !== meId ? 'accept' : 'wait';
    case 'awaiting_signatures': return signed ? 'wait_signature' : 'sign';
    case 'awaiting_transfer': return d.counterpartyId === meId ? 'confirm_transfer' : 'wait_transfer';
    case 'awaiting_receipt': return d.ownerId === meId ? 'confirm_receipt' : 'wait_receipt';
    case 'completed': return reviewed ? null : 'review';
    default: return null;
  }
}

// أغلفة الصور (أول صورة لكل عقار) لمجموعة عقارات → Map(propertyId → {cover, count})
export async function mediaSummary(propertyIds) {
  const map = new Map();
  if (!propertyIds.length) return map;
  const rows = await db.select().from(propertyMedia).where(inArray(propertyMedia.propertyId, propertyIds)).orderBy(asc(propertyMedia.sortOrder));
  for (const m of rows) {
    const cur = map.get(m.propertyId);
    if (cur) cur.count += 1;
    else map.set(m.propertyId, { cover: m.url, count: 1 });
  }
  return map;
}

// يبني عناصر قائمة الصفقات (GET /api/deals) — وتُستخدم أيضاً في لوحة التحكم
export async function buildDealItems(dealRows, meId) {
  if (!dealRows.length) return [];
  const propIds = [...new Set(dealRows.map((d) => d.propertyId))];
  const otherIds = [...new Set(dealRows.map((d) => (d.ownerId === meId ? d.counterpartyId : d.ownerId)))];
  const [props, media, users, profs, ctx] = await Promise.all([
    db.select({ id: properties.id, title: properties.title }).from(properties).where(inArray(properties.id, propIds)),
    mediaSummary(propIds),
    db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, otherIds)),
    profilesFor(otherIds),
    loadDealCtx(dealRows),
  ]);
  const propMap = new Map(props.map((p) => [p.id, p]));
  const userMap = new Map(users.map((x) => [x.id, x]));

  return dealRows.map((d) => {
    const otherId = d.ownerId === meId ? d.counterpartyId : d.ownerId;
    const o = userMap.get(otherId);
    return {
      id: d.id,
      status: d.status,
      kind: d.kind,
      agreedPrice: d.agreedPrice,
      durationMonths: d.durationMonths,
      role: d.ownerId === meId ? 'owner' : 'counterparty',
      payerIsMe: d.counterpartyId === meId,
      proposedBy: d.proposedBy,
      property: { id: d.propertyId, title: propMap.get(d.propertyId)?.title ?? '', cover: media.get(d.propertyId)?.cover ?? null },
      other: { id: otherId, name: isRevealed(d.status) ? o?.name : firstName(o?.name), avatarUrl: profs.get(otherId)?.avatarUrl || null },
      conversationId: d.conversationId,
      contractNumber: ctx.contracts.get(d.id)?.number ?? null,
      nextAction: nextActionFor(d, meId, ctx),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  });
}

// أسماء المستخدمين مع تطبيق قاعدة الخصوصية (اسم أول فقط قبل الاتفاق)
export { ratingsFor, profilesFor, firstName };
