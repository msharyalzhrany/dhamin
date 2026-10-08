import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { auth, trustedOrigins } from './auth.js';
import { ApiError } from './lib/http.js';
import { rateLimit } from './lib/rateLimit.js';
import { meta } from './routes/meta.js';
import { me } from './routes/me.js';
import { propertiesRoutes } from './routes/properties.js';
import { ticketsRoutes } from './routes/tickets.js';
import { uploadsRoutes, UPLOAD_DIR } from './routes/uploads.js';
import { statsRoutes } from './routes/stats.js';
import { usersRoutes } from './routes/users.js';
import { conversationsRoutes } from './routes/conversations.js';
import { dealsRoutes } from './routes/deals.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { assistantRoutes } from './routes/assistant.js';
import { adminRoutes } from './routes/admin.js';

const app = new Hono();

app.use('*', logger());

// رؤوس الأمان. نسمح بالصور من نفس الموقع ومن data: و blob: (معاينة الرفع)،
// وبالأنماط المضمّنة (Tailwind/motion تستخدم style="...")
app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  }),
);

// حماية CSRF إضافية: الطلبات المغيّرة (POST/PATCH/DELETE) من موقع غريب تُرفض.
// الطلب بدون Origin (أدوات مثل curl) يمر لأنه لا يحمل كوكيز متصفح.
app.use('/api/*', async (c, next) => {
  const origin = c.req.header('origin');
  if (origin && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    let sameHost = false;
    try {
      sameHost = new URL(origin).host === c.req.header('host');
    } catch {}
    if (!sameHost && !trustedOrigins.includes(origin)) throw new ApiError(403, 'FORBIDDEN_ORIGIN', 'مصدر الطلب غير مسموح');
  }
  await next();
});

// حجم الطلبات: 1MB لكل /api، وإلا 6MB لرفع الصور فقط
const tooLarge = (c) => c.json({ error: { code: 'TOO_LARGE', message: 'حجم الطلب كبير جداً' } }, 413);
const smallBody = bodyLimit({ maxSize: 1024 * 1024, onError: tooLarge });
const uploadBody = bodyLimit({ maxSize: 6 * 1024 * 1024, onError: tooLarge });
app.use('/api/*', (c, next) => (c.req.path === '/api/uploads' ? uploadBody(c, next) : smallBody(c, next)));

// ---- تحديد المعدّل ----
app.use('/api/auth/sign-in/*', rateLimit({ name: 'auth-in', max: 20 }));
app.use('/api/auth/sign-up/*', rateLimit({ name: 'auth-up', max: 20 }));
app.use('/api/assistant', rateLimit({ name: 'assistant', max: 20 }));

// ---- تسجيل الدخول (Better Auth) — كل مساراته تحت /api/auth/* ----
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// ---- واجهات ضامن ----
app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));
app.route('/api/meta', meta);
app.route('/api/stats', statsRoutes);
app.route('/api/me', me);
app.route('/api/users', usersRoutes);
app.route('/api/properties', propertiesRoutes);
app.route('/api/uploads', uploadsRoutes);
app.route('/api/conversations', conversationsRoutes);
app.route('/api/deals', dealsRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/tickets', ticketsRoutes);
app.route('/api/assistant', assistantRoutes);
app.route('/api/admin', adminRoutes);

// ---- الصور المرفوعة (/uploads/<uuid>.<ext>) — أسماؤها uuid فلا تتغير، فنخزّنها في المتصفح سنة ----
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
app.get('/uploads/:file', async (c) => {
  const m = /^([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(c.req.param('file'));
  if (!m) return c.notFound();
  try {
    const buf = await readFile(join(UPLOAD_DIR, m[0]));
    return c.body(buf, 200, {
      'Content-Type': MIME[m[2]],
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
  } catch {
    return c.notFound();
  }
});

// ---- الصفحات: public ثم dist (نسخة الإنتاج من Vite إن وُجدت) ----
const DIST = resolve('./dist');
app.use('/*', serveStatic({ root: './public' }));
app.use('/*', async (c, next) => (existsSync(DIST) ? serveStatic({ root: './dist' })(c, next) : next()));

// SPA: أي رابط صفحة (ليس api ولا uploads) يرجع index.html ليتولى React التوجيه
app.get('*', async (c, next) => {
  const p = c.req.path;
  if (p.startsWith('/api/') || p.startsWith('/uploads/')) return next();
  if (!(c.req.header('accept') ?? '').includes('text/html')) return next();
  const index = join(DIST, 'index.html');
  if (!existsSync(index)) return next();
  return c.html(await readFile(index, 'utf8'), 200, { 'Cache-Control': 'no-cache' });
});

// ---- الأخطاء ----
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: { code: 'NOT_FOUND', message: 'المسار غير موجود' } }, 404);
  return c.text('الصفحة غير موجودة (404)', 404);
});

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ error: { code: err.code, message: err.message } }, err.status);
  console.error(err);
  return c.json({ error: { code: 'SERVER_ERROR', message: 'حدث خطأ غير متوقع' } }, 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`\n✅ ضامن يعمل على:  http://localhost:${port}\n`);
});
