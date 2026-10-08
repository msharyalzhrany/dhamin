// لوحة الفلاتر: تُعرض في الشريط الجانبي (شاشة كبيرة) وفي الورقة السفلية (جوال) — كل الحالة في رابط الصفحة
import { useEffect, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { Chip } from '@/components/ui/misc';
import { Input, Select } from '@/components/ui/field';
import { RangeSlider } from './RangeSlider';
import { useDebouncedFn } from './hooks';
import { usePrefs } from '@/providers/prefs';
import { useMeta } from '@/providers/meta';

export const PRICE_CFG = {
  sale: { max: 10_000_000, step: 50_000 },
  rent: { max: 250_000, step: 1_000 },
  invest: { max: 50_000, step: 500 },
} as const;
export const ROOMS = ['1', '2', '3', '4', '5'];

export type Patch = Record<string, string | null>;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-0 p-0">
      <legend className="mb-3 text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function PriceFilter({ params, update }: { params: URLSearchParams; update: (p: Patch) => void }) {
  const { t } = usePrefs();
  const lt = params.get('listingType') as keyof typeof PRICE_CFG | null;
  const cfg = lt ? PRICE_CFG[lt] : null;
  const single = lt === 'invest';
  const urlLo = Number(params.get('minPrice') ?? 0);
  const urlHi = Number(single ? params.get('maxMinInvestment') ?? cfg?.max ?? 0 : params.get('maxPrice') ?? cfg?.max ?? 0);
  const [draft, setDraft] = useState<[number, number]>([urlLo, urlHi]);

  // عند تغيّر الرابط من الخارج (إعادة ضبط، حذف شريحة، تغيير النوع) نزامن المسودة
  useEffect(() => { setDraft([urlLo, urlHi]); }, [urlLo, urlHi, lt]);

  const push = useDebouncedFn((v: [number, number]) => {
    if (!cfg) return;
    if (single) update({ maxMinInvestment: v[1] >= cfg.max ? null : String(v[1]) });
    else update({ minPrice: v[0] <= 0 ? null : String(v[0]), maxPrice: v[1] >= cfg.max ? null : String(v[1]) });
  });
  const change = (v: [number, number]) => { setDraft(v); push(v); };

  if (!cfg) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-4">
        <p className="mb-3 text-sm text-muted">{t('اختر نوع الإعلان لتحديد نطاق السعر', 'Pick a listing type to set a price range')}</p>
        <div className="flex flex-wrap gap-2">
          {(['sale', 'rent', 'invest'] as const).map((k) => (
            <Chip key={k} onClick={() => update({ listingType: k })}>{k === 'sale' ? t('بيع', 'Sale') : k === 'rent' ? t('إيجار', 'Rent') : t('استثمار', 'Invest')}</Chip>
          ))}
        </div>
      </div>
    );
  }
  const clamp = (n: number) => Math.min(cfg.max, Math.max(0, Math.round(n)));
  return (
    <div className="space-y-3">
      <RangeSlider min={0} max={cfg.max} step={cfg.step} value={draft} onChange={change} single={single}
        labelLo={t('السعر من', 'Minimum price')} labelHi={single ? t('أقصى حد أدنى للاستثمار', 'Maximum minimum investment') : t('السعر إلى', 'Maximum price')} />
      <div className="flex items-center gap-2">
        {!single && (
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-muted">{t('من', 'From')}</span>
            <Input type="number" inputMode="numeric" min={0} max={cfg.max} step={cfg.step} value={draft[0]} className="num h-11 px-3 text-sm"
              onChange={(e) => change([Math.min(clamp(Number(e.target.value)), draft[1]), draft[1]])} />
          </label>
        )}
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs text-muted">{single ? t('حد أدنى أقصاه', 'Minimum up to') : t('إلى', 'To')}</span>
          <Input type="number" inputMode="numeric" min={0} max={cfg.max} step={cfg.step} value={draft[1]} className="num h-11 px-3 text-sm"
            onChange={(e) => change([draft[0], Math.max(clamp(Number(e.target.value)), draft[0])])} />
        </label>
      </div>
      <p className="text-xs text-muted">
        {t('بالريال السعودي', 'In SAR')}{lt === 'rent' ? t(' — للسنة/الشهر كما في الإعلان', ' — per listing period') : ''}
      </p>
    </div>
  );
}

export function FilterPanel({ params, update, reset }: { params: URLSearchParams; update: (p: Patch) => void; reset: () => void }) {
  const { t, L } = usePrefs();
  const meta = useMeta();
  const [q, setQ] = useState(params.get('q') ?? '');
  const urlQ = params.get('q') ?? '';
  useEffect(() => { setQ(urlQ); }, [urlQ]);
  const pushQ = useDebouncedFn((v: string) => update({ q: v.trim() || null }));
  const set = (k: string, v: string) => update({ [k]: params.get(k) === v ? null : v });
  const rooms = params.get('bedrooms');

  return (
    <div className="space-y-7">
      <Group title={t('الموقع', 'Location')}>
        <label className="relative block">
          <span className="sr-only">{t('ابحث بالكلمات', 'Search by keyword')}</span>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); pushQ(e.target.value); }} placeholder={t('ابحث: فيلا، كورنيش، شقة…', 'Search: villa, corniche…')} className="h-11 ps-10 text-sm" />
        </label>
        <label className="block">
          <span className="sr-only">{t('الحي', 'District')}</span>
          <Select value={params.get('district') ?? ''} onChange={(e) => update({ district: e.target.value || null })} className="h-11 text-sm">
            <option value="">{t('كل أحياء جدة', 'All Jeddah districts')}</option>
            {meta.districts.map((d) => <option key={d.id} value={d.id}>{L(d)}</option>)}
          </Select>
        </label>
      </Group>

      <Group title={params.get('listingType') === 'invest' ? t('الحد الأدنى للاستثمار', 'Minimum investment') : t('السعر', 'Price')}>
        <PriceFilter params={params} update={update} />
      </Group>

      <Group title={t('نوع العقار', 'Property type')}>
        <div className="flex flex-wrap gap-2">
          {meta.propertyTypes.map((x) => <Chip key={x.id} active={params.get('propertyType') === x.id} onClick={() => set('propertyType', x.id)}>{L(x)}</Chip>)}
        </div>
      </Group>

      <Group title={t('الاستخدام', 'Usage')}>
        <div className="flex flex-wrap gap-2">
          {meta.usages.map((x) => <Chip key={x.id} active={params.get('usage') === x.id} onClick={() => set('usage', x.id)}>{L(x)}</Chip>)}
        </div>
      </Group>

      <Group title={t('عدد الغرف', 'Bedrooms')}>
        <div className="flex flex-wrap gap-2">
          <Chip active={!rooms} onClick={() => update({ bedrooms: null })}>{t('الكل', 'Any')}</Chip>
          {ROOMS.map((r) => <Chip key={r} active={rooms === r} onClick={() => set('bedrooms', r)} className="num min-w-11">{r === '5' ? '5+' : r}</Chip>)}
        </div>
      </Group>

      <Group title={t('المرافق', 'Amenities')}>
        <div className="flex flex-wrap gap-2">
          {meta.amenities.map((x) => <Chip key={x.id} active={params.get('amenity') === x.id} onClick={() => set('amenity', x.id)}>{L(x)}</Chip>)}
        </div>
      </Group>

      <button type="button" onClick={reset} className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold text-ink transition hover:bg-surface-2">
        <RotateCcw className="size-4" />{t('إعادة ضبط الفلاتر', 'Reset filters')}
      </button>
    </div>
  );
}
