// =====================================================================
// مخطط قاعدة البيانات (Drizzle + SQLite)
// القسم 1: جداول Better Auth (المستخدمون والجلسات) — لا تغيّر أسماء أعمدتها.
// القسم 2: جداول ضامن.
// بعد أي تعديل هنا شغّل:  npm run db:push
// =====================================================================
import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const ts = (name) => integer(name, { mode: 'timestamp_ms' });
const createdAt = () => ts('created_at').notNull().$defaultFn(() => new Date());
const updatedAt = () => ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date());

// ---------------------------------------------------------------------
// 1) Better Auth
// ---------------------------------------------------------------------
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  // حقول إضافية خاصة بضامن
  accountType: text('account_type').notNull().default('individual'), // individual | company | staff
  phone: text('phone'),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: ts('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: ts('access_token_expires_at'),
  refreshTokenExpiresAt: ts('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------
// 2) ضامن
// ---------------------------------------------------------------------

// الملف الشخصي (صفحة واحدة لكل مستخدم)
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  nationalAddress: text('national_address'), // العنوان الوطني المختصر: 4 حروف + 4 أرقام
  nationalAddressVerified: integer('national_address_verified', { mode: 'boolean' }).notNull().default(false),
  phoneVerified: integer('phone_verified', { mode: 'boolean' }).notNull().default(false),
  updatedAt: updatedAt(),
});

// العقارات (كل صف = إعلان واحد: بيع / إيجار / استثمار)
export const properties = sqliteTable('properties', {
  id: id(),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  listingType: text('listing_type').notNull(),   // sale | rent | invest
  propertyType: text('property_type').notNull(), // villa | apartment | building | floor | land | shop | office
  usage: text('usage').notNull(),                // residential | commercial | mixed
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  price: integer('price').notNull(),             // ريال. للاستثمار = قيمة الأصل
  rentPeriod: text('rent_period'),               // monthly | yearly (للإيجار فقط)
  areaSqm: integer('area_sqm'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  city: text('city').notNull().default('jeddah'),
  district: text('district').notNull(),
  addressNote: text('address_note'),
  amenities: text('amenities', { mode: 'json' }).notNull().default([]), // مصفوفة معرّفات المرافق (انظر AMENITIES في constants.js)
  status: text('status').notNull().default('active'), // active | reserved | closed | archived
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('properties_status_type_idx').on(t.status, t.listingType),
  index('properties_owner_idx').on(t.ownerId),
  index('properties_district_idx').on(t.district),
]);

// تفاصيل الفرصة الاستثمارية (صف واحد لكل عقار من نوع invest)
// الحقول مأخوذة من بطاقة الاستثمار: المبلغ المحصّل، تغطية الأصل، الحد الأدنى، المدة، العائد المتوقع
export const investments = sqliteTable('investments', {
  propertyId: text('property_id').primaryKey().references(() => properties.id, { onDelete: 'cascade' }),
  targetAmount: integer('target_amount').notNull(),       // المبلغ المطلوب جمعه
  raisedAmount: integer('raised_amount').notNull().default(0), // المبلغ المحصّل
  minInvestment: integer('min_investment').notNull(),     // الحد الأدنى للاستثمار
  durationMonths: integer('duration_months').notNull(),   // مدة الفرصة
  expectedReturnPct: real('expected_return_pct').notNull(), // صافي العائد المتوقع %
});

// مبالغ المستثمرين (محاكاة — ما فيها أموال حقيقية)
export const investmentCommitments = sqliteTable('investment_commitments', {
  id: id(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('pending'), // pending | confirmed | cancelled
  createdAt: createdAt(),
});

export const propertyMedia = sqliteTable('property_media', {
  id: id(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// مشاهدات الإعلانات (صف لكل زيارة) — تغذّي لوحة التحكم
export const propertyViews = sqliteTable('property_views', {
  id: id(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  viewerId: text('viewer_id'), // null = زائر غير مسجّل
  createdAt: createdAt(),
}, (t) => [index('property_views_prop_idx').on(t.propertyId, t.createdAt)]);

export const favorites = sqliteTable('favorites', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.propertyId] })]);

// المحادثات: محادثة واحدة لكل (عقار + شخص مهتم)
export const conversations = sqliteTable('conversations', {
  id: id(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').notNull().references(() => user.id),
  initiatorId: text('initiator_id').notNull().references(() => user.id),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('conversations_unique').on(t.propertyId, t.initiatorId)]);

export const messages = sqliteTable('messages', {
  id: id(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => user.id),
  body: text('body').notNull(),
  kind: text('kind').notNull().default('text'), // text | system (رسائل النظام عند تغيّر حالة الصفقة)
  createdAt: createdAt(),
  readAt: ts('read_at'),
}, (t) => [index('messages_conv_idx').on(t.conversationId, t.createdAt)]);

// الصفقات: مسار التأكيد (تم التحويل / تم الاستلام)
export const deals = sqliteTable('deals', {
  id: id(),
  propertyId: text('property_id').notNull().references(() => properties.id),
  conversationId: text('conversation_id').references(() => conversations.id),
  ownerId: text('owner_id').notNull().references(() => user.id),        // صاحب العقار (بائع / مؤجر / مستثمَر فيه)
  counterpartyId: text('counterparty_id').notNull().references(() => user.id), // مشتري / مستأجر / مستثمر
  kind: text('kind').notNull(),                  // sale | rent | invest
  agreedPrice: integer('agreed_price').notNull(),
  durationMonths: integer('duration_months'),    // للإيجار والاستثمار
  status: text('status').notNull().default('negotiating'),
  // negotiating | agreed | awaiting_signatures | awaiting_transfer | awaiting_receipt | completed | cancelled | disputed
  payerConfirmedAt: ts('payer_confirmed_at'),    // زر "تم التحويل"
  receiverConfirmedAt: ts('receiver_confirmed_at'), // زر "تم الاستلام"
  cancelReason: text('cancel_reason'),
  proposedBy: text('proposed_by').references(() => user.id), // من اقترح الصفقة (الطرف الآخر هو من يقبلها)
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('deals_owner_idx').on(t.ownerId), index('deals_counterparty_idx').on(t.counterpartyId)]);

export const contracts = sqliteTable('contracts', {
  id: id(),
  dealId: text('deal_id').notNull().unique().references(() => deals.id, { onDelete: 'cascade' }),
  number: text('number').notNull().unique(),     // رقم العقد الظاهر في الختم
  templateType: text('template_type').notNull(), // sale | rent | invest
  snapshot: text('snapshot', { mode: 'json' }).notNull(), // نسخة ثابتة من بيانات الطرفين والعقار والسعر والمدة وقت الإنشاء
  sealHash: text('seal_hash').notNull(),         // بصمة تمنع التلاعب (تظهر في الختم)
  status: text('status').notNull().default('pending_signatures'), // pending_signatures | signed
  createdAt: createdAt(),
  signedAt: ts('signed_at'),
});

export const signatures = sqliteTable('signatures', {
  id: id(),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id),
  role: text('role').notNull(),                  // owner | counterparty
  signedName: text('signed_name').notNull(),
  ipAddress: text('ip_address'),
  signedAt: createdAt(),
}, (t) => [uniqueIndex('signatures_unique').on(t.contractId, t.userId)]);

// التقييمات: بعد صفقة مكتملة فقط، مرة واحدة من كل طرف
export const reviews = sqliteTable('reviews', {
  id: id(),
  dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  reviewerId: text('reviewer_id').notNull().references(() => user.id),
  revieweeId: text('reviewee_id').notNull().references(() => user.id),
  rating: integer('rating').notNull(),           // 1..5
  comment: text('comment'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('reviews_unique').on(t.dealId, t.reviewerId)]);

// تذاكر الدعم: يفتحها المستخدم ويشوف حالتها فقط (المعالجة من لوحة المشرف لاحقاً)
export const tickets = sqliteTable('tickets', {
  id: id(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  dealId: text('deal_id').references(() => deals.id),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('open'), // open | in_review | resolved | closed
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('tickets_user_idx').on(t.userId)]);
