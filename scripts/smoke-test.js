// اختبار شامل للسيرفر: node scripts/smoke-test.js
// - إذا كان السيرفر يعمل على SMOKE_URL (الافتراضي http://localhost:3100) يستخدمه كما هو.
// - وإلا يشغّل سيرفراً مؤقتاً بقاعدة بيانات فارغة (data/smoke.db) ثم يحذفها عند الانتهاء.
import { spawn, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const BASE = process.env.SMOKE_URL ?? 'http://localhost:3100';
const RUN = randomBytes(3).toString('hex'); // يجعل البريد فريداً في كل تشغيل

// ---------------- أدوات الاختبار ----------------
let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`, extra !== undefined ? `\n      -> ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''); }
}
const section = (t) => console.log(`\n=== ${t} ===`);

class Client {
  constructor(label) { this.label = label; this.cookies = new Map(); }
  async req(method, path, { json, form, origin = BASE, headers = {} } = {}) {
    const h = { ...headers };
    if (origin) h.origin = origin;
    if (this.cookies.size) h.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    let body;
    if (json !== undefined) { h['content-type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) body = form;
    const res = await fetch(BASE + path, { method, headers: h, body, redirect: 'manual' });
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      const [pair] = sc.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim(), v = pair.slice(i + 1).trim();
      if (!v || /max-age=0/i.test(sc)) this.cookies.delete(k); else this.cookies.set(k, v);
    }
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
  }
  get(p, o) { return this.req('GET', p, o); }
  post(p, json, o) { return this.req('POST', p, { json: json ?? {}, ...o }); }
  patch(p, json, o) { return this.req('PATCH', p, { json, ...o }); }
  del(p, o) { return this.req('DELETE', p, o); }
}
const code = (r) => r.data?.error?.code;

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

function formWith(buf, type, name = 'x.png') {
  const f = new FormData();
  f.append('file', new Blob([buf], { type }), name);
  return f;
}

// ---------------- تشغيل سيرفر مؤقت عند الحاجة ----------------
let child = null;
let cleanup = () => {};
async function alive() {
  try { return (await fetch(BASE + '/api/health')).ok; } catch { return false; }
}
if (!(await alive())) {
  const u = new URL(BASE);
  const env = {
    ...process.env,
    PORT: u.port || '3100',
    BETTER_AUTH_URL: BASE,
    DATABASE_URL: 'file:./data/smoke.db',
    UPLOAD_DIR: './data/smoke-uploads',
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || randomBytes(32).toString('hex'),
    GEMINI_API_KEY: '', // نختبر مسار FAQ
  };
  cleanup = () => {
    child?.kill();
    for (const f of ['data/smoke.db', 'data/smoke.db-wal', 'data/smoke.db-shm', 'data/smoke.db-journal']) rmSync(f, { force: true });
    rmSync('data/smoke-uploads', { recursive: true, force: true });
  };
  cleanup();
  const r = spawnSync('npm', ['run', 'db:push'], { env, shell: true, stdio: 'ignore' });
  if (r.status !== 0) { console.error('فشل db:push'); process.exit(1); }
  child = spawn(process.execPath, ['server/server.js'], { env, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await alive()); i++) await new Promise((r) => setTimeout(r, 200));
  if (!(await alive())) { console.error('السيرفر لم يبدأ'); cleanup(); process.exit(1); }
}

try {
  await main();
} catch (e) {
  fail++;
  console.log('FAIL  استثناء غير متوقع', e);
}
cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// ---------------- الاختبارات ----------------
async function main() {
  const anon = new Client('anon');
  const A = new Client('A'); // صاحب العقارات
  const B = new Client('B'); // المشتري/المستأجر/المستثمر
  const C = new Client('C'); // طرف ثالث

  section('عام والتحقق من الصلاحيات');
  let r = await anon.get('/api/health');
  check('health', r.status === 200 && r.data.ok);
  r = await anon.get('/api/meta');
  check('meta فيه amenities (14) و dealStatuses (8) و ticketStatuses', r.data.amenities?.length === 14 && r.data.dealStatuses?.length === 8 && r.data.ticketStatuses?.length === 4, Object.keys(r.data));
  r = await anon.get('/api/stats');
  check('stats عام', r.status === 200 && ['activeListings', 'completedDeals', 'members', 'districts'].every((k) => typeof r.data[k] === 'number'), r.data);
  for (const [m, p] of [['GET', '/api/me'], ['GET', '/api/deals'], ['GET', '/api/conversations'], ['GET', '/api/dashboard'], ['GET', '/api/tickets'], ['GET', '/api/properties/mine'], ['POST', '/api/properties'], ['POST', '/api/uploads'], ['POST', '/api/deals'], ['POST', '/api/conversations']]) {
    r = await anon.req(m, p, { json: m === 'POST' ? {} : undefined });
    check(`401 بدون تسجيل: ${m} ${p}`, r.status === 401 && code(r) === 'UNAUTHENTICATED', r.status);
  }
  r = await anon.get('/api/properties');
  check('قائمة العقارات عامة', r.status === 200 && Array.isArray(r.data.items));
  r = await anon.req('POST', '/api/auth/sign-in/email', { json: { email: 'a@b.co', password: 'x12345678' }, origin: 'http://evil.example.com' });
  check('Origin غريب على تسجيل الدخول → 403', r.status === 403, r.status);
  r = await anon.post('/api/conversations', { propertyId: 'x' }, { origin: 'http://evil.example.com' });
  check('Origin غريب على مسار ضامن → 403', r.status === 403 && code(r) === 'FORBIDDEN_ORIGIN', r.data);

  section('التسجيل');
  const users = [[A, 'خالد العتيبي', `a-${RUN}@test.dev`], [B, 'سارة الغامدي', `b-${RUN}@test.dev`], [C, 'نورة الزهراني', `c-${RUN}@test.dev`]];
  for (const [cl, name, email] of users) {
    r = await cl.post('/api/auth/sign-up/email', { name, email, password: 'Test@12345' });
    check(`تسجيل ${cl.label}`, r.status === 200 && r.data.user?.id, r.data);
    cl.id = r.data.user?.id;
  }
  r = await A.get('/api/me');
  check('GET /api/me فيه profile.ratingAvg/ratingCount و stats', r.status === 200 && r.data.profile?.ratingCount === 0 && r.data.stats?.completedDeals === 0 && r.data.stats?.favorites === 0, r.data);
  r = await A.patch('/api/me', { phone: '0500000001', nationalAddress: 'abcd1234', bio: 'مالك' });
  check('تحديث الملف (جوال + عنوان وطني)', r.status === 200, r.data);
  await B.patch('/api/me', { phone: '0500000002', nationalAddress: 'WXYZ9876' });
  await C.patch('/api/me', { phone: '0500000003', nationalAddress: 'QQQQ1111' });
  r = await A.patch('/api/me', { avatarUrl: 'http://evil.com/x.png' });
  check('avatarUrl خارجي مرفوض', r.status === 400, r.data);
  r = await A.patch('/api/me', { avatarUrl: '/uploads/../../etc/passwd' });
  check('avatarUrl فيه .. مرفوض', r.status === 400);

  section('رفع الصور');
  r = await anon.req('POST', '/api/uploads', { form: formWith(PNG, 'image/png') });
  check('رفع بدون دخول → 401', r.status === 401);
  r = await A.req('POST', '/api/uploads', { form: formWith(PNG, 'image/png') });
  check('رفع PNG → 201', r.status === 201 && /^\/uploads\/[0-9a-f-]{36}\.png$/.test(r.data.url), r.data);
  const png1 = r.data.url;
  r = await A.req('POST', '/api/uploads', { form: formWith(JPG, 'image/jpeg', 'x.jpg') });
  check('رفع JPEG → 201 بامتداد jpg', r.status === 201 && r.data.url.endsWith('.jpg'), r.data);
  const jpg1 = r.data.url;
  // المتصفح قد يرسل image/png لملف JPEG: نعتمد على البايتات الفعلية
  r = await A.req('POST', '/api/uploads', { form: formWith(JPG, 'image/png') });
  check('الامتداد يُستنتج من البايتات لا من النوع المرسل', r.status === 201 && r.data.url.endsWith('.jpg'), r.data);
  r = await anon.get(png1);
  check('تقديم الصورة من /uploads مع كاش سنة', r.status === 200 && /immutable/.test(r.headers.get('cache-control')) && r.headers.get('content-type') === 'image/png', [r.status, r.headers.get('cache-control')]);
  r = await A.req('POST', '/api/uploads', { form: formWith(Buffer.from('<?php echo 1; ?>'), 'image/png', 'evil.png') });
  check('ملف مزيّف بنوع image/png → 400 BAD_FILE', r.status === 400 && code(r) === 'BAD_FILE', r.data);
  r = await A.req('POST', '/api/uploads', { form: formWith(PNG, 'text/plain', 'x.txt') });
  check('نوع غير مسموح → 400', r.status === 400 && code(r) === 'BAD_FILE');
  r = await A.req('POST', '/api/uploads', { json: {} });
  check('بدون ملف → 400', r.status === 400 && code(r) === 'BAD_FILE', r.data);
  r = await A.req('POST', '/api/uploads', { form: formWith(Buffer.concat([PNG, Buffer.alloc(5.5 * 1024 * 1024)]), 'image/png') });
  check('5.5MB → 413 TOO_LARGE', r.status === 413 && code(r) === 'TOO_LARGE', r.status);
  r = await A.req('POST', '/api/uploads', { form: formWith(Buffer.concat([PNG, Buffer.alloc(6.5 * 1024 * 1024)]), 'image/png') });
  check('6.5MB → 413 TOO_LARGE (حد الطلب)', r.status === 413 && code(r) === 'TOO_LARGE', r.status);
  r = await anon.get('/uploads/not-a-real-file.png');
  check('ملف مرفوع غير موجود → 404', r.status === 404);
  r = await anon.get('/uploads/..%2f..%2fpackage.json');
  check('محاولة الخروج من مجلد الرفع → 404', r.status === 404);

  section('العقارات');
  const saleBody = { listingType: 'sale', propertyType: 'villa', usage: 'residential', title: 'فيلا فاخرة في الشاطئ', description: 'فيلا جديدة', price: 2_500_000, areaSqm: 450, bedrooms: 5, bathrooms: 4, district: 'al-shati', images: [png1, jpg1], amenities: ['parking', 'pool'] };
  r = await A.post('/api/properties', { ...saleBody, images: ['http://evil.com/a.png'] });
  check('صورة خارجية مرفوضة', r.status === 400, r.data);
  r = await A.post('/api/properties', { ...saleBody, images: ['/uploads/../secret.png'] });
  check('صورة فيها .. مرفوضة', r.status === 400);
  r = await A.post('/api/properties', { ...saleBody, images: Array(11).fill(png1) });
  check('أكثر من 10 صور مرفوض', r.status === 400);
  r = await A.post('/api/properties', { ...saleBody, amenities: ['jetpack'] });
  check('مرفق غير معروف مرفوض', r.status === 400);
  r = await A.post('/api/properties', saleBody);
  check('إضافة عقار بيع مع صور ومرافق', r.status === 201 && r.data.id, r.data);
  const PS = r.data.id;
  r = await A.post('/api/properties', { listingType: 'rent', propertyType: 'apartment', usage: 'residential', title: 'شقة للإيجار بالحمراء', price: 45_000, rentPeriod: 'yearly', areaSqm: 130, bedrooms: 3, district: 'al-hamra', amenities: ['elevator', 'central-ac'] });
  const PR = r.data.id;
  r = await A.post('/api/properties', { listingType: 'invest', propertyType: 'building', usage: 'commercial', title: 'عمارة استثمارية بالروضة', price: 4_000_000, district: 'al-rawdah', investment: { targetAmount: 1_000_000, minInvestment: 5000, durationMonths: 24, expectedReturnPct: 8.5 } });
  const PI = r.data.id;
  check('إضافة إيجار واستثمار', !!PR && !!PI, r.data);

  r = await B.get('/api/properties?pageSize=50');
  const sale = r.data.items?.find((x) => x.id === PS);
  check('القائمة: cover/mediaCount/amenities/isFavorite=false', sale?.cover === png1 && sale.mediaCount === 2 && sale.amenities.includes('pool') && sale.isFavorite === false, sale);
  r = await anon.get('/api/properties?pageSize=50');
  check('القائمة للزائر: بدون isFavorite، بدون viewsCount', !('isFavorite' in r.data.items[0]) && !('viewsCount' in r.data.items[0]));
  check('القائمة لا تسرّب بريد/جوال', !JSON.stringify(r.data).includes('@test.dev') && !JSON.stringify(r.data).includes('+9665'));
  r = await anon.get('/api/properties?amenity=pool');
  check('فلتر amenity=pool', r.data.items.length === 1 && r.data.items[0].id === PS, r.data.total);
  r = await anon.get('/api/properties?amenity=gym');
  check('فلتر amenity=gym فارغ', r.data.items.length === 0);
  r = await anon.get('/api/properties?minArea=400&maxArea=500');
  check('فلتر المساحة', r.data.items.length === 1 && r.data.items[0].id === PS);
  r = await anon.get('/api/properties?maxArea=100');
  check('فلتر maxArea', r.data.items.length === 0);
  r = await anon.get('/api/properties?amenity=bad');
  check('amenity غير معروف → 400', r.status === 400);
  r = await anon.get('/api/properties?listingType=rent&district=al-hamra');
  check('فلتر نوع + حي', r.data.items.length === 1 && r.data.items[0].id === PR);

  r = await B.get(`/api/properties/${PS}`);
  check('تفاصيل: media و amenities و owner', r.status === 200 && r.data.media.length === 2 && r.data.owner?.firstName === 'خالد' && r.data.owner.verified && typeof r.data.owner.ratingAvg === 'number' && r.data.owner.memberSince && r.data.isFavorite === false, r.data.owner);
  const detailStr = JSON.stringify(r.data);
  check('التفاصيل لا تسرّب اسم العائلة/البريد/الجوال', !detailStr.includes('العتيبي') && !detailStr.includes('@test.dev') && !detailStr.includes('+9665'));
  await B.get(`/api/properties/${PS}`);
  await anon.get(`/api/properties/${PS}`);
  r = await A.get(`/api/properties/${PS}`); // المالك: لا تُحتسب
  r = await A.get('/api/properties/mine');
  const mineSale = r.data.items.find((x) => x.id === PS);
  check('viewsCount في /mine = 3 (المالك لا يُحتسب)', mineSale?.viewsCount === 3, mineSale?.viewsCount);
  r = await anon.get('/api/properties/nope');
  check('عقار غير موجود → 404', r.status === 404);

  r = await B.post(`/api/properties/${PS}/favorite`);
  check('إضافة للمفضلة', r.status === 201);
  r = await B.get('/api/properties/favorites');
  check('قائمة المفضلة فيها cover و isFavorite', r.data.items.length === 1 && r.data.items[0].cover && r.data.items[0].isFavorite === true, r.data);
  r = await B.get(`/api/properties/${PS}`);
  check('التفاصيل isFavorite=true', r.data.isFavorite === true);
  r = await B.get('/api/me');
  check('stats.favorites = 1', r.data.stats.favorites === 1);

  r = await B.patch(`/api/properties/${PS}`, { price: 1 });
  check('تعديل عقار غيرك → 403', r.status === 403);
  r = await A.patch(`/api/properties/${PS}`, { bedrooms: 6, amenities: ['gym', 'garden'], images: [jpg1], addressNote: 'قرب الكورنيش', district: 'al-rawdah' });
  check('PATCH عقار (amenities/images/bedrooms/..)', r.status === 200, r.data);
  r = await anon.get(`/api/properties/${PS}`);
  check('التعديل ظهر: صورة واحدة + مرافق جديدة', r.data.media.length === 1 && r.data.media[0] === jpg1 && r.data.amenities.join() === 'gym,garden' && r.data.bedrooms === 6 && r.data.district === 'al-rawdah', r.data);
  await A.patch(`/api/properties/${PS}`, { images: [png1, jpg1], amenities: ['parking', 'pool'] });
  r = await B.del(`/api/properties/${PS}/favorite`);
  check('إزالة من المفضلة', r.status === 200);

  section('المحادثات');
  r = await B.post('/api/conversations', { propertyId: PS });
  check('فتح محادثة جديدة → 201', r.status === 201 && r.data.id, r.data);
  const CV = r.data.id;
  r = await B.post('/api/conversations', { propertyId: PS });
  check('نفس المحادثة → 200 وبنفس المعرّف', r.status === 200 && r.data.id === CV);
  r = await A.post('/api/conversations', { propertyId: PS });
  check('مراسلة عقارك → 400', r.status === 400);
  r = await B.post('/api/conversations', { propertyId: 'nope' });
  check('عقار غير موجود → 404', r.status === 404);
  r = await B.post(`/api/conversations/${CV}/messages`, { body: '   ' });
  check('رسالة فارغة → 400', r.status === 400);
  r = await B.post(`/api/conversations/${CV}/messages`, { body: 'x'.repeat(1001) });
  check('رسالة > 1000 → 400', r.status === 400);
  r = await B.post(`/api/conversations/${CV}/messages`, { body: '  السلام عليكم، هل العقار متاح؟  ' });
  check('إرسال رسالة (تُقصّ المسافات)', r.status === 201 && r.data.body === 'السلام عليكم، هل العقار متاح؟' && r.data.kind === 'text', r.data);
  r = await C.post(`/api/conversations/${CV}/messages`, { body: 'تدخل' });
  check('غير مشارك يرسل → 403', r.status === 403);
  r = await C.get(`/api/conversations/${CV}/messages`);
  check('غير مشارك يقرأ → 403', r.status === 403);
  r = await C.get(`/api/conversations/${CV}`);
  check('غير مشارك يفتح المحادثة → 403', r.status === 403);
  r = await A.get('/api/conversations/nope');
  check('محادثة غير موجودة → 404', r.status === 404);
  r = await A.get('/api/conversations');
  const li = r.data.items[0];
  check('قائمة المحادثات: unread=1، other باسم أول فقط، property.cover', r.data.items.length === 1 && li.unread === 1 && li.other.name === 'سارة' && li.property.cover && li.lastMessage?.kind === 'text' && li.deal === null, li);
  r = await A.get(`/api/conversations/${CV}`);
  check('تفاصيل المحادثة: meId، property.district', r.data.meId === A.id && r.data.property.district && r.data.other.id === B.id, r.data);
  r = await A.get(`/api/conversations/${CV}/messages`);
  check('جلب الرسائل', r.data.items.length === 1);
  const t1 = r.data.items.at(-1).createdAt;
  r = await A.get('/api/conversations');
  check('بعد القراءة unread=0', r.data.items[0].unread === 0);
  await new Promise((r) => setTimeout(r, 15));
  await A.post(`/api/conversations/${CV}/messages`, { body: 'أهلاً، نعم متاح' });
  r = await B.get(`/api/conversations/${CV}/messages?after=${encodeURIComponent(t1)}`);
  check('after (ISO) يرجع الجديد فقط', r.data.items.length === 1 && r.data.items[0].body === 'أهلاً، نعم متاح', r.data);
  r = await B.get(`/api/conversations/${CV}/messages?after=${new Date(t1).getTime()}`);
  check('after (ms) يعمل', r.data.items.length === 1);
  r = await B.get(`/api/conversations/${CV}/messages?after=garbage`);
  check('after غير صالح → 400', r.status === 400);

  section('الصفقة الكاملة (بيع)');
  r = await C.post('/api/deals', { conversationId: CV, agreedPrice: 100 });
  check('غير مشارك ينشئ صفقة → 403', r.status === 403);
  r = await B.post('/api/deals', { conversationId: CV, agreedPrice: -5 });
  check('سعر سالب → 400', r.status === 400);
  r = await B.post('/api/deals', { conversationId: CV, agreedPrice: 2_300_000 });
  check('اقتراح صفقة → 201 negotiating', r.status === 201 && r.data.status === 'negotiating', r.data);
  const DS = r.data.id;
  r = await B.post('/api/deals', { conversationId: CV, agreedPrice: 2_000_000 });
  check('صفقة ثانية في نفس المحادثة → 409', r.status === 409 && code(r) === 'DEAL_EXISTS', r.data);
  r = await A.get(`/api/deals/${DS}`);
  check('المالك: nextAction=accept، الجوال مخفي، الاسم الأول', r.data.nextAction === 'accept' && r.data.counterparty.phone === null && r.data.counterparty.name === 'سارة' && r.data.contract === null && r.data.role === 'owner' && r.data.payerIsMe === false, r.data);
  r = await B.get(`/api/deals/${DS}`);
  check('المقترح: nextAction=wait، payerIsMe', r.data.nextAction === 'wait' && r.data.payerIsMe === true && r.data.role === 'counterparty');
  r = await C.get(`/api/deals/${DS}`);
  check('غير طرف يقرأ الصفقة → 403', r.status === 403);
  r = await B.post(`/api/deals/${DS}/accept`);
  check('المقترح يقبل صفقته → 403', r.status === 403);
  r = await C.post(`/api/deals/${DS}/accept`);
  check('غير طرف يقبل → 403', r.status === 403);
  r = await B.post(`/api/deals/${DS}/sign`, { signedName: 'سارة الغامدي' });
  check('توقيع قبل القبول → 409', r.status === 409);
  r = await A.get('/api/conversations');
  check('المحادثة تعرض الصفقة (negotiating) والاسم الأول', r.data.items[0].deal?.status === 'negotiating' && r.data.items[0].other.name === 'سارة', r.data.items[0]);

  r = await A.post(`/api/deals/${DS}/accept`);
  check('قبول → awaiting_signatures + رقم عقد', r.status === 200 && r.data.status === 'awaiting_signatures' && /^DH-\d{4}-\d{6}$/.test(r.data.contractNumber), r.data);
  const contractNo = r.data.contractNumber;
  r = await A.post(`/api/deals/${DS}/accept`);
  check('قبول مرتين → 409', r.status === 409);
  r = await anon.get(`/api/properties/${PS}`);
  check('العقار صار reserved', r.data.status === 'reserved');
  r = await B.post('/api/conversations', { propertyId: PS });
  check('محادثة جديدة على عقار محجوز → 404', r.status === 404);
  r = await B.get(`/api/deals/${DS}`);
  const d = r.data;
  check('تفاصيل الصفقة: عقد، snapshot، ختم، الجوال ظاهر', d.contract?.number === contractNo && d.contract.snapshot.owner.nationalAddress === 'ABCD1234' && d.contract.snapshot.counterparty.phone === '+966500000002' && d.contract.snapshot.templateType === 'sale' && /^[0-9a-f]{64}$/.test(d.contract.sealHash) && d.owner.phone === '+966500000001' && d.owner.name === 'خالد العتيبي' && d.nextAction === 'sign', d.contract);
  check('الـ snapshot يحوي بيانات العقار والسعر', d.contract.snapshot.number === contractNo && d.contract.snapshot.price === 2_300_000 && d.contract.snapshot.property.id === PS && d.contract.snapshot.property.areaSqm === 450);
  r = await A.get('/api/conversations');
  check('بعد الاتفاق يظهر الاسم الكامل', r.data.items[0].other.name === 'سارة الغامدي' && r.data.items[0].deal.status === 'awaiting_signatures', r.data.items[0]);
  r = await A.get(`/api/conversations/${CV}/messages`);
  check('رسائل النظام ظهرت (kind=system)', r.data.items.filter((m) => m.kind === 'system').length >= 2, r.data.items.map((m) => m.kind));

  r = await A.post(`/api/deals/${DS}/sign`, { signedName: 'خالد المختلف' });
  check('توقيع باسم مختلف → 400 NAME_MISMATCH', r.status === 400 && code(r) === 'NAME_MISMATCH', r.data);
  r = await B.post(`/api/deals/${DS}/sign`, { signedName: '  سارة   الغامدي ' });
  check('توقيع (مسافات زائدة مقبولة)', r.status === 200 && r.data.allSigned === false, r.data);
  r = await B.post(`/api/deals/${DS}/sign`, { signedName: 'سارة الغامدي' });
  check('توقيع ثانٍ لنفس الشخص → 409', r.status === 409 && code(r) === 'ALREADY_SIGNED', r.data);
  r = await B.get(`/api/deals/${DS}`);
  check('nextAction=wait_signature بعد توقيعي', r.data.nextAction === 'wait_signature');
  r = await B.post(`/api/deals/${DS}/confirm-transfer`);
  check('تحويل قبل اكتمال التوقيع → 409', r.status === 409);
  r = await A.post(`/api/deals/${DS}/sign`, { signedName: 'خالد العتيبي' });
  check('توقيع الثاني → allSigned', r.status === 200 && r.data.allSigned === true, r.data);
  r = await A.get(`/api/deals/${DS}`);
  check('العقد signed + توقيعان + status=awaiting_transfer', r.data.status === 'awaiting_transfer' && r.data.contract.status === 'signed' && r.data.contract.signedAt && r.data.contract.signatures.length === 2 && r.data.nextAction === 'wait_transfer', r.data.contract?.signatures);
  r = await A.post(`/api/deals/${DS}/confirm-transfer`);
  check('المستلم يؤكد التحويل → 403', r.status === 403);
  r = await B.post(`/api/deals/${DS}/confirm-receipt`);
  check('استلام قبل التحويل → 403', r.status === 403);
  r = await B.post(`/api/deals/${DS}/confirm-transfer`);
  check('تأكيد التحويل (الدافع)', r.status === 200 && r.data.status === 'awaiting_receipt', r.data);
  r = await B.post(`/api/deals/${DS}/cancel`, { reason: 'غيّرت رأيي' });
  check('إلغاء بعد التحويل → 409 USE_TICKET', r.status === 409 && code(r) === 'USE_TICKET', r.data);
  r = await B.post(`/api/deals/${DS}/confirm-receipt`);
  check('الدافع يؤكد الاستلام → 403', r.status === 403);
  r = await A.post(`/api/deals/${DS}/confirm-receipt`);
  check('تأكيد الاستلام → completed', r.status === 200 && r.data.status === 'completed', r.data);
  r = await anon.get(`/api/properties/${PS}`);
  check('العقار صار closed', r.data.status === 'closed');
  r = await A.post(`/api/deals/${DS}/cancel`, { reason: 'تجربة إلغاء' });
  check('إلغاء صفقة مكتملة → 409', r.status === 409);
  r = await A.get(`/api/deals/${DS}`);
  check('nextAction=review للطرفين', r.data.nextAction === 'review');
  r = await B.post(`/api/deals/${DS}/review`, { rating: 6 });
  check('تقييم 6 → 400', r.status === 400);
  r = await B.post(`/api/deals/${DS}/review`, { rating: 5, comment: 'تعامل ممتاز' });
  check('تقييم المشتري للبائع', r.status === 201, r.data);
  r = await B.post(`/api/deals/${DS}/review`, { rating: 4 });
  check('تقييم مكرر → 409 ALREADY_REVIEWED', r.status === 409 && code(r) === 'ALREADY_REVIEWED');
  r = await C.post(`/api/deals/${DS}/review`, { rating: 4 });
  check('غير طرف يقيّم → 403', r.status === 403);
  r = await A.post(`/api/deals/${DS}/review`, { rating: 4, comment: 'مشتري جاد' });
  check('تقييم البائع للمشتري', r.status === 201);
  r = await A.get(`/api/deals/${DS}`);
  check('reviews mine/theirs', r.data.reviews.mine.rating === 4 && r.data.reviews.theirs.rating === 5 && r.data.nextAction === null, r.data.reviews);
  r = await anon.get(`/api/users/${A.id}`);
  check('الملف العام: التقييم والمراجعات واسم المقيّم الأول', r.status === 200 && r.data.ratingAvg === 5 && r.data.ratingCount === 1 && r.data.completedDeals === 1 && r.data.reviews[0].reviewerFirstName === 'سارة' && r.data.firstName === 'خالد' && !('email' in r.data) && !('phone' in r.data), r.data);
  r = await anon.get('/api/users/nope');
  check('مستخدم غير موجود → 404', r.status === 404);
  r = await A.get('/api/me');
  check('/api/me: profile.ratingAvg=5 و stats.completedDeals=1', r.data.profile.ratingAvg === 5 && r.data.profile.ratingCount === 1 && r.data.stats.completedDeals === 1);
  r = await anon.get('/api/stats');
  check('stats: completedDeals=1', r.data.completedDeals === 1 && r.data.members >= 3 && r.data.activeListings === 2 && r.data.districts === 2, r.data);

  section('إيجار + قواعد الإلغاء');
  r = await B.post('/api/conversations', { propertyId: PR });
  const CR = r.data.id;
  r = await B.post('/api/deals', { conversationId: CR, agreedPrice: 40_000 });
  check('إيجار بدون durationMonths → 400', r.status === 400, r.data);
  r = await B.post('/api/deals', { conversationId: CR, agreedPrice: 40_000, durationMonths: 121 });
  check('مدة > 120 → 400', r.status === 400);
  r = await B.post('/api/deals', { conversationId: CR, agreedPrice: 40_000, durationMonths: 12 });
  check('اقتراح إيجار', r.status === 201, r.data);
  const DR = r.data.id;
  r = await A.post(`/api/deals/${DR}/cancel`, { reason: 'ab' });
  check('سبب إلغاء قصير → 400', r.status === 400);
  r = await C.post(`/api/deals/${DR}/cancel`, { reason: 'سبب كافي' });
  check('غير طرف يلغي → 403', r.status === 403);
  r = await A.post(`/api/deals/${DR}/cancel`, { reason: 'السعر منخفض' });
  check('إلغاء أثناء التفاوض', r.status === 200 && r.data.status === 'cancelled');
  r = await anon.get(`/api/properties/${PR}`);
  check('العقار ما زال active', r.data.status === 'active');
  r = await B.post('/api/deals', { conversationId: CR, agreedPrice: 42_000, durationMonths: 12 });
  check('صفقة جديدة بعد الإلغاء ممكنة', r.status === 201);
  const DR2 = r.data.id;
  r = await A.post(`/api/deals/${DR2}/accept`);
  check('قبول الإيجار → عقد rent بـ rentPeriod', r.status === 200);
  r = await A.get(`/api/deals/${DR2}`);
  check('snapshot الإيجار: rentPeriod و durationMonths', r.data.contract.snapshot.templateType === 'rent' && r.data.contract.snapshot.rentPeriod === 'yearly' && r.data.contract.snapshot.durationMonths === 12);
  r = await anon.get(`/api/properties/${PR}`);
  check('العقار reserved', r.data.status === 'reserved');
  r = await B.post(`/api/deals/${DR2}/cancel`, { reason: 'وجدت بديلاً' });
  check('إلغاء في مرحلة التوقيع', r.status === 200);
  r = await anon.get(`/api/properties/${PR}`);
  check('العقار رجع active', r.data.status === 'active');
  r = await A.get(`/api/deals/${DR2}`);
  check('العقد الملغى status=cancelled', r.data.status === 'cancelled' && r.data.contract.status === 'cancelled' && r.data.nextAction === null && r.data.counterparty.phone === null);

  section('استثمار + نزاع عبر تذكرة');
  r = await B.post('/api/conversations', { propertyId: PI });
  const CI = r.data.id;
  r = await B.post('/api/deals', { conversationId: CI, agreedPrice: 1000 });
  check('أقل من الحد الأدنى → 400', r.status === 400, r.data);
  r = await B.post('/api/deals', { conversationId: CI, agreedPrice: 2_000_000 });
  check('أكثر من المتبقي → 400', r.status === 400);
  r = await B.post('/api/deals', { conversationId: CI, agreedPrice: 20_000 });
  check('استثمار: durationMonths افتراضي = 24', r.status === 201);
  const DI = r.data.id;
  r = await B.get(`/api/deals/${DI}`);
  check('kind=invest و durationMonths=24', r.data.kind === 'invest' && r.data.durationMonths === 24);
  await A.post(`/api/deals/${DI}/accept`);
  r = await anon.get(`/api/properties/${PI}`);
  check('الاستثمار يبقى active بعد القبول', r.data.status === 'active');
  r = await A.get(`/api/deals/${DI}`);
  check('snapshot الاستثمار: investment.expectedReturnPct', r.data.contract.snapshot.investment?.expectedReturnPct === 8.5 && r.data.contract.snapshot.templateType === 'invest', r.data.contract?.snapshot);
  await A.post(`/api/deals/${DI}/sign`, { signedName: 'خالد العتيبي' });
  await B.post(`/api/deals/${DI}/sign`, { signedName: 'سارة الغامدي' });
  await B.post(`/api/deals/${DI}/confirm-transfer`);
  r = await C.post('/api/tickets', { subject: 'مشكلة', body: 'مشكلة في صفقة ليست لي', dealId: DI });
  check('تذكرة بصفقة ليست لي → 404', r.status === 404, r.data);
  r = await B.post('/api/tickets', { subject: 'المستلم لا يرد', body: 'حوّلت المبلغ ولم يؤكد المستلم', dealId: DI });
  check('فتح تذكرة بصفقة → 201', r.status === 201 && r.data.status === 'open', r.data);
  r = await B.get(`/api/deals/${DI}`);
  check('الصفقة صارت disputed', r.data.status === 'disputed' && r.data.nextAction === null);
  r = await A.post(`/api/deals/${DI}/confirm-receipt`);
  check('تأكيد استلام على صفقة متنازع عليها → 409', r.status === 409);
  r = await A.get(`/api/conversations/${CI}/messages`);
  check('رسالة نظام عن التذكرة', r.data.items.some((m) => m.kind === 'system' && m.body.includes('تذكرة')));
  r = await B.get('/api/tickets');
  check('قائمة التذاكر', r.data.items.length === 1);
  r = await B.post('/api/tickets', { subject: 'استفسار عام', body: 'هذا استفسار بدون صفقة مرتبطة' });
  check('تذكرة بدون صفقة', r.status === 201);

  // صفقة استثمار مكتملة من C
  r = await C.post('/api/conversations', { propertyId: PI });
  const CI2 = r.data.id;
  r = await C.post('/api/deals', { conversationId: CI2, agreedPrice: 30_000 });
  const DI2 = r.data.id;
  await A.post(`/api/deals/${DI2}/accept`);
  await A.post(`/api/deals/${DI2}/sign`, { signedName: 'خالد العتيبي' });
  await C.post(`/api/deals/${DI2}/sign`, { signedName: 'نورة الزهراني' });
  await C.post(`/api/deals/${DI2}/confirm-transfer`);
  r = await A.post(`/api/deals/${DI2}/confirm-receipt`);
  check('صفقة استثمار مكتملة', r.status === 200 && r.data.status === 'completed', r.data);
  r = await anon.get(`/api/properties/${PI}`);
  check('raisedAmount زاد 30000 والعقار active', r.data.investment.raisedAmount === 30_000 && r.data.status === 'active' && r.data.investment.progressPct === 3, r.data.investment);

  section('الحدود');
  // A عنده نشط: الإيجار + الاستثمار = 2 (البيع closed)
  const mk = (i) => ({ ...saleBody, title: `عقار حد رقم ${i}`, images: [], amenities: [] });
  const created = [];
  for (let i = 1; i <= 3; i++) { r = await A.post('/api/properties', mk(i)); created.push(r.data.id); }
  check('الإعلان الخامس النشط مقبول', created.every(Boolean));
  r = await A.post('/api/properties', mk(99));
  check('الإعلان السادس → 409 LIMIT_REACHED', r.status === 409 && code(r) === 'LIMIT_REACHED', r.data);
  r = await A.get('/api/me');
  check('usage/limits في /api/me', r.data.usage.activeListings === 5 && r.data.limits.activeDeals === 3 && r.data.usage.activeDeals === 0, r.data.usage);
  // B يفتح 3 صفقات على العقارات الثلاثة
  const bDeals = [];
  for (const pid of created) {
    r = await B.post('/api/conversations', { propertyId: pid });
    r = await B.post('/api/deals', { conversationId: r.data.id, agreedPrice: 1_000_000 });
    bDeals.push(r.status);
  }
  check('3 صفقات نشطة للمشتري مقبولة', bDeals.every((s) => s === 201), bDeals);
  r = await B.post('/api/conversations', { propertyId: PR });
  r = await B.post('/api/deals', { conversationId: r.data.id, agreedPrice: 40_000, durationMonths: 6 });
  check('الصفقة الرابعة → 409 DEAL_LIMIT', r.status === 409 && code(r) === 'DEAL_LIMIT', r.data);
  r = await B.get('/api/me');
  check('usage.activeDeals=3 للمشتري', r.data.usage.activeDeals === 3);
  // C يقترح على A (A عنده 3 مفتوحة) → الإنشاء مسموح (C حدّه فاضي)، لكن قبول A مرفوض
  r = await C.post('/api/conversations', { propertyId: PR });
  r = await C.post('/api/deals', { conversationId: r.data.id, agreedPrice: 40_000, durationMonths: 6 });
  check('C يقترح (حدّه فاضي)', r.status === 201, r.data);
  const DC = r.data.id;
  r = await A.post(`/api/deals/${DC}/accept`);
  check('قبول A يتجاوز حدّه → 409 DEAL_LIMIT', r.status === 409 && code(r) === 'DEAL_LIMIT', r.data);
  r = await A.get(`/api/deals/${DC}`);
  check('الصفقة بقيت negotiating بدون تغيّر', r.data.status === 'negotiating' && r.data.contract === null);
  await C.post(`/api/deals/${DC}/cancel`, { reason: 'تجربة الحدود' });
  // أرشفة ثم إعادة تفعيل عند الحد
  r = await A.patch(`/api/properties/${created[0]}`, { status: 'archived' });
  r = await A.patch(`/api/properties/${created[0]}`, { status: 'active' });
  check('إعادة تفعيل عقار عند الحد ممكنة بعد أرشفة (5 ≤ 5)', r.status === 200, r.data);
  await A.post('/api/properties', mk(7)).then((x) => check('إضافة عند الحد → 409', x.status === 409));

  section('لوحة التحكم');
  r = await A.get('/api/properties/mine');
  const mineViews = r.data.items.reduce((a, x) => a + x.viewsCount, 0);
  const psViews = r.data.items.find((x) => x.id === PS).viewsCount;
  r = await A.get('/api/dashboard');
  const k = r.data.kpis;
  check('dashboard.kpis', r.status === 200 && ['activeListings', 'views30d', 'favoritesReceived', 'activeDeals', 'completedDeals', 'unreadMessages', 'ratingAvg', 'ratingCount'].every((x) => typeof k?.[x] === 'number'), k);
  check('kpis قيم صحيحة', k.activeListings === 5 && k.views30d === mineViews && k.completedDeals === 2 && k.activeDeals === 3 && k.ratingAvg === 5 && k.ratingCount === 1, k);
  check('viewsSeries = 30 يوماً بترتيب تصاعدي، مجموعها = views30d', r.data.viewsSeries.length === 30 && r.data.viewsSeries[29].date > r.data.viewsSeries[0].date && r.data.viewsSeries.reduce((a, b) => a + b.views, 0) === mineViews && /^\d{4}-\d{2}-\d{2}$/.test(r.data.viewsSeries[0].date), r.data.viewsSeries.slice(-2));
  check('dealsByStatus فيه كل الحالات', Object.keys(r.data.dealsByStatus).length === 8 && r.data.dealsByStatus.completed === 2 && r.data.dealsByStatus.disputed === 1 && r.data.dealsByStatus.negotiating === 3, r.data.dealsByStatus);
  check('topProperty', r.data.topProperty?.id === PS && r.data.topProperty.viewsCount === psViews && r.data.topProperty.cover, r.data.topProperty);
  check('actions: 3 طلبات قبول', r.data.actions.filter((a) => a.action === 'accept').length === 3 && r.data.actions.every((a) => a.dealId && a.propertyTitle && a.other?.name), r.data.actions);
  check('leads بأسماء أولى وحد أقصى 6', r.data.leads.length <= 6 && r.data.leads.length > 0 && r.data.leads.every((l) => !l.name.includes(' ')), r.data.leads);
  check('recentDeals ≤ 5 بشكل قائمة الصفقات', r.data.recentDeals.length === 5 && 'nextAction' in r.data.recentDeals[0] && 'payerIsMe' in r.data.recentDeals[0]);
  r = await B.get('/api/dashboard');
  check('dashboard للمشتري: actions فيها review أو wait فقط', r.status === 200 && r.data.kpis.activeListings === 0 && r.data.topProperty === null && r.data.viewsSeries.length === 30);
  r = await B.get('/api/deals');
  const it = r.data.items[0];
  check('قائمة الصفقات: الشكل المطلوب', ['id', 'status', 'kind', 'agreedPrice', 'durationMonths', 'role', 'payerIsMe', 'proposedBy', 'property', 'other', 'conversationId', 'contractNumber', 'nextAction', 'createdAt', 'updatedAt'].every((x) => x in it) && it.property.title, Object.keys(it));
  r = await B.get('/api/deals');
  const done = r.data.items.find((x) => x.id === DS);
  check('عنصر صفقة مكتملة: contractNumber و other باسم كامل و nextAction=null', done.contractNumber === contractNo && done.other.name === 'خالد العتيبي' && done.nextAction === null, done);

  section('المساعد');
  r = await anon.post('/api/assistant', { message: 'كم عدد العقارات المسموحة لكل فرد؟', lang: 'ar' });
  check('FAQ عربي (الحدود)', r.status === 200 && r.data.source === 'faq' && r.data.reply.includes('5'), r.data);
  r = await anon.post('/api/assistant', { message: 'How do I cancel a deal?', lang: 'en' });
  check('FAQ إنجليزي (cancel)', r.data.source === 'faq' && /cancel/i.test(r.data.reply), r.data);
  r = await A.post('/api/assistant', { message: 'ما هي خطوات الصفقة؟', lang: 'ar', page: '/dashboard', history: [{ role: 'user', text: 'مرحبا' }, { role: 'assistant', text: 'أهلاً' }] });
  check('FAQ خطوات الصفقة مع history', r.data.reply.includes('تم التحويل'), r.data);
  r = await anon.post('/api/assistant', { message: 'qzxw vbnm', lang: 'en' });
  check('سؤال غير مفهوم → رد افتراضي يسرد المواضيع', r.data.source === 'faq' && /rephrase/.test(r.data.reply));
  r = await anon.post('/api/assistant', { message: '   ' });
  check('رسالة فارغة → 400', r.status === 400);
  r = await anon.post('/api/assistant', { message: 'hello'.repeat(200) });
  check('رسالة طويلة → 400', r.status === 400);

  section('تحديد المعدّل');
  let got429 = null;
  for (let i = 0; i < 25 && !got429; i++) { r = await anon.post('/api/assistant', { message: 'hi', lang: 'en' }); if (r.status === 429) got429 = r; }
  check('المساعد: 429 RATE_LIMIT بعد تجاوز 20/دقيقة', got429 && code(got429) === 'RATE_LIMIT' && got429.headers.get('retry-after'), got429?.status);
  r = await anon.get('/api/nope');
  check('مسار api غير موجود → 404 بصيغة JSON', r.status === 404 && code(r) === 'NOT_FOUND');
}
