// منزلق سعر بمقبضين (أو مقبض واحد) مكتوب يدوياً بحقلي <input type=range> فيكون قابلاً للوصول بلوحة المفاتيح
import './range.css';
import { cn } from '@/lib/utils';

const THUMB = 1.75; // rem — نفس حجم الإبهام في range.css

type Props = {
  min: number; max: number; step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  single?: boolean; // مقبض واحد (الحد الأعلى فقط)
  labelLo: string; labelHi: string;
  className?: string;
};

export function RangeSlider({ min, max, step, value, onChange, single, labelLo, labelHi, className }: Props) {
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  // الإبهام الأصلي لا يصل لحافة المسار تماماً، فنعوّض الفرق حتى ينطبق التعبئة على المقبض
  const pos = (v: number) => `calc(${pct(v)}% + ${(0.5 - pct(v) / 100) * THUMB}rem)`;
  const from = single ? min : lo;
  return (
    <div className={cn('relative h-11 w-full', className)} dir="inherit">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
      <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand"
        style={{ insetInlineStart: single ? '0px' : pos(from), insetInlineEnd: `calc(100% - ${pos(hi)})` }} />
      {!single && (
        <input type="range" className="dh-range" min={min} max={max} step={step} value={lo} aria-label={labelLo}
          style={{ zIndex: lo > max - (max - min) * 0.1 ? 3 : 2 }}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi - step), hi])} />
      )}
      <input type="range" className="dh-range" min={min} max={max} step={step} value={hi} aria-label={labelHi} style={{ zIndex: 2 }}
        onChange={(e) => onChange([lo, Math.max(Number(e.target.value), single ? min : lo + step)])} />
    </div>
  );
}
