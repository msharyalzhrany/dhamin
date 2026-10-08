import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

const url = process.env.DATABASE_URL ?? 'file:./data/dhamin.db';
if (url.startsWith('file:')) mkdirSync(dirname(url.slice(5)), { recursive: true });

const client = createClient({ url });
// نفعّل المفاتيح الأجنبية (علاقات الجداول) في SQLite
await client.execute('PRAGMA foreign_keys = ON');

export const db = drizzle(client, { schema });
export * from './schema.js';
