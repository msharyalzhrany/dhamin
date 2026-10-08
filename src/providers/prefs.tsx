// تفضيلات الزائر: اللغة (عربي/إنجليزي) + الثيم (فاتح/داكن/تلقائي) + حجم الخط
// تُحفظ في المتصفح وتُطبَّق على <html> مباشرة. من أي مكان استخدم:  const { t, lang } = usePrefs()
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'ar' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export const FONT_STEPS = [0.875, 1, 1.125, 1.25, 1.4] as const;

type Prefs = { lang: Lang; theme: Theme; font: number };
const KEY = 'dhamin-prefs';

function load(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      lang: p.lang === 'en' ? 'en' : 'ar',
      theme: ['light', 'dark', 'system'].includes(p.theme) ? p.theme : 'system',
      font: typeof p.font === 'number' && p.font >= 0 && p.font < FONT_STEPS.length ? p.font : 1,
    };
  } catch {
    return { lang: 'ar', theme: 'system', font: 1 };
  }
}

type Ctx = Prefs & {
  dark: boolean;
  dir: 'rtl' | 'ltr';
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  fontUp: () => void;
  fontDown: () => void;
  fontReset: () => void;
  /** t('نص عربي', 'English text') — يرجع النص المناسب للغة الحالية */
  t: (ar: string, en: string) => string;
  /** عنصر من الباك اند فيه {ar,en} */
  L: (x?: { ar: string; en: string } | null) => string;
  /** أرقام وتواريخ حسب اللغة (أرقام لاتينية دائماً) */
  num: (n: number, opts?: Intl.NumberFormatOptions) => string;
  money: (n: number) => string;
  date: (d: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string;
  ago: (d: string | number | Date) => string;
};

const PrefsCtx = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Prefs>(load);
  const [sysDark, setSysDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const dark = p.theme === 'dark' || (p.theme === 'system' && sysDark);
  const dir = p.lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const d = document.documentElement;
    d.lang = p.lang;
    d.dir = dir;
    d.classList.toggle('dark', dark);
    d.style.fontSize = `${16 * FONT_STEPS[p.font]}px`; // كل أحجام Tailwind بالـ rem فتكبر/تصغر معه
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* وضع خاص */ }
  }, [p, dark, dir]);

  const loc = p.lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US';
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(loc, { numeric: 'auto' }), [loc]);

  const value = useMemo<Ctx>(() => ({
    ...p, dark, dir,
    setLang: (lang) => setP((x) => ({ ...x, lang })),
    setTheme: (theme) => setP((x) => ({ ...x, theme })),
    fontUp: () => setP((x) => ({ ...x, font: Math.min(FONT_STEPS.length - 1, x.font + 1) })),
    fontDown: () => setP((x) => ({ ...x, font: Math.max(0, x.font - 1) })),
    fontReset: () => setP((x) => ({ ...x, font: 1 })),
    t: (ar, en) => (p.lang === 'ar' ? ar : en),
    L: (x) => (x ? x[p.lang] : ''),
    num: (n, o) => new Intl.NumberFormat(loc, o).format(n),
    money: (n) => `${new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(n)} ${p.lang === 'ar' ? 'ر.س' : 'SAR'}`,
    date: (d, o) => new Intl.DateTimeFormat(loc, o ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d)),
    ago: (d) => {
      const s = Math.round((new Date(d).getTime() - Date.now()) / 1000);
      const abs = Math.abs(s);
      if (abs < 60) return rtf.format(0, 'second');
      if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
      if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
      return rtf.format(Math.round(s / (86400 * 30)), 'month');
    },
  }), [p, dark, dir, loc, rtf]);

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error('usePrefs must be used inside PrefsProvider');
  return c;
}
