// حالة تسجيل الدخول لكل الموقع.
//   const { user, me, loading, signIn, signUp, signOut, refresh } = useAuth()
// user = من Better Auth، me = بيانات ضامن (ملف شخصي + حدود + استخدام) من GET /api/me
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';

type AuthResult = { ok: true } | { ok: false; code: string; message: string };
type Ctx = {
  user: { id: string; name: string; email: string } | null;
  me: Me | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const uid = session?.user?.id;

  const refresh = useCallback(async () => {
    if (!uid) { setMe(null); return; }
    try { setMe(await api<Me>('/me')); } catch { setMe(null); }
  }, [uid]);

  useEffect(() => {
    if (!uid) { setMe(null); return; }
    setMeLoading(true);
    refresh().finally(() => setMeLoading(false));
  }, [uid, refresh]);

  const value: Ctx = {
    user: session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email } : null,
    me,
    loading: isPending || (!!uid && meLoading && !me),
    refresh,
    signIn: async (email, password) => {
      const r = await authClient.signIn.email({ email, password });
      return r.error ? { ok: false, code: r.error.code ?? 'ERROR', message: r.error.message ?? '' } : { ok: true };
    },
    signUp: async (name, email, password) => {
      const r = await authClient.signUp.email({ name, email, password });
      return r.error ? { ok: false, code: r.error.code ?? 'ERROR', message: r.error.message ?? '' } : { ok: true };
    },
    signOut: async () => { await authClient.signOut(); setMe(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}

/** يحوّل الزائر لصفحة الدخول ثم يعيده لنفس المكان:  const guard = useLoginGuard();  guard(() => addFavorite()) */
export function useLoginGuard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  return useCallback((action: () => void) => {
    if (user) return action();
    nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`);
  }, [user, nav, loc]);
}
