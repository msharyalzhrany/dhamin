// رفع الصور: POST /api/uploads (multipart/form-data، الحقل file)
import { Hono } from 'hono';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireAuth, ApiError } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';

export const uploadsRoutes = new Hono();

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './data/uploads');
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// نتعرف على نوع الصورة من أول بايتات الملف (لا نثق بالنوع الذي يرسله المتصفح)
function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

uploadsRoutes.post('/', requireAuth, rateLimit({ name: 'upload', max: 30, key: (c) => c.get('user').id }), async (c) => {
  let body;
  try {
    body = await c.req.parseBody();
  } catch {
    throw new ApiError(400, 'BAD_FILE', 'أرسل الصورة كـ multipart/form-data في الحقل file');
  }
  const file = body.file;
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function')
    throw new ApiError(400, 'BAD_FILE', 'لم يتم إرفاق ملف في الحقل file');
  if (file.size > MAX_BYTES) throw new ApiError(413, 'TOO_LARGE', 'حجم الصورة أكبر من 5 ميجابايت');
  if (!ALLOWED_MIME.includes(file.type)) throw new ApiError(400, 'BAD_FILE', 'المسموح فقط صور JPG أو PNG أو WebP');

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new ApiError(400, 'BAD_FILE', 'الملف ليس صورة صالحة');

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(join(UPLOAD_DIR, name), buf);
  return c.json({ url: `/uploads/${name}` }, 201);
});
