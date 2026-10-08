// ===================================================================
// عميل الـ API — كل طلبات الواجهة إلى الباك اند تمر من هنا.
//   api('/properties?district=al-rawdah')            ← GET
//   api('/properties', { method:'POST', body:{...} }) ← POST (JSON)
// الجلسة تُرسل تلقائياً (كوكي Better Auth) لأن الواجهة والسيرفر على نفس الأصل.
// ===================================================================
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Opts = { method?: string; body?: unknown; signal?: AbortSignal };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    credentials: 'same-origin',
    signal: opts.signal,
    headers: opts.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.code ?? 'ERROR', e?.message ?? 'حدث خطأ غير متوقع');
  }
  return data as T;
}

// رسالة الخطأ بلغة المستخدم (السيرفر يرسل عربي؛ للإنجليزي نترجم الأكواد الشائعة)
const EN: Record<string, string> = {
  UNAUTHENTICATED: 'Please sign in first.',
  FORBIDDEN: 'You are not allowed to do this.',
  NOT_FOUND: 'Not found.',
  VALIDATION: 'Some fields are invalid — please check the form.',
  LIMIT_REACHED: 'You reached the active listings limit. Close a listing first.',
  DEAL_LIMIT: 'You reached the active deals limit.',
  DEAL_EXISTS: 'There is already an open deal in this conversation.',
  PROPERTY_UNAVAILABLE: 'This property is no longer available.',
  BAD_STATE: 'This action is not available in the current deal status.',
  NAME_MISMATCH: 'The signature must match your account name.',
  ALREADY_SIGNED: 'You already signed this contract.',
  USE_TICKET: 'After the transfer, please open a support ticket instead.',
  ALREADY_REVIEWED: 'You already reviewed this deal.',
  OWN_PROPERTY: 'This is your own property.',
  BAD_FILE: 'Unsupported file. Use JPG, PNG or WebP.',
  TOO_LARGE: 'File is too large (max 5MB).',
  RATE_LIMIT: 'Too many requests. Please wait a moment.',
  FORBIDDEN_ORIGIN: 'Request blocked for security reasons.',
  SERVER_ERROR: 'Unexpected server error.',
  NOT_SUPPORTED_YET: 'This account type is coming soon.',
};
export function errText(e: unknown, lang: 'ar' | 'en'): string {
  if (e instanceof ApiError) {
    if (lang === 'ar') return e.message;
    return EN[e.code] ?? e.message;
  }
  return lang === 'ar' ? 'تعذّر الاتصال بالخادم' : 'Could not reach the server';
}
