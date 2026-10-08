// تسجيل الدخول وإنشاء الحساب — تصميم منقسم (صورة حقيقية + نموذج) مأخوذ من sign-in-page
// بعد النجاح نرجع المستخدم للصفحة التي كان فيها (?next=...)
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Building2, Eye, EyeOff, ShieldCheck, UserRound, UserCog } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Badge } from '@/components/ui/misc';
import { LangSwitch, DisplayMenu } from '@/components/PrefsMenu';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';
import { cn } from '@/lib/utils';

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/app';
}

function authError(code: string, message: string, t: (a: string, e: string) => string) {
  const map: Record<string, [string, string]> = {
    INVALID_EMAIL_OR_PASSWORD: ['البريد أو كلمة المرور غير صحيحة', 'Incorrect email or password'],
    USER_ALREADY_EXISTS: ['هذا البريد مسجّل مسبقاً، جرّب تسجيل الدخول', 'This email is already registered — try signing in'],
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: ['هذا البريد مسجّل مسبقاً', 'This email is already registered'],
    PASSWORD_TOO_SHORT: ['كلمة المرور قصيرة (8 أحرف على الأقل)', 'Password is too short (min 8)'],
    INVALID_EMAIL: ['البريد الإلكتروني غير صحيح', 'Invalid email address'],
  };
  const m = map[code];
  return m ? t(m[0], m[1]) : message || t('حدث خطأ، حاول مرة أخرى', 'Something went wrong, please try again');
}

function Shell({ mode, children }: { mode: 'login' | 'signup'; children: React.ReactNode }) {
  const { t } = usePrefs();
  const nav = useNavigate();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* الجانب البصري: صورة حقيقية + رسالة الهوية */}
      <div className="relative hidden overflow-hidden bg-deep lg:block">
        <img src="/img/riyadh-night.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/55 to-deep/30" />
        <button onClick={() => nav('/')} aria-label={t('رجوع', 'Back')} className="absolute start-6 top-6 z-10 grid size-10 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40"><ArrowLeft className="size-5 rtl:rotate-180" /></button>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <Logo markClass="size-12" className="mb-8 text-white" />
          <h2 className="max-w-md text-4xl font-bold leading-tight xl:text-5xl">{mode === 'login' ? t('أهلاً بعودتك. صفقاتك بانتظارك.', 'Welcome back. Your deals are waiting.') : t('ابدأ صفقتك الأولى بضمان.', 'Start your first protected deal.')}</h2>
          <ul className="mt-6 space-y-2 text-sm text-white/75">
            {[[t('عقد موثّق بختم وتوقيع إلكتروني', 'Sealed contract with e-signature')], [t('تأكيد التحويل والاستلام من الطرفين', 'Transfer & receipt confirmed by both sides')], [t('تقييمات حقيقية بعد كل صفقة', 'Real reviews after every deal')]].map(([x]) => (
              <li key={x} className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand" />{x}</li>
            ))}
          </ul>
        </motion.div>
      </div>
      {/* النموذج */}
      <div className="relative flex flex-col bg-bg">
        <div className="flex items-center justify-between p-5">
          <Link to="/" className="lg:invisible"><Logo /></Link>
          <div className="flex items-center gap-1"><LangSwitch /><DisplayMenu /></div>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md">{children}</motion.div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const { t } = usePrefs();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} required minLength={8} autoComplete={autoComplete} className="pe-12" dir="ltr" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t('إخفاء كلمة المرور', 'Hide password') : t('إظهار كلمة المرور', 'Show password')} className="absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2">
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

export function Login() {
  const { t } = usePrefs();
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={next} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await signIn(email.trim(), password);
    setBusy(false);
    if (!r.ok) return setErr(authError(r.code, r.message, t));
    nav(next, { replace: true });
  }
  return (
    <Shell mode="login">
      <h1 className="text-3xl font-bold">{t('تسجيل الدخول', 'Sign in')}</h1>
      <p className="mt-2 text-muted">{t('ما عندك حساب؟', "Don't have an account?")}{' '}<Link to={`/signup${sp.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-text hover:underline">{t('أنشئ حساباً', 'Create one')}</Link></p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label={t('البريد الإلكتروني', 'Email')}>{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" dir="ltr" placeholder="name@example.com" />}</Field>
        <Field label={t('كلمة المرور', 'Password')}>{(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="current-password" />}</Field>
        {err && <p role="alert" className="rounded-xl border border-brand/50 bg-brand-soft px-4 py-3 text-sm font-medium">{err}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t('دخول', 'Sign in')}</Button>
      </form>
    </Shell>
  );
}

export function Signup() {
  const { t } = usePrefs();
  const { user, signUp } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={next} replace />;

  const types = [
    { id: 'individual', icon: UserRound, ar: 'فرد', en: 'Individual', on: true },
    { id: 'company', icon: Building2, ar: 'شركة', en: 'Company', on: false },
    { id: 'staff', icon: UserCog, ar: 'موظف', en: 'Staff', on: false },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().split(/\s+/).length < 2) return setErr(t('اكتب اسمك الكامل (الاسم الأول واسم العائلة) ليظهر صحيحاً في العقد', 'Enter your full name (first and last) — it appears on contracts'));
    setBusy(true); setErr(null);
    const r = await signUp(name.trim(), email.trim(), password);
    setBusy(false);
    if (!r.ok) return setErr(authError(r.code, r.message, t));
    nav(next === '/app' ? '/app/profile' : next, { replace: true });
  }
  return (
    <Shell mode="signup">
      <h1 className="text-3xl font-bold">{t('إنشاء حساب', 'Create account')}</h1>
      <p className="mt-2 text-muted">{t('عندك حساب؟', 'Already have an account?')}{' '}<Link to={`/login${sp.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-text hover:underline">{t('سجّل الدخول', 'Sign in')}</Link></p>
      <div className="mt-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('نوع الحساب', 'Account type')}>
        {types.map(({ id, icon: I, ar, en, on }) => (
          <div key={id} role="radio" aria-checked={on} aria-disabled={!on} className={cn('relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-semibold', on ? 'border-brand bg-brand-soft' : 'border-line opacity-60')}>
            <I className="size-5" />{t(ar, en)}
            {!on && <Badge tone="dark" className="absolute -top-2.5 !px-2 !py-0.5 text-[10px]">{t('قريباً', 'Soon')}</Badge>}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field label={t('الاسم الكامل', 'Full name')}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={60} autoComplete="name" />}</Field>
        <Field label={t('البريد الإلكتروني', 'Email')}>{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" dir="ltr" placeholder="name@example.com" />}</Field>
        <Field label={t('كلمة المرور', 'Password')} hint={t('8 أحرف على الأقل', 'At least 8 characters')}>{(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="new-password" />}</Field>
        <label className="flex items-start gap-3 text-sm text-muted"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required className="mt-1 size-4 accent-[var(--brand)]" />{t('أوافق على شروط الاستخدام وسياسة الخصوصية.', 'I agree to the terms of use and privacy policy.')}</label>
        {err && <p role="alert" className="rounded-xl border border-brand/50 bg-brand-soft px-4 py-3 text-sm font-medium">{err}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!agree}>{t('إنشاء الحساب', 'Create account')}</Button>
      </form>
    </Shell>
  );
}
