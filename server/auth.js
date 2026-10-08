import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, user, session, account, verification } from './db/index.js';

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret === 'change-me' || secret.length < 32) {
  console.error('\n❌ المفتاح السري BETTER_AUTH_SECRET غير مضبوط.\n   شغّل:  npm run setup\n');
  process.exit(1);
}

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

// العناوين المسموح لها بإرسال طلبات (حماية CSRF) — نصدّرها ليستخدمها server.js أيضاً
export const trustedOrigins = [
  ...new Set([
    baseURL,
    process.env.BETTER_AUTH_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // عناوين إضافية مفصولة بفاصلة، مثال: EXTRA_ORIGINS=https://a.com,https://b.com
    ...(process.env.EXTRA_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  ].filter(Boolean)),
];

export const auth = betterAuth({
  baseURL,
  secret,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true, // بعد التسجيل يدخل مباشرة
  },

  user: {
    additionalFields: {
      // input:false = العميل ما يقدر يحدد نوع حسابه بنفسه. الكل يبدأ "فرد".
      // (الشركات والمشرفون يُنشأون من مسار منفصل لاحقاً)
      accountType: { type: 'string', required: false, defaultValue: 'individual', input: false },
      phone: { type: 'string', required: false, input: false },
    },
  },

  trustedOrigins,
});
