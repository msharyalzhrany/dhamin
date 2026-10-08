import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? 'file:./data/dhamin.db';

// نتأكد أن مجلد الملف موجود قبل إنشاء القاعدة
if (url.startsWith('file:')) mkdirSync(dirname(url.slice(5)), { recursive: true });

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/db/schema.js',
  dbCredentials: { url },
});
