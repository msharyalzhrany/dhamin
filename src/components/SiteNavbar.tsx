// شريط التنقل العام — مأخوذ من navbar2 (قوائم كبيرة Mega Menu + تحويل اللغة) ومُكيَّف:
// عربي/إنجليزي، RTL، ألوان الهوية، وزر الدخول/اللوحة حسب حالة المستخدم.
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Plus, X } from 'lucide-react';
import { FaInstagram, FaLinkedin, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { DisplayMenu, LangSwitch } from '@/components/PrefsMenu';
import { buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';
import { cn } from '@/lib/utils';

type Auth = 'guest' | 'user'; // guest = يظهر لغير المسجّل فقط، user = للمسجّل فقط
type MenuLink = { ar: string; en: string; to: string; badge?: { ar: string; en: string }; auth?: Auth };
type Mega = { id: string; ar: string; en: string; cols: { ar: string; en: string; links: MenuLink[]; auth?: Auth }[]; footer?: MenuLink[]; socials?: boolean };

const MEGA: Mega[] = [
  {
    id: 'properties', ar: 'العقارات', en: 'Properties',
    cols: [
      { ar: 'تصفّح', en: 'Browse', links: [
        { ar: 'عقارات للبيع', en: 'For sale', to: '/properties?listingType=sale' },
        { ar: 'عقارات للإيجار', en: 'For rent', to: '/properties?listingType=rent' },
        { ar: 'فرص استثمارية', en: 'Investment', to: '/invest' },
        { ar: 'كل العقارات', en: 'All properties', to: '/properties' },
      ] },
      { ar: 'حسب النوع', en: 'By type', links: [
        { ar: 'فلل', en: 'Villas', to: '/properties?propertyType=villa' },
        { ar: 'شقق', en: 'Apartments', to: '/properties?propertyType=apartment' },
        { ar: 'أراضي', en: 'Land', to: '/properties?propertyType=land' },
        { ar: 'عمائر', en: 'Buildings', to: '/properties?propertyType=building' },
        { ar: 'محلات ومكاتب', en: 'Shops & offices', to: '/properties?usage=commercial' },
      ] },
      { ar: 'أحياء مطلوبة', en: 'Popular districts', links: [
        { ar: 'الروضة', en: 'Al Rawdah', to: '/properties?district=al-rawdah' },
        { ar: 'الشاطئ', en: 'Al Shati', to: '/properties?district=al-shati' },
        { ar: 'الحمراء', en: 'Al Hamra', to: '/properties?district=al-hamra' },
        { ar: 'أبحر الشمالية', en: 'Obhur North', to: '/properties?district=obhur-north' },
      ] },
    ],
    footer: [{ ar: 'أضف عقارك', en: 'List your property', to: '/app/properties/new' }],
  },
  {
    id: 'invest', ar: 'الاستثمار', en: 'Investing',
    cols: [
      { ar: 'فرص', en: 'Opportunities', links: [
        { ar: 'الفرص الاستثمارية', en: 'Investment opportunities', to: '/invest' },
        { ar: 'المزادات', en: 'Auctions', to: '/auctions', badge: { ar: 'قريباً', en: 'Soon' } },
      ] },
      { ar: 'أدوات', en: 'Tools', links: [
        { ar: 'محاكي العائد', en: 'Return simulator', to: '/invest#simulator' },
        { ar: 'كيف يعمل الاستثمار', en: 'How investing works', to: '/#how' },
      ] },
      { ar: 'ابدأ', en: 'Get started', links: [
        { ar: 'أضف فرصة استثمارية', en: 'List an opportunity', to: '/app/properties/new' },
        { ar: 'إنشاء حساب', en: 'Create account', to: '/signup', auth: 'guest' },
        { ar: 'لوحتي', en: 'My dashboard', to: '/app', auth: 'user' },
      ] },
    ],
  },
  {
    id: 'about', ar: 'عن ضامن', en: 'About',
    cols: [
      { ar: 'كيف نضمن صفقتك', en: 'How we protect you', links: [
        { ar: 'خطوات الصفقة', en: 'Deal steps', to: '/#how' },
        { ar: 'العقد والتوقيع الإلكتروني', en: 'Contract & e-signature', to: '/#trust' },
        { ar: 'الأسئلة الشائعة', en: 'FAQ', to: '/#faq' },
      ] },
      { ar: 'الدعم', en: 'Support', links: [
        { ar: 'تواصل مع الدعم', en: 'Contact support', to: '/app/support' },
        { ar: 'المساعد الذكي', en: 'AI assistant', to: '/#faq' },
      ] },
      { ar: 'حسابك', en: 'Your account', auth: 'guest', links: [
        { ar: 'تسجيل الدخول', en: 'Sign in', to: '/login' },
        { ar: 'إنشاء حساب', en: 'Sign up', to: '/signup' },
      ] },
      { ar: 'حسابك', en: 'Your account', auth: 'user', links: [
        { ar: 'لوحتي', en: 'My dashboard', to: '/app' },
        { ar: 'عقاراتي', en: 'My properties', to: '/app/properties' },
        { ar: 'الرسائل', en: 'Messages', to: '/app/messages' },
        { ar: 'صفقاتي', en: 'My deals', to: '/app/deals' },
        { ar: 'المفضلة', en: 'Favorites', to: '/app/favorites' },
      ] },
    ],
    socials: true,
  },
];

const SOCIALS = [
  { label: 'X', icon: FaXTwitter }, { label: 'Instagram', icon: FaInstagram }, { label: 'LinkedIn', icon: FaLinkedin },
  { label: 'YouTube', icon: FaYoutube }, { label: 'WhatsApp', icon: FaWhatsapp },
];

export function SiteNavbar() {
  const { t, lang } = usePrefs();
  const { user, me, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const show = (a?: Auth) => !a || (a === 'user') === !!user;
  const megaFor = (m: Mega): Mega => ({ ...m, cols: m.cols.filter((c) => show(c.auth)).map((c) => ({ ...c, links: c.links.filter((l) => show(l.auth)) })).filter((c) => c.links.length) });

  useEffect(() => { setOpen(null); setMobile(false); setUserMenu(false); }, [loc.pathname, loc.search, loc.hash]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

    const rowBtn = 'flex items-center gap-1 rounded-full px-4 py-2 text-[15px] font-medium transition-colors';

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4">
      <div className="w-full max-w-7xl" onMouseLeave={() => setOpen(null)}>
        <motion.div layout transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn('rounded-3xl border border-line bg-surface/95 text-ink shadow-card backdrop-blur-xl transition-shadow', scrolled && 'shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]')}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link to="/" className="shrink-0" aria-label={t('ضامن — الرئيسية', 'Dhamin — Home')}><Logo markClass="size-9" /></Link>

            <nav className="hidden items-center gap-1 lg:flex" aria-label="main">
              {MEGA.map((m) => {
                const mm = megaFor(m);
                const isOpen = open === m.id;
                return (
                  <div key={m.id} className="relative" onMouseEnter={() => setOpen(m.id)} onMouseLeave={() => setOpen(null)}>
                    <button onClick={() => setOpen((c) => (c === m.id ? null : m.id))} aria-expanded={isOpen}
                      className={cn(rowBtn, isOpen ? 'bg-surface-2' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
                      {lang === 'ar' ? m.ar : m.en}
                      <ChevronDown className={cn('size-4 transition-transform duration-300', isOpen && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
                          className="absolute start-1/2 top-full z-30 mt-2 max-h-[75vh] w-60 -translate-x-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-card before:absolute before:inset-x-0 before:-top-3 before:h-3 before:content-[''] rtl:translate-x-1/2">
                          {mm.cols.map((col, ci) => (
                            <div key={col.en + ci} className={cn(ci > 0 && 'mt-1 border-t border-line pt-1')}>
                              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">{lang === 'ar' ? col.ar : col.en}</p>
                              {col.links.map((l) => (
                                <Link key={l.to + l.en} to={l.to} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-surface-2">
                                  {lang === 'ar' ? l.ar : l.en}
                                  {l.badge && <Badge tone="dark">{lang === 'ar' ? l.badge.ar : l.badge.en}</Badge>}
                                </Link>
                              ))}
                            </div>
                          ))}
                          {mm.footer?.map((f) => (
                            <Link key={f.to} to={f.to} className={buttonStyles('primary', 'sm', 'mt-2 w-full gap-2')}><Plus className="size-4" />{lang === 'ar' ? f.ar : f.en}</Link>
                          ))}
                          {mm.socials && (
                            <div className="mt-1 flex items-center justify-center gap-4 border-t border-line px-3 pb-2 pt-3">
                              {SOCIALS.map(({ label, icon: I }) => <a key={label} href="#" aria-label={label} className="text-muted hover:text-ink"><I className="size-[1.1rem]" /></a>)}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              <NavLink to="/auctions" className={({ isActive }) => cn(rowBtn, isActive ? 'bg-surface-2' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
                {t('المزادات', 'Auctions')}
              </NavLink>
            </nav>

            <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
              <LangSwitch />
              <DisplayMenu />
              {user ? (
                <div className="relative ms-1">
                  <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pe-3 ps-1 text-sm font-semibold hover:bg-line">
                    <Avatar name={user.name} src={me?.profile.avatarUrl} className="size-8" />
                    {user.name.split(' ')[0]}
                  </button>
                  <AnimatePresence>
                    {userMenu && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="absolute end-0 top-full mt-2 w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-card">
                        <Link to="/app" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-surface-2"><LayoutDashboard className="size-4" />{t('لوحتي', 'My dashboard')}</Link>
                        <button onClick={async () => { await signOut(); nav('/'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-surface-2"><LogOut className="size-4" />{t('تسجيل الخروج', 'Sign out')}</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <Link to="/login" className={buttonStyles('outline', 'sm', 'ms-1')}>{t('دخول', 'Sign in')}</Link>
                  <Link to="/signup" className={buttonStyles('primary', 'sm')}>{t('ابدأ الآن', 'Get started')}</Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 lg:hidden">
              <LangSwitch />
              <button onClick={() => setMobile((v) => !v)} aria-label={t('القائمة', 'Menu')} aria-expanded={mobile} className="grid size-10 place-items-center rounded-full hover:bg-surface-2">
                {mobile ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>
          </div>

          {/* قائمة الجوال */}
          <AnimatePresence initial={false}>
            {mobile && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="max-h-[75vh] overflow-y-auto lg:hidden">
                <div className="flex flex-col gap-1 px-5 pb-6">
                  {MEGA.map((m) => (
                    <div key={m.id}>
                      <button onClick={() => setOpen((c) => (c === m.id ? null : m.id))} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-base font-medium hover:bg-surface-2">
                        {lang === 'ar' ? m.ar : m.en}
                        <ChevronDown className={cn('size-4 transition-transform', open === m.id && 'rotate-180')} />
                      </button>
                      {open === m.id && (
                        <div className="ms-3 flex flex-col gap-3 border-s border-line ps-4 py-2">
                          {megaFor(m).cols.flatMap((c) => c.links).map((l) => (
                            <Link key={l.to} to={l.to} className="flex items-center gap-2 text-sm text-muted hover:text-ink">{lang === 'ar' ? l.ar : l.en}{l.badge && <Badge tone="dark">{lang === 'ar' ? l.badge.ar : l.badge.en}</Badge>}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link to="/auctions" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-surface-2">{t('المزادات', 'Auctions')}</Link>
                  <div className="mt-2 flex items-center justify-between border-t border-line pt-4"><span className="text-sm text-muted">{t('المظهر وحجم الخط', 'Appearance & text size')}</span><DisplayMenu /></div>
                  <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
                    {user ? (
                      <>
                        <Link to="/app" className={buttonStyles('primary', 'md')}>{t('لوحتي', 'My dashboard')}</Link>
                        <button onClick={async () => { await signOut(); nav('/'); }} className={buttonStyles('outline', 'md')}>{t('تسجيل الخروج', 'Sign out')}</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" className={buttonStyles('outline', 'md')}>{t('دخول', 'Sign in')}</Link>
                        <Link to="/signup" className={buttonStyles('primary', 'md')}>{t('ابدأ الآن', 'Get started')}</Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </header>
  );
}
