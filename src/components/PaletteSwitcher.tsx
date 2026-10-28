// أزرار تجربة الألوان (مؤقتة — تُحذف بعد اختيار اللوحة النهائية)
import { applyPalette, usePalette, type PaletteId } from '@/lib/palette';

const SETS: { id: PaletteId; c: string[]; name: string }[] = [
  { id: '1', c: ['#20309A', '#FFFFFF', '#BB232B'], name: 'أزرق ملكي' },
  { id: '2', c: ['#BFE9FF', '#6F3DFF', '#B7B7B7'], name: 'جليدي بنفسجي' },
  { id: '3', c: ['#F3E6D7', '#9B7ED6', '#E4FF3B'], name: 'بيج وليموني' },
];

export function PaletteSwitcher() {
  const cur = usePalette();
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 rounded-xl border border-line bg-surface/95 p-2 shadow-card backdrop-blur" dir="rtl">
      {SETS.map((s) => (
        <button key={s.id} onClick={() => applyPalette(s.id)} title={s.name} aria-label={s.name} aria-pressed={cur === s.id}
          className={'flex overflow-hidden rounded-lg border-2 transition ' + (cur === s.id ? 'scale-105 border-ink' : 'border-transparent opacity-80 hover:opacity-100')}>
          {s.c.map((x) => <span key={x} className="block h-8 w-5" style={{ background: x }} />)}
        </button>
      ))}
    </div>
  );
}
