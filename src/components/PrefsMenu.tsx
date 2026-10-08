// أدوات العرض: تحويل اللغة + الثيم (فاتح/داكن/تلقائي) + تكبير/تصغير الخط
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Languages, Monitor, Moon, Sun, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FONT_STEPS, usePrefs, type Lang, type Theme } from '@/providers/prefs';

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', esc); };
  }, [open, close]);
  return ref;
}

const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'ar', label: 'العربية', short: 'AR' },
  { code: 'en', label: 'English', short: 'EN' },
];

const pop = {
  initial: { opacity: 0, y: -6, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.97 },
  transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] as const },
};

export function LangSwitch({ className, dark = false }: { className?: string; dark?: boolean }) {
  const { lang, setLang, t } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const cur = LANGS.find((l) => l.code === lang)!;
  return (
    <div className={cn('relative', className)} ref={ref} onMouseLeave={() => setOpen(false)}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t('تغيير اللغة', 'Change language')}
        className={cn('flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors', dark ? 'text-white/85 hover:bg-white/10' : 'text-ink hover:bg-surface-2', open && (dark ? 'bg-white/10' : 'bg-surface-2'))}>
        <Languages className="size-4" />
        <span className="num">{cur.short}</span>
        <ChevronDown className={cn('size-3.5 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div {...pop} className="absolute end-0 top-full z-30 mt-2 w-44 rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-card">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium hover:bg-surface-2">
                <span>{l.label} <span className="text-muted num">({l.short})</span></span>
                {l.code === lang && <Check className="size-4 text-brand-text" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DisplayMenu({ className, dark = false }: { className?: string; dark?: boolean }) {
  const { theme, setTheme, font, fontUp, fontDown, fontReset, t } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const themes: { id: Theme; icon: typeof Sun; ar: string; en: string }[] = [
    { id: 'light', icon: Sun, ar: 'فاتح', en: 'Light' },
    { id: 'dark', icon: Moon, ar: 'داكن', en: 'Dark' },
    { id: 'system', icon: Monitor, ar: 'تلقائي', en: 'Auto' },
  ];
  return (
    <div className={cn('relative', className)} ref={ref} onMouseLeave={() => setOpen(false)}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t('المظهر وحجم الخط', 'Appearance and text size')}
        className={cn('grid size-10 place-items-center rounded-full transition-colors', dark ? 'text-white/85 hover:bg-white/10' : 'text-ink hover:bg-surface-2', open && (dark ? 'bg-white/10' : 'bg-surface-2'))}>
        <Type className="size-[1.1rem]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div {...pop} className="absolute end-0 top-full z-30 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 text-ink shadow-card">
            <p className="mb-2 px-1 text-xs font-semibold text-muted">{t('المظهر', 'Appearance')}</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
              {themes.map(({ id, icon: I, ar, en }) => (
                <button key={id} onClick={() => setTheme(id)} aria-pressed={theme === id}
                  className={cn('flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition', theme === id ? 'bg-brand text-on-brand shadow' : 'text-muted hover:text-ink')}>
                  <I className="size-4" />{t(ar, en)}
                </button>
              ))}
            </div>
            <p className="mb-2 mt-4 px-1 text-xs font-semibold text-muted">{t('حجم الخط', 'Text size')}</p>
            <div className="flex items-center gap-2">
              <button onClick={fontDown} disabled={font === 0} aria-label={t('تصغير الخط', 'Decrease text size')} className="grid size-10 place-items-center rounded-xl border border-line text-sm font-bold hover:bg-surface-2 disabled:opacity-40">A−</button>
              <button onClick={fontReset} className="flex-1 rounded-xl bg-surface-2 py-2 text-center text-xs font-semibold" aria-label={t('الحجم الافتراضي', 'Reset text size')}>
                <span className="num">{Math.round(FONT_STEPS[font] * 100)}%</span>
              </button>
              <button onClick={fontUp} disabled={font === FONT_STEPS.length - 1} aria-label={t('تكبير الخط', 'Increase text size')} className="grid size-10 place-items-center rounded-xl border border-line text-base font-bold hover:bg-surface-2 disabled:opacity-40">A+</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
