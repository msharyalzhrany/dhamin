// هيكل لوحة المستخدم: شريط جانبي + شريط علوي. كل صفحات /app تُعرض داخل <Outlet/>
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Handshake, Heart, Home, LayoutDashboard, LifeBuoy, LogOut, Menu, MessageSquare, Plus, UserRound, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { DisplayMenu, LangSwitch } from '@/components/PrefsMenu';
import { AssistantWidget } from '@/components/AssistantWidget';
import { buttonStyles } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner className="size-8" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <AppLayout />;
}

function useUnread() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => api<{ items: { unread: number }[] }>('/conversations').then((r) => alive && setN(r.items.reduce((s, c) => s + c.unread, 0))).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return n;
}

function AppLayout() {
  const { t, num } = usePrefs();
  const { user, me, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const unread = useUnread();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const items = [
    { to: '/app', end: true, icon: LayoutDashboard, label: t('لوحة التحكم', 'Dashboard') },
    { to: '/app/properties', icon: Home, label: t('عقاراتي', 'My properties') },
    { to: '/app/messages', icon: MessageSquare, label: t('الرسائل', 'Messages'), badge: unread },
    { to: '/app/deals', icon: Handshake, label: t('الصفقات', 'Deals') },
    { to: '/app/favorites', icon: Heart, label: t('المفضلة', 'Favorites') },
    { to: '/app/profile', icon: UserRound, label: t('ملفي الشخصي', 'My profile') },
    { to: '/app/support', icon: LifeBuoy, label: t('الدعم', 'Support') },
  ];

  const meter = (label: string, v: number, max: number) => (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-white/70"><span>{label}</span><span className="num font-semibold text-white">{num(v)} / {num(max)}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (v / Math.max(1, max)) * 100)}%` }} /></div>
    </div>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-deep p-5 text-white dark:bg-[color-mix(in_srgb,var(--deep)_80%,black)]">
      <div className="flex items-center justify-between">
        <Link to="/"><Logo className="text-white" /></Link>
        <button className="grid size-9 place-items-center rounded-full hover:bg-white/10 lg:hidden" onClick={() => setDrawer(false)} aria-label={t('إغلاق', 'Close')}><X className="size-5" /></button>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ to, icon: I, label, badge, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors', isActive ? 'bg-brand text-on-brand' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
            <I className="size-[1.1rem]" />
            <span className="flex-1">{label}</span>
            {!!badge && <span className="num grid min-w-5 place-items-center rounded-full bg-white px-1.5 text-[11px] font-bold text-deep">{badge}</span>}
          </NavLink>
        ))}
      </nav>
      {me && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          {meter(t('إعلانات نشطة', 'Active listings'), me.usage.activeListings, me.limits.activeListings)}
          {meter(t('صفقات نشطة', 'Active deals'), me.usage.activeDeals, me.limits.activeDeals)}
        </div>
      )}
      <button onClick={async () => { await signOut(); nav('/'); }} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"><LogOut className="size-[1.1rem]" />{t('تسجيل الخروج', 'Sign out')}</button>
    </div>
  );

  return (
    <div className="min-h-screen lg:ps-72">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-72 lg:block">{sidebar}</aside>
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw]" initial={{ x: loc.pathname ? (document.dir === 'rtl' ? 300 : -300) : 0 }} animate={{ x: 0 }} exit={{ x: document.dir === 'rtl' ? 300 : -300 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}>{sidebar}</motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <button className="grid size-10 place-items-center rounded-full hover:bg-surface-2 lg:hidden" onClick={() => setDrawer(true)} aria-label={t('القائمة', 'Menu')}><Menu className="size-6" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted">{me ? t(me.welcome.ar, me.welcome.en) : ''}</p>
        </div>
        <Link to="/app/properties/new" className={buttonStyles('primary', 'sm', 'hidden sm:inline-flex')}><Plus className="size-4" />{t('إضافة عقار', 'Add property')}</Link>
        <LangSwitch /><DisplayMenu />
        <Link to="/app/profile" aria-label={t('ملفي', 'Profile')}><Avatar name={user?.name} src={me?.profile.avatarUrl} className="size-10" /></Link>
      </div>

      <main className="px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      <AssistantWidget />
    </div>
  );
}
