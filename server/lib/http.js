import { auth } from '../auth.js';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// يتحقق من البيانات بـ zod ويرمي خطأ 400 واضح إذا فيها مشكلة
export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('، ');
    throw new ApiError(400, 'VALIDATION', msg);
  }
  return r.data;
}

export async function readJson(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

// يرجع المستخدم الحالي (أو null إذا ما سجّل دخول)
export async function getUser(c) {
  const s = await auth.api.getSession({ headers: c.req.raw.headers });
  return s?.user ?? null;
}

// حارس: أي مسار يستخدمه يتطلب تسجيل دخول
export const requireAuth = async (c, next) => {
  const user = await getUser(c);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'سجّل دخولك أولاً');
  c.set('user', user);
  await next();
};
