import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? 'file:./data/dhamin.db';

// نتأكد أن مجلد الملف موجود قبل إنشاء القاعدة
if (url.startsWith('file:')) mkdirSync(dirname(url.slice(5)), { recursive: true });

// قاعدة خارجية (Turso) تبدأ بـ libsql:// وتحتاج توكن؛ المحلية ملف SQLite
const remote = url.startsWith('libsql:') || url.startsWith('https:');

export default defineConfig({
  dialect: remote ? 'turso' : 'sqlite',
  schema: './server/db/schema.js',
  dbCredentials: remote ? { url, authToken: process.env.DATABASE_AUTH_TOKEN } : { url },
});
