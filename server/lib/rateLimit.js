// محدِّد معدّل بسيط في الذاكرة (يحمي من التخمين والإزعاج).
// يعدّ الطلبات لكل "مفتاح" (IP أو معرّف مستخدم) داخل نافذة زمنية.
// ملاحظة: الذاكرة تتصفّر عند إعادة تشغيل السيرفر، وهذا مقبول لمشروع صغير.
import { ApiError } from './http.js';

const buckets = new Map(); // المفتاح → { count, resetAt }

// تنظيف دوري حتى لا تكبر الذاكرة
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 60_000).unref();

// عنوان الزائر: خلف بروكسي (Railway) يأتي في x-forwarded-for، وإلا نستخدم 'local'
export function clientIp(c) {
  const xff = c.req.header('x-forwarded-for');
  return (xff ? xff.split(',')[0].trim() : c.req.header('x-real-ip')) || 'local';
}

/**
 * rateLimit({ name, max, windowMs, key })
 * key(c) تعيد المفتاح (الافتراضي: IP). ترمي 429 عند التجاوز.
 */
export function rateLimit({ name, max, windowMs = 60_000, key = clientIp }) {
  return async (c, next) => {
    const id = `${name}:${key(c)}`;
    const now = Date.now();
    let b = buckets.get(id);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(id, b);
    }
    b.count += 1;
    if (b.count > max) {
      c.header('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)));
      throw new ApiError(429, 'RATE_LIMIT', 'طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد قليل.');
    }
    await next();
  };
}
