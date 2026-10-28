// شعار ضامن: درع على شكل بيت (سقف مدبّب) + علامة صح = "الصفقة مضمونة"
// الألوان: الدرع أخضر #B4975A والعلامة #0A0807. الكتابة تأخذ لون النص الحالي.
import { cn } from '@/lib/utils';

export function LogoMark({ className, tile = false }: { className?: string; tile?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-9 shrink-0', className)} aria-hidden="true">
      {tile && <rect width="48" height="48" rx="12" fill="var(--deep)" />}
      <path d="M24 7 L38.5 17 V29 C38.5 35.2 32 39.6 24 42 C16 39.6 9.5 35.2 9.5 29 V17 Z" fill="var(--brand)" />
      <path d="M16.8 25.2 L22 30.4 L31.4 19.8" fill="none" stroke="var(--on-brand)" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, markClass, showText = true, stacked = false }: { className?: string; markClass?: string; showText?: boolean; stacked?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', stacked && 'flex-col gap-2', className)} aria-label="ضامن Dhamin">
      <LogoMark className={markClass} />
      {showText && (
        <span className={cn('flex flex-col leading-none', stacked ? 'items-center' : 'items-start')}>
          <span className="font-brand text-[1.7em] font-bold leading-[1.05] tracking-normal" lang="ar" dir="rtl">ضامن</span>
          <span className="mt-1 font-brand text-[0.55em] font-semibold uppercase tracking-[0.42em] text-brand-text" lang="en" dir="ltr">Dhamin</span>
        </span>
      )}
    </span>
  );
}
