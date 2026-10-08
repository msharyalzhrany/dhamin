// معرض صور العقار: صورة كبيرة + مصغّرات + عارض ملء الشاشة (أسهم/ESC/سحب)
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from 'lucide-react';
import { PropertyImage } from '@/components/PropertyImage';
import { usePrefs } from '@/providers/prefs';
import { cn } from '@/lib/utils';

export function Gallery({ images, title, overlay }: { images: string[]; title: string; overlay?: React.ReactNode }) {
  const { t, num } = usePrefs();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const n = images.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % Math.max(n, 1)), [n]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-surface-2 sm:aspect-[16/10]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.button key={i} type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}
            onClick={() => n > 0 && setOpen(true)} aria-label={t('تكبير الصورة', 'Open image viewer')} className="absolute inset-0 block size-full cursor-zoom-in">
            <PropertyImage src={images[i]} alt={`${title} — ${i + 1}`} className="" />
          </motion.button>
        </AnimatePresence>
        {overlay}
        {n > 0 && (
          <>
            <span className="num pointer-events-none absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-deep/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <Images className="size-3.5" />{i + 1} / {n}
            </span>
            <button type="button" onClick={() => setOpen(true)} aria-label={t('عرض بملء الشاشة', 'Fullscreen')}
              className="absolute bottom-3 start-3 grid size-11 place-items-center rounded-full bg-deep/80 text-white backdrop-blur transition hover:bg-deep"><Maximize2 className="size-4" /></button>
          </>
        )}
        {n > 1 && (
          <>
            <NavBtn side="start" onClick={() => go(-1)} label={t('السابقة', 'Previous')} />
            <NavBtn side="end" onClick={() => go(1)} label={t('التالية', 'Next')} />
          </>
        )}
      </div>

      {n > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, k) => (
            <li key={src + k} className="shrink-0">
              <button type="button" onClick={() => setI(k)} aria-label={`${t('صورة', 'Image')} ${num(k + 1)}`} aria-current={k === i}
                className={cn('block h-16 w-24 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-28', k === i ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100')}>
                <PropertyImage src={src} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>{open && n > 0 && <Lightbox images={images} index={i} setIndex={setI} title={title} onClose={() => setOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function NavBtn({ side, onClick, label }: { side: 'start' | 'end'; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className={cn('absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink shadow-lg backdrop-blur transition hover:scale-105', side === 'start' ? 'start-3' : 'end-3')}>
      {side === 'start' ? <ChevronLeft className="size-5 rtl:rotate-180" /> : <ChevronRight className="size-5 rtl:rotate-180" />}
    </button>
  );
}

function Lightbox({ images, index, setIndex, title, onClose }: { images: string[]; index: number; setIndex: (n: number) => void; title: string; onClose: () => void }) {
  const { t, dir, num } = usePrefs();
  const n = images.length;
  const rtl = dir === 'rtl';
  const closeRef = useRef<HTMLButtonElement>(null);
  // "التالي" بصرياً: يمين في LTR ويسار في RTL
  const next = useCallback((d: 1 | -1) => setIndex((index + d + n) % n), [index, n, setIndex]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next(rtl ? -1 : 1);
      else if (e.key === 'ArrowLeft') next(rtl ? 1 : -1);
      else if (e.key === 'Tab') e.preventDefault(); // نُبقي التركيز داخل العارض
    };
    document.addEventListener('keydown', fn);
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = prevOverflow; prevFocus?.focus(); };
  }, [next, onClose, rtl]);

  return (
    <motion.div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[95] flex flex-col bg-black/95"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex items-center justify-between p-4 text-white">
        <span className="num text-sm font-semibold">{num(index + 1)} / {num(n)}</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t('إغلاق', 'Close')} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
      </div>
      <div className="relative flex-1 overflow-hidden" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img key={index} src={images[index]} alt={`${title} — ${index + 1}`} drag="x" dragSnapToOrigin dragElastic={0.4}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 70) next((info.offset.x < 0) !== rtl ? 1 : -1); }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 m-auto max-h-full max-w-full select-none object-contain px-2 sm:px-16" draggable={false} />
        </AnimatePresence>
        {n > 1 && (
          <>
            <button type="button" onClick={() => next(-1)} aria-label={t('السابقة', 'Previous')} className="absolute start-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"><ChevronLeft className="size-6 rtl:rotate-180" /></button>
            <button type="button" onClick={() => next(1)} aria-label={t('التالية', 'Next')} className="absolute end-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"><ChevronRight className="size-6 rtl:rotate-180" /></button>
          </>
        )}
      </div>
    </motion.div>
  );
}
