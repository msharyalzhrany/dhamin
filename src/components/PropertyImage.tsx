// صورة العقار؛ إذا ما فيه صورة نعرض خلفية بهوية ضامن (بدون صور خيالية)
import { cn } from '@/lib/utils';
import { LogoMark } from './Logo';

export function PropertyImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  return (
    <div className={cn('relative grid h-full w-full place-items-center overflow-hidden bg-deep', className)} role="img" aria-label={alt}>
      <div className="bg-grid absolute inset-0 opacity-70" />
      <LogoMark className="relative size-14 opacity-90" />
    </div>
  );
}
