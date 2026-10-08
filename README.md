# ضامن | Dhamin — منصة الوساطة العقارية (جدة / الأفراد)

موقع كامل: **واجهة** (React + Vite + Tailwind) + **باك اند** (Hono + Better Auth) + **قاعدة بيانات** (SQLite عبر Drizzle).
عربي/إنجليزي، دارك مود، تكبير/تصغير الخط. الألوان: `#39AB79 #041C16 #FFFFFF #F3F5F5 #000000`.

> للشرح الكامل من الألف إلى الياء (خاصة الباك اند، وأين تكتب الربط وأين تكتب الـ API): اقرأ **GUIDE.md**.

## التشغيل على جهازك (ويندوز)
1. ثبّت Node.js (نسخة LTS) من nodejs.org.
2. افتح الفولدر `PROJECT 379` في الترمنال (Terminal) واكتب:
```
npm install
npm run setup        # ينشئ ملف .env بمفتاح سري + جداول قاعدة البيانات
npm run db:seed      # (اختياري) بيانات تجريبية: مستخدمون وعقارات وصفقات
npm run dev          # يشغّل السيرفر + الواجهة معاً
```
3. افتح **http://localhost:5173**

حسابات تجريبية (كلمة المرور `Demo@12345`): `khalid@demo.dhamin.test` ، `sara@demo.dhamin.test` ، `abdullah@demo.dhamin.test` ...

## أوامر مهمة
| الأمر | وظيفته |
|---|---|
| `npm run dev` | تطوير (سيرفر :3000 + واجهة :5173) |
| `npm run build` | يبني الواجهة في مجلد `dist` |
| `npm start` | تشغيل الإنتاج: يحدّث الجداول ثم يشغّل السيرفر (يقدّم `dist`) |
| `npm run db:push` | يطبّق تعديلات `server/db/schema.js` على القاعدة |
| `npm run db:studio` | متصفح بيانات (Drizzle Studio) لرؤية الجداول |
| `npm run db:seed -- --reset` | إعادة بناء البيانات التجريبية |
| `node scripts/smoke-test.js` | اختبار آلي للـ API |

## الهيكل
```
PROJECT 379/
├─ server/        ← الباك اند: server.js، auth.js، routes/ (الـ API)، db/schema.js (الجداول)، lib/
├─ src/           ← الواجهة: pages/ (الصفحات)، components/، providers/، lib/api.ts (الربط)
├─ public/        ← صور وشعارات ثابتة (public/brand = ملفات الهوية)
├─ scripts/       ← setup.js، seed.js، smoke-test.js
├─ data/          ← قاعدة البيانات والصور المرفوعة (لا ترفعه على GitHub)
├─ vite.config.ts ← تمرير /api للسيرفر أثناء التطوير
└─ .env           ← الإعدادات السرية
```

## النشر على Railway (مختصر)
1. ارفع المشروع على GitHub (الـ `.gitignore` يمنع رفع `.env` و`data`).
2. Railway → New Project → Deploy from GitHub.
3. أضف **Volume** مركّب على `/data`.
4. Variables: `BETTER_AUTH_SECRET` (نص عشوائي ≥32)، `BETTER_AUTH_URL=https://اسم-موقعك`، `DATABASE_URL=file:/data/dhamin.db`، `UPLOAD_DIR=/data/uploads`، (اختياري) `GEMINI_API_KEY`.
5. Build: `npm install && npm run build` — Start: `npm start`.
6. Settings → Networking → Generate Domain، أو Custom Domain (يعطيك CNAME وTXT تضيفهما عند مزوّد الدومين) ثم غيّر `BETTER_AUTH_URL` لدومينك.

## صور العروض (جدة)
ضع صورك الحقيقية في `public/img/listings/<الحي أو نوع العقار>/` ثم `npm run db:seed -- --reset` (التفاصيل في `public/img/listings/README.md`).
"# dhamin" 
