// بطاقة العقار ثلاثية الأبعاد (PerspectiveFlipCard) — مأخوذة من card-14 ومُكيَّفة:
//  • ألوان الهوية بدل ألوان shadcn الافتراضية
//  • تعمل مع RTL
//  • على الجوال (بدون hover) تنقلب بالضغط
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PerspectiveFlipCardProps {
  className?: string;
  front: ReactNode;
  back: ReactNode;
  h?: string;
  w?: string;
}

export function PerspectiveFlipCard({ className, front, back, h = 'h-[500px]', w = 'w-[360px]' }: PerspectiveFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const touchOnly = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
  return (
    <div
      data-flipped={flipped}
      onClick={() => touchOnly && setFlipped((f) => !f)}
      className={cn('group/p-card [perspective:2000px]', h, w, className)}
    >
      <div
        className={cn(
          'relative h-full w-full rounded-3xl transition-all duration-700 [transform-style:preserve-3d]',
          'group-hover/p-card:[transform:rotateY(180deg)] group-focus-within/p-card:[transform:rotateY(180deg)] group-data-[flipped=true]/p-card:[transform:rotateY(180deg)]',
        )}
      >
        {/* الوجه الأمامي */}
        <div className="absolute inset-0 size-full rounded-3xl border border-line bg-surface text-ink shadow-card [transform-style:preserve-3d] [backface-visibility:hidden]">
          <div className="size-full p-3 [transform-style:preserve-3d]">{front}</div>
        </div>
        {/* الوجه الخلفي */}
        <div className="absolute inset-0 size-full rounded-3xl border border-line bg-surface text-ink shadow-card [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex size-full flex-col items-center justify-center p-7 text-center [transform-style:preserve-3d]">{back}</div>
        </div>
      </div>
    </div>
  );
}
