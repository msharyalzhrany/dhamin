// أفاتار المستخدم: صورته إن وُجدت، وإلا أول حرفين من اسمه على خلفية الهوية.
// AssistantAvatar = أفاتار المساعد الذكي (شعار ضامن داخل دائرة).
import { cn } from '@/lib/utils';
import { LogoMark } from './Logo';

export function Avatar({ name, src, className }: { name?: string | null; src?: string | null; className?: string }) {
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => [...w][0]).join('').toUpperCase();
  if (src) return <img src={src} alt={name ?? ''} className={cn('size-10 shrink-0 rounded-full object-cover ring-1 ring-line', className)} />;
  return (
    <span
      aria-label={name ?? undefined}
      className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-deep text-[0.8em] font-semibold text-brand ring-1 ring-brand/40 dark:bg-brand dark:text-deep', className)}
    >
      {initials}
    </span>
  );
}

export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-deep ring-1 ring-brand/50', className)}>
      <LogoMark className="size-[62%]" />
    </span>
  );
}
