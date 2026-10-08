// بيانات تجريبية لجدة:  npm run db:seed          (آمن للتكرار: لا يكرر إن كانت موجودة)
//                        npm run db:seed -- --reset   (يحذف بيانات الحسابات التجريبية ويعيد إنشاءها)
// الحسابات التجريبية كلها بالنطاق demo.dhamin.test وكلمة المرور Demo@12345
import { fileURLToPath } from 'node:url';
import { eq, like, or, inArray } from 'drizzle-orm';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const { auth } = await import('../server/auth.js');
const {
  db, user, profiles, properties, investments, propertyMedia, propertyViews, favorites,
  conversations, messages, deals, tickets,
} = await import('../server/db/index.js');
const D = await import('../server/lib/dealLogic.js');

const DOMAIN = 'demo.dhamin.test';
const PASSWORD = 'Demo@12345';
const RESET = process.argv.includes('--reset');

// ---------------- حذف البيانات التجريبية القديمة ----------------
async function wipeDemo() {
  const us = await db.select({ id: user.id }).from(user).where(like(user.email, `%@${DOMAIN}`));
  const uids = us.map((x) => x.id);
  if (!uids.length) return;
  const props = await db.select({ id: properties.id }).from(properties).where(inArray(properties.ownerId, uids));
  const pids = props.map((x) => x.id);
  const ds = await db.select({ id: deals.id }).from(deals).where(or(inArray(deals.ownerId, uids), inArray(deals.counterpartyId, uids), ...(pids.length ? [inArray(deals.propertyId, pids)] : [])));
  const dids = ds.map((x) => x.id);
  // الترتيب مهم بسبب المفاتيح الأجنبية: تذاكر ← صفقات (العقود والتقييمات تُحذف تلقائياً) ← محادثات ← رسائل ← عقارات ← مستخدمون
  await db.delete(tickets).where(or(inArray(tickets.userId, uids), ...(dids.length ? [inArray(tickets.dealId, dids)] : [])));
  if (dids.length) await db.delete(deals).where(inArray(deals.id, dids));
  await db.delete(conversations).where(or(inArray(conversations.ownerId, uids), inArray(conversations.initiatorId, uids)));
  await db.delete(messages).where(inArray(messages.senderId, uids));
  if (pids.length) await db.delete(properties).where(inArray(properties.id, pids));
  await db.delete(user).where(inArray(user.id, uids));
  console.log(`🧹 حُذفت بيانات ${uids.length} حساب تجريبي`);
}

const [existing] = await db.select().from(user).where(eq(user.email, `khalid@${DOMAIN}`));
if (existing && !RESET) {
  console.log('ℹ️  already seeded — البيانات التجريبية موجودة. استخدم  npm run db:seed -- --reset  لإعادة إنشائها.');
  process.exit(0);
}
if (RESET) await wipeDemo();

// ---------------- أدوات ----------------
// مولّد أرقام شبه عشوائي ثابت (نفس البذرة ← نفس النتيجة دائماً)
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);
const HOUR = 3600_000, DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms);

// ---------------- 1) المستخدمون ----------------
const PEOPLE = [
  { key: 'khalid', name: 'خالد العتيبي', addr: 'KHLD1001', verified: [true, true], bio: 'مستثمر عقاري في جدة منذ أكثر من ١٠ سنوات.' },
  { key: 'sara', name: 'سارة الغامدي', addr: 'SARA2002', verified: [true, false], bio: 'أبحث عن فرص سكنية مناسبة للعائلة.' },
  { key: 'abdullah', name: 'عبدالله الحربي', addr: 'ABDU3003', verified: [true, true], bio: 'مالك عقارات للإيجار والبيع في شمال جدة.' },
  { key: 'noura', name: 'نورة الزهراني', addr: 'NOUR4004', verified: [true, true], bio: 'أعرض شققي بأسعار واضحة وتعامل مباشر.' },
  { key: 'fahad', name: 'فهد القحطاني', addr: 'FAHD5005', verified: [false, false], bio: '' },
  { key: 'reem', name: 'ريم السلمي', addr: 'REEM6006', verified: [true, true], bio: 'أطرح فرصاً استثمارية مدروسة بعوائد واضحة.' },
  { key: 'mohammed', name: 'محمد الشهري', addr: 'MOHA7007', verified: [true, false], bio: 'وسيط سابق، أبيع أراضي ومشاريع استثمارية.' },
  { key: 'lina', name: 'لينا باشراحيل', addr: 'LINA8008', verified: [false, true], bio: 'مهندسة معمارية وصاحبة شقق للإيجار.' },
];

const U = {}; // key → صف المستخدم من القاعدة
for (const [i, p] of PEOPLE.entries()) {
  const email = `${p.key}@${DOMAIN}`;
  await auth.api.signUpEmail({ body: { name: p.name, email, password: PASSWORD } });
  const [row] = await db.select().from(user).where(eq(user.email, email));
  const phone = `+9665000000${String(i + 1).padStart(2, '0')}`;
  await db.update(user).set({ phone, createdAt: ago((60 - i * 5) * DAY) }).where(eq(user.id, row.id));
  await db.insert(profiles).values({ userId: row.id, bio: p.bio, nationalAddress: p.addr, phoneVerified: p.verified[0], nationalAddressVerified: p.verified[1] }).onConflictDoNothing();
  U[p.key] = { ...row, phone };
}
console.log(`👤 أُنشئ ${PEOPLE.length} مستخدمين`);

// ---------------- 2) العقارات ----------------
const IMGS = ['corniche-1', 'corniche-2', 'corniche-3', 'yanbu-1', 'yanbu-2', 'yanbu-3', 'aerial-1', 'aerial-2', 'aerial-3', 'night-1', 'night-2', 'night-3'].map((n) => `/img/seed/${n}.jpg`);

const L = [
  // ----- بيع (6) -----
  { k: 'sale1', owner: 'khalid', t: 'sale', pt: 'villa', usage: 'residential', title: 'فيلا فاخرة بإطلالة بحرية في الشاطئ', desc: 'فيلا حديثة البناء على شارعين، مسبح وحديقة ومجلس رجال ونساء منفصل، قريبة من الكورنيش وأهم المطاعم.', price: 4_800_000, area: 600, bd: 5, ba: 6, dist: 'al-shati', am: ['parking', 'pool', 'garden', 'maid-room', 'driver-room', 'central-ac', 'smart-home', 'sea-view'], age: 20 },
  { k: 'sale2', owner: 'khalid', t: 'sale', pt: 'villa', usage: 'residential', title: 'فيلا دورين وملحق في حي الروضة', desc: 'فيلا واسعة بتصميم عصري وتشطيب سوبر ديلوكس، مطبخ راكب وغرفة خادمة، في حي هادئ وقريب من المدارس.', price: 3_200_000, area: 420, bd: 6, ba: 5, dist: 'al-rawdah', am: ['parking', 'garden', 'maid-room', 'central-ac', 'kitchen', 'security'], age: 14 },
  { k: 'sale3', owner: 'noura', t: 'sale', pt: 'apartment', usage: 'residential', title: 'شقة فاخرة ٣ غرف في الحمراء', desc: 'شقة في الدور الثالث بمصعد ومواقف خاصة، تكييف مركزي وشرفة واسعة، قريبة من الخدمات.', price: 850_000, area: 165, bd: 3, ba: 3, dist: 'al-hamra', am: ['parking', 'elevator', 'central-ac', 'balcony', 'kitchen'], age: 11 },
  { k: 'sale4', owner: 'noura', t: 'sale', pt: 'apartment', usage: 'residential', title: 'شقة تمليك جديدة في السلامة', desc: 'شقة غرفتين وصالة بتشطيب حديث، عمارة بحراسة وكاميرات مراقبة، وموقع ممتاز على شارع رئيسي.', price: 620_000, area: 120, bd: 2, ba: 2, dist: 'al-salamah', am: ['elevator', 'security', 'parking', 'central-ac'], age: 8 },
  { k: 'sale5', owner: 'abdullah', t: 'sale', pt: 'villa', usage: 'residential', title: 'فيلا فخمة على البحر في أبحر الشمالية', desc: 'فيلا بواجهة بحرية مباشرة ومرسى خاص ومسبح، تصميم معماري مميز ومنزل ذكي بالكامل.', price: 6_500_000, area: 800, bd: 7, ba: 8, dist: 'obhur-north', am: ['parking', 'pool', 'garden', 'gym', 'security', 'maid-room', 'driver-room', 'smart-home', 'sea-view', 'central-ac'], age: 24 },
  { k: 'sale6', owner: 'sara', t: 'sale', pt: 'apartment', usage: 'residential', title: 'شقة عائلية مميزة في الأندلس', desc: 'شقة ٤ غرف نوم في برج سكني حديث، مطبخ راكب وإطلالة مفتوحة، وتشمل موقفين.', price: 480_000, area: 140, bd: 4, ba: 3, dist: 'al-andalus', am: ['elevator', 'parking', 'kitchen', 'balcony'], age: 5 },
  // ----- أرض (1) -----
  { k: 'land1', owner: 'mohammed', t: 'sale', pt: 'land', usage: 'residential', title: 'أرض سكنية زاوية في حي الرحاب', desc: 'أرض سكنية مخططة بزاوية شارعين (٢٠ و١٥ متر)، صك إلكتروني وخدمات متوفرة، مناسبة لبناء فيلا أو مشروع صغير.', price: 1_900_000, area: 900, dist: 'al-rehab', am: [], age: 18 },
  // ----- إيجار (4) -----
  { k: 'rent1', owner: 'abdullah', t: 'rent', pt: 'apartment', usage: 'residential', title: 'شقة للإيجار ٣ غرف في النهضة', desc: 'شقة نظيفة بدور ثاني، مطبخ راكب ومكيفات سبليت، قريبة من المدارس والمستشفيات.', price: 38_000, rentPeriod: 'yearly', area: 150, bd: 3, ba: 2, dist: 'al-nahda', am: ['parking', 'kitchen', 'elevator'], age: 9 },
  { k: 'rent2', owner: 'sara', t: 'rent', pt: 'apartment', usage: 'residential', title: 'شقة اقتصادية غرفتين في الزهراء', desc: 'شقة مناسبة للعائلات الصغيرة، تكييف راكب وموقف سيارة، وبجوارها أسواق ومواصلات.', price: 28_000, rentPeriod: 'yearly', area: 95, bd: 2, ba: 1, dist: 'al-zahraa', am: ['parking'], age: 6 },
  { k: 'rent3', owner: 'fahad', t: 'rent', pt: 'apartment', usage: 'residential', title: 'شقة مفروشة فاخرة قرب الكورنيش', desc: 'شقة مفروشة بالكامل بتأثيث عصري، إطلالة جزئية على البحر، نادي رياضي ومسبح مشتركان.', price: 75_000, rentPeriod: 'yearly', area: 130, bd: 2, ba: 2, dist: 'al-shati', am: ['furnished', 'gym', 'pool', 'elevator', 'security', 'sea-view', 'central-ac'], age: 3 },
  { k: 'rent4', owner: 'lina', t: 'rent', pt: 'apartment', usage: 'residential', title: 'شقة واسعة ٤ غرف في البساتين', desc: 'شقة جديدة لم تُسكن، تشطيب راقٍ وتكييف مركزي وغرفة خادمة، قريبة من الطرق السريعة.', price: 52_000, rentPeriod: 'yearly', area: 190, bd: 4, ba: 3, dist: 'al-basateen', am: ['central-ac', 'maid-room', 'parking', 'elevator', 'balcony'], age: 2 },
  // ----- استثمار (3) -----
  { k: 'inv1', owner: 'reem', t: 'invest', pt: 'building', usage: 'mixed', title: 'عمارة سكنية تجارية مؤجرة بالكامل في الشرفية', desc: 'عمارة ٦ أدوار مؤجرة بعقود سنوية، دخل شهري ثابت ومحلات تجارية في الواجهة. فرصة لتملّك حصة محاكاة.', price: 5_200_000, area: 750, dist: 'al-sharafeyah', am: ['elevator', 'parking', 'security'], inv: { target: 3_000_000, raised: 1_200_000, min: 2000, months: 24, ret: 9.5 }, age: 16 },
  { k: 'inv2', owner: 'reem', t: 'invest', pt: 'shop', usage: 'commercial', title: 'محلات تجارية على شارع رئيسي في الروضة', desc: 'مجمع محلات صغير بنسبة إشغال ١٠٠٪ ومستأجرين من علامات معروفة، عائد إيجاري مستقر.', price: 2_400_000, area: 320, dist: 'al-rawdah', am: ['parking', 'security'], inv: { target: 1_500_000, raised: 450_000, min: 1000, months: 12, ret: 7 }, age: 10 },
  { k: 'inv3', owner: 'mohammed', t: 'invest', pt: 'building', usage: 'commercial', title: 'مشروع أبراج مكتبية في حي الفيصلية', desc: 'مشروع مكاتب إدارية قيد التطوير بموقع استراتيجي، عائد مرتفع متوقع بعد التشغيل ومدة استثمار أطول.', price: 12_000_000, area: 2400, dist: 'al-faisaliyah', am: ['elevator', 'parking', 'security', 'central-ac', 'smart-home'], inv: { target: 6_000_000, raised: 3_100_000, min: 5000, months: 36, ret: 11 }, age: 22 },
];

// ---------- عروض إضافية مولَّدة (جدة فقط): بيع / إيجار / استثمار موزعة على الأحياء ----------
import { readdirSync, existsSync } from 'node:fs';
import { JEDDAH_DISTRICTS } from '../server/lib/constants.js';
const DN = Object.fromEntries(JEDDAH_DISTRICTS.map((d) => [d.id, d.ar]));
const OWN = ['khalid', 'sara', 'abdullah', 'noura', 'fahad', 'reem', 'mohammed', 'lina'];
// [نوع العرض, نوع العقار, الحي, المساحة, غرف, حمامات, السعر]
const X = [
  ['sale', 'villa', 'al-hamdaniyah', 450, 5, 5, 3_400_000], ['sale', 'villa', 'al-rehab', 380, 5, 4, 2_900_000], ['sale', 'villa', 'briman', 520, 6, 6, 3_900_000],
  ['sale', 'villa', 'al-yaqut', 400, 5, 5, 3_100_000], ['sale', 'villa', 'obhur-south', 700, 6, 7, 5_400_000], ['sale', 'villa', 'al-basateen', 360, 4, 4, 2_700_000],
  ['sale', 'apartment', 'al-rawdah', 160, 3, 3, 780_000], ['sale', 'apartment', 'al-nuzlah', 130, 3, 2, 560_000], ['sale', 'apartment', 'al-marwah', 145, 3, 3, 690_000],
  ['sale', 'apartment', 'al-fayhaa', 120, 2, 2, 520_000], ['sale', 'apartment', 'al-sulaymaniyah', 110, 2, 2, 470_000], ['sale', 'apartment', 'al-muhammadiyah', 175, 4, 3, 950_000],
  ['sale', 'land', 'al-quwayzah', 600, 0, 0, 1_100_000], ['sale', 'land', 'ghulail', 750, 0, 0, 980_000], ['sale', 'land', 'dhahban', 1000, 0, 0, 1_700_000],
  ['sale', 'land', 'prince-fawaz', 625, 0, 0, 1_650_000], ['sale', 'land', 'al-bawadi', 450, 0, 0, 1_050_000],
  ['rent', 'apartment', 'al-quwayzah', 110, 2, 2, 24_000], ['rent', 'apartment', 'al-marwah', 140, 3, 2, 42_000], ['rent', 'apartment', 'al-rawdah', 150, 3, 3, 48_000],
  ['rent', 'apartment', 'al-salamah', 120, 2, 2, 36_000], ['rent', 'apartment', 'al-andalus', 135, 3, 2, 41_000], ['rent', 'apartment', 'as-sawari', 105, 2, 2, 32_000],
  ['rent', 'apartment', 'al-hamra', 175, 3, 3, 58_000], ['rent', 'apartment', 'prince-sultan', 115, 2, 2, 34_000], ['rent', 'apartment', 'al-aziziyah', 90, 2, 1, 26_000],
  ['rent', 'villa', 'al-yaqut', 380, 5, 4, 110_000], ['rent', 'villa', 'briman', 450, 5, 5, 130_000], ['rent', 'villa', 'obhur-north', 600, 6, 6, 220_000],
  ['rent', 'shop', 'al-balad', 60, 0, 1, 70_000], ['rent', 'office', 'al-shati', 140, 0, 2, 95_000],
  ['invest', 'building', 'al-nahda', 520, 0, 0, 4_100_000], ['invest', 'building', 'al-ruwais', 600, 0, 0, 4_800_000], ['invest', 'shop', 'al-hamra', 200, 0, 0, 1_900_000],
  ['invest', 'building', 'al-salamah', 480, 0, 0, 3_600_000], ['invest', 'land', 'ar-rawabi', 1800, 0, 0, 3_300_000], ['invest', 'building', 'al-aziziyah', 420, 0, 0, 2_900_000],
];
X.forEach((r, n) => {
  const [t, pt, dist, area, bd, ba, price] = r;
  const d = DN[dist] || dist;
  const word = { villa: 'فيلا', apartment: 'شقة', land: 'أرض', building: 'عمارة', shop: 'محل تجاري', office: 'مكتب' }[pt];
  const verb = { sale: 'للبيع', rent: 'للإيجار', invest: 'استثمارية' }[t];
  const title = pt === 'land' ? `أرض ${t === 'invest' ? 'استثمارية' : 'سكنية'} ${area} م² في حي ${d}` : `${word} ${verb} في حي ${d}`;
  const desc = {
    villa: `فيلا بتشطيب حديث ومساحات واسعة ومجالس منفصلة، في حي ${d} بجدة وقريبة من الخدمات والطرق الرئيسية.`,
    apartment: `شقة بتشطيب نظيف وتوزيع عملي، في حي ${d} بجدة، قريبة من المدارس والأسواق والمواصلات.`,
    land: `أرض بصك إلكتروني في حي ${d} بجدة، شوارع مفتوحة وخدمات قريبة، مناسبة للبناء أو الاستثمار.`,
    building: `عمارة مؤجرة بدخل ثابت في حي ${d} بجدة، فرصة لتملّك حصة محاكاة وتتبّع العائد.`,
    shop: `محل بواجهة مميزة وحركة جيدة في حي ${d} بجدة، مناسب لأنشطة تجارية متعددة.`,
    office: `مكتب بتشطيب إداري وإطلالة جيدة في حي ${d} بجدة، مواقف ومصعد وخدمات قريبة.`,
  }[pt];
  const o = { k: `x${n}`, owner: OWN[n % OWN.length], t, pt, usage: ['land', 'villa', 'apartment'].includes(pt) ? 'residential' : 'commercial', title, desc, price, area, dist,
    am: pt === 'land' ? [] : ['parking', 'central-ac', ...(pt === 'apartment' || pt === 'building' ? ['elevator'] : []), ...(pt === 'villa' ? ['garden', 'maid-room'] : [])], age: 1 + ((n * 3) % 27) };
  if (bd) { o.bd = bd; o.ba = ba; } else if (ba) o.ba = ba;
  if (t === 'rent') o.rentPeriod = 'yearly';
  if (t === 'invest') o.inv = { target: Math.round(price * 0.55 / 1000) * 1000, raised: Math.round(price * 0.55 * (0.15 + (n % 5) * 0.12) / 1000) * 1000, min: [1000, 2000, 5000][n % 3], months: [12, 18, 24, 36][n % 4], ret: [7, 8.5, 9.5, 10][n % 4] };
  L.push(o);
});

// صور العروض: ضع صورك الحقيقية في  public/img/listings/<الحي أو نوع العقار>/  (jpg/webp/png)
// الأولوية: مجلد الحي ← مجلد نوع العقار ← صور كورنيش جدة الافتراضية.
// كل صورة تُستخدم لعرض واحد فقط (بدون تكرار). عند نفاد صور النوع تُستخدم صورة كورنيش جدة الافتراضية.
const USED = new Set();
const FIXED = { rent3: 'apartment/07.jpg', sale1: 'villa/04.jpg', sale5: 'villa/02.jpg', sale2: 'villa/05.jpg' }; // ربط يدوي: إطلالة بحرية، فلل فخمة
function pickImages(l, i) {
  const root = new URL('../public/img/listings/', import.meta.url);
  const list = (name) => {
    const dir = new URL(`${name}/`, root);
    return existsSync(dir) ? readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => `${name}/${f}`) : [];
  };
  const pick = FIXED[l.k] ?? [...list(l.dist), ...list(l.pt)].find((f) => !USED.has(f));
  if (pick) { USED.add(pick); return [`/img/listings/${pick}`]; }
  return [JEDDAH_FALLBACK[i % JEDDAH_FALLBACK.length]];
}
const JEDDAH_FALLBACK = ['corniche-1', 'corniche-2', 'corniche-3'].map((n) => `/img/seed/${n}.jpg`);

const P = {}; // key → صف العقار
for (const [i, l] of L.entries()) {
  const [row] = await db
    .insert(properties)
    .values({
      ownerId: U[l.owner].id, listingType: l.t, propertyType: l.pt, usage: l.usage, title: l.title, description: l.desc,
      price: l.price, rentPeriod: l.rentPeriod ?? null, areaSqm: l.area ?? null, bedrooms: l.bd ?? null, bathrooms: l.ba ?? null,
      district: l.dist, addressNote: 'بالقرب من الطريق الرئيسي', amenities: l.am, createdAt: ago(l.age * DAY), updatedAt: ago(l.age * DAY),
    })
    .returning();
  P[l.k] = row;
  await db.insert(propertyMedia).values(pickImages(l, i).map((url, n) => ({ propertyId: row.id, url, sortOrder: n })));
  if (l.inv) await db.insert(investments).values({ propertyId: row.id, targetAmount: l.inv.target, raisedAmount: l.inv.raised, minInvestment: l.inv.min, durationMonths: l.inv.months, expectedReturnPct: l.inv.ret });
}
console.log(`🏠 أُنشئ ${L.length} عقاراً`);

// ---------------- 3) المشاهدات والمفضلة (ثابتة وليست عشوائية فعلاً) ----------------
const allUsers = Object.values(U);
const viewRows = [];
for (const [i, l] of L.entries()) {
  const popularity = 2 + (i % 5) * 2; // عقارات أكثر شعبية من غيرها
  const viewers = allUsers.filter((x) => x.id !== U[l.owner].id);
  for (let day = 29; day >= 0; day--) {
    const n = Math.floor(rand() * popularity * (day < 10 ? 1.6 : 1)); // الاهتمام يزداد حديثاً
    for (let j = 0; j < n; j++) {
      const when = new Date(Date.now() - day * DAY - Math.floor(rand() * 20 * HOUR));
      if (when > new Date()) continue;
      viewRows.push({ propertyId: P[l.k].id, viewerId: rand() < 0.5 ? null : viewers[Math.floor(rand() * viewers.length)].id, createdAt: when });
    }
  }
}
for (let i = 0; i < viewRows.length; i += 200) await db.insert(propertyViews).values(viewRows.slice(i, i + 200));

const favRows = [];
for (const [ui, u] of allUsers.entries()) {
  const others = L.filter((l) => U[l.owner].id !== u.id);
  for (let j = 0; j < 3; j++) {
    const l = others[(ui * 3 + j * 4) % others.length];
    favRows.push({ userId: u.id, propertyId: P[l.k].id });
  }
}
await db.insert(favorites).values(favRows).onConflictDoNothing();
console.log(`👁️  ${viewRows.length} مشاهدة، ❤️ ${favRows.length} مفضلة`);

// ---------------- 4) المحادثات والرسائل ----------------
// رسائل نصية بأوقات ماضية، ثم تُنشأ الصفقات (رسائل النظام تأتي بعدها بوقتها الحقيقي)
async function conversation(propKey, initiatorKey, script) {
  const prop = P[propKey];
  const [conv] = await db.insert(conversations).values({ propertyId: prop.id, ownerId: prop.ownerId, initiatorId: U[initiatorKey].id, createdAt: ago(3 * DAY) }).returning();
  const ownerKey = Object.keys(U).find((k) => U[k].id === prop.ownerId);
  const rows = script.map(([who, body, minsAgo], idx) => ({
    conversationId: conv.id, senderId: U[who === 'o' ? ownerKey : initiatorKey].id, body, kind: 'text',
    createdAt: new Date(Date.now() - minsAgo * 60_000), readAt: idx < script.length - 1 ? new Date(Date.now() - (minsAgo - 1) * 60_000) : null,
  }));
  await db.insert(messages).values(rows);
  return conv;
}

const c1 = await conversation('sale2', 'sara', [
  ['i', 'السلام عليكم، الفيلا في الروضة ما زالت متاحة؟', 2800],
  ['o', 'وعليكم السلام ورحمة الله، نعم متاحة والحمد لله.', 2780],
  ['i', 'ممكن أعرف عمر البناء وهل فيه ملحق خارجي؟', 2760],
  ['o', 'البناء عمره سنتين تقريباً، وفيه ملحق خارجي غرفتين مع حمام.', 2740],
  ['i', 'ممتاز، السعر قابل للتفاوض؟', 180],
  ['o', 'نتفاهم إن شاء الله، اقترحي سعراً مناسباً من خلال الصفقة.', 170],
]);
const c2 = await conversation('rent1', 'khalid', [
  ['i', 'مساء الخير، أبغى أستأجر الشقة في النهضة لمدة سنة.', 2000],
  ['o', 'أهلاً أستاذ خالد، الشقة جاهزة للسكن مباشرة.', 1980],
  ['i', 'هل الإيجار شامل الكهرباء والماء؟', 1960],
  ['o', 'لا، الفواتير على المستأجر. والسعر ٣٨ ألف سنوياً.', 1940],
  ['i', 'تمام، أرسلت لك اقتراح الصفقة بنفس المبلغ لمدة ١٢ شهراً.', 1900],
]);
const c3 = await conversation('sale3', 'fahad', [
  ['i', 'السلام عليكم، الشقة في الحمراء فيها موقف خاص؟', 1500],
  ['o', 'نعم، موقفان في القبو ومصعد مباشر.', 1480],
  ['i', 'عرضي ٨٢٠ ألف كاش، وأنهي الإجراءات هذا الأسبوع.', 1400],
  ['o', 'موافقة، أرسل الصفقة وأوافق عليها مباشرة.', 1380],
  ['i', 'تم، وقّعت العقد وجاهز للتحويل.', 400],
]);
const c4 = await conversation('inv1', 'khalid', [
  ['i', 'مرحباً، أود الاستثمار في العمارة بالشرفية بمبلغ ١٠ آلاف.', 6000],
  ['o', 'أهلاً بك، الحد الأدنى ٢٠٠٠ ريال، ومبلغك مقبول.', 5980],
  ['i', 'ما نسبة الإشغال الحالية؟', 5960],
  ['o', 'الإشغال ١٠٠٪ والعقود سنوية، وسأرسل لك التفاصيل في العقد.', 5940],
]);
console.log('💬 4 محادثات');

// ---------------- 5) الصفقات (بنفس دوال النظام الحقيقي) ----------------
const IP = '127.0.0.1';

// أ) تفاوض: سارة تقترح على خالد
await D.createDeal(U.sara, { conversationId: c1.id, agreedPrice: 3_050_000 });

// ب) بانتظار التوقيع: خالد يقترح إيجاراً وعبدالله يقبل (يُنشأ العقد)
const d2 = await D.createDeal(U.khalid, { conversationId: c2.id, agreedPrice: 38_000, durationMonths: 12 });
await D.acceptDeal(U.abdullah, d2.id);

// ج) بانتظار التحويل: فهد يقترح، نورة تقبل، الطرفان يوقّعان
const d3 = await D.createDeal(U.fahad, { conversationId: c3.id, agreedPrice: 820_000 });
await D.acceptDeal(U.noura, d3.id);
await D.signDeal(U.noura, d3.id, U.noura.name, IP);
await D.signDeal(U.fahad, d3.id, U.fahad.name, IP);

// د) مكتملة مع تقييمين: خالد يستثمر ١٠ آلاف في فرصة ريم
const d4 = await D.createDeal(U.khalid, { conversationId: c4.id, agreedPrice: 10_000 });
await D.acceptDeal(U.reem, d4.id);
await D.signDeal(U.khalid, d4.id, U.khalid.name, IP);
await D.signDeal(U.reem, d4.id, U.reem.name, IP);
await D.confirmTransfer(U.khalid, d4.id);
await D.confirmReceipt(U.reem, d4.id);
await D.reviewDeal(U.khalid, d4.id, { rating: 5, comment: 'فرصة واضحة وتعامل راقٍ وسريع في التأكيد.' });
await D.reviewDeal(U.reem, d4.id, { rating: 5, comment: 'مستثمر ملتزم وتحويل في الوقت المحدد.' });
console.log('🤝 4 صفقات: تفاوض، بانتظار التوقيع، بانتظار التحويل، مكتملة');

// ---------------- ملخص ----------------
console.log('\n✅ تمت تعبئة البيانات التجريبية. حسابات الدخول (كلمة المرور: ' + PASSWORD + '):\n');
for (const p of PEOPLE) console.log(`   ${p.name.padEnd(16)} ${p.key}@${DOMAIN}`);
console.log('\n   خالد: صاحب عقارات + طرف في 3 صفقات  |  عبدالله: ينتظر توقيعه  |  نورة: بانتظار تحويل فهد\n');
process.exit(0);
