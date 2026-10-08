import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefs } from '@/providers/prefs';

export function Badge({ children, tone = 'soft', className }: { children: ReactNode; tone?: 'soft' | 'solid' | 'outline' | 'dark'; className?: string }) {
  const tones = {
    soft: 'bg-brand-soft text-brand-text',
    solid: 'bg-brand text-on-brand',
    outline: 'border border-line text-muted',
    dark: 'bg-deep text-white dark:bg-mist dark:text-deep',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />;
}

export function Progress({ value, className, hatched = true }: { value: number; className?: string; hatched?: boolean }) {
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, Math.max(0, value))}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className={cn('h-full rounded-full bg-brand', hatched && 'hatch')} />
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      {icon && <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-text">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; className?: string }) {
  const { t } = usePrefs();
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', fn);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = prev; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-deep/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn('relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-card', className)}>
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h2 className="text-xl font-bold">{title}</h2>}
              <button onClick={onClose} aria-label={t('إغلاق', 'Close')} className="ms-auto grid size-9 place-items-center rounded-full hover:bg-surface-2"><X className="size-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95',
        active ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand/60', className)}>
      {children}
    </button>
  );
}

export function SectionHead({ eyebrow, title, text, className, align = 'start' }: { eyebrow?: string; title: ReactNode; text?: string; className?: string; align?: 'start' | 'center' }) {
  return (
    <div className={cn('flex max-w-2xl flex-col gap-3', align === 'center' && 'mx-auto items-center text-center', className)}>
      {eyebrow && <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{eyebrow}</span>}
      <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">{title}</h2>
      {text && <p className="text-base leading-relaxed text-muted md:text-lg">{text}</p>}
    </div>
  );
}
