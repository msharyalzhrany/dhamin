// صفحة تصفّح العقارات — كل الفلاتر محفوظة في رابط الصفحة (?listingType=sale&district=...) فتكون قابلة للمشاركة
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Home, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { api, errText } from '@/lib/api';
import { PropertyFlipCard } from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Select } from '@/components/ui/field';
import { FilterPanel, PRICE_CFG, type Patch } from '@/components/browse/FilterPanel';
import { useToggleFavorite } from '@/components/browse/hooks';
import { usePrefs } from '@/providers/prefs';
import { nameOf, useMeta } from '@/providers/meta';
import { useAuth } from '@/providers/auth';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

type ListRes = { items: Property[]; page: number; pageSize: number; total: number };
const PAGE_SIZE = 12;
const FILTER_KEYS = ['listingType', 'propertyType', 'usage', 'district', 'minPrice', 'maxPrice', 'bedrooms', 'amenity', 'maxMinInvestment', 'q'];

export default function Properties() {
  const { t, lang, num, money, L } = usePrefs();
  const meta = useMeta();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);

  // تحديث الرابط: replace حتى لا نملأ سجل المتصفح، ونرجع للصفحة 1 مع كل تغيير فلتر
  const update = useCallback((patch: Patch) => {
    setParams((old) => {
      const n = new URLSearchParams(old);
      for (const [k, v] of Object.entries(patch)) (v == null || v === '' ? n.delete(k) : n.set(k, v));
      if (!('page' in patch)) n.delete('page');
      // السعر له سلّم مختلف لكل نوع إعلان، فنصفّره عند تغيير النوع
      if ('listingType' in patch && patch.listingType !== old.get('listingType')) { n.delete('minPrice'); n.delete('maxPrice'); n.delete('maxMinInvestment'); }
      return n;
    }, { replace: true });
  }, [setParams]);
  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  const page = Math.max(1, Number(params.get('page')) || 1);
  const sort = params.get('sort') ?? 'newest';
  const qs = useMemo(() => {
    const n = new URLSearchParams();
    for (const k of [...FILTER_KEYS, 'sort']) { const v = params.get(k); if (v) n.set(k, v); }
    n.set('page', String(page));
    n.set('pageSize', String(PAGE_SIZE));
    return n.toString();
  }, [params, page]);

  // نجلب مباشرة (لا useApi) كي نُبقي النتائج السابقة ظاهرة أثناء التحميل بدل وميض الهياكل
  const [data, setData] = useState<ListRes | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    api<ListRes>(`/properties?${qs}`, { signal: ctl.signal })
      .then((d) => { setData(d); setError(null); setLoading(false); })
      .catch((e) => { if (e?.name === 'AbortError') return; setError(e); setLoading(false); });
    return () => ctl.abort();
  }, [qs, user?.id, tick]);

  const applyFav = useCallback((id: string, fav: boolean) => {
    setData((d) => d && { ...d, items: d.items.map((x) => (x.id === id ? { ...x, isFavorite: fav } : x)) });
  }, []);
  const toggleFav = useToggleFavorite(applyFav);

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const lt = params.get('listingType');

  // شرائح الفلاتر النشطة (قابلة للحذف)
  const chips = useMemo(() => {
    const c: { key: string; label: string; clear: Patch }[] = [];
    const get = (k: string) => params.get(k);
    if (get('q')) c.push({ key: 'q', label: `“${get('q')}”`, clear: { q: null } });
    if (get('district')) c.push({ key: 'district', label: nameOf(meta.districts, get('district'), lang), clear: { district: null } });
    if (get('propertyType')) c.push({ key: 'pt', label: nameOf(meta.propertyTypes, get('propertyType'), lang), clear: { propertyType: null } });
    if (get('usage')) c.push({ key: 'us', label: nameOf(meta.usages, get('usage'), lang), clear: { usage: null } });
    if (get('bedrooms')) c.push({ key: 'bd', label: t(`${get('bedrooms')}+ غرف`, `${get('bedrooms')}+ beds`), clear: { bedrooms: null } });
    if (get('amenity')) c.push({ key: 'am', label: nameOf(meta.amenities, get('amenity'), lang), clear: { amenity: null } });
    if (get('minPrice') || get('maxPrice')) {
      const lo = Number(get('minPrice') ?? 0), hi = get('maxPrice');
      c.push({ key: 'pr', label: hi ? `${money(lo)} – ${money(Number(hi))}` : `${t('من', 'From')} ${money(lo)}`, clear: { minPrice: null, maxPrice: null } });
    }
    if (get('maxMinInvestment')) c.push({ key: 'mi', label: t(`حد أدنى ≤ ${money(Number(get('maxMinInvestment')))}`, `Min ≤ ${money(Number(get('maxMinInvestment')))}`), clear: { maxMinInvestment: null } });
    return c;
  }, [params, meta, lang, money, t]);

  const tabs = [
    { id: '', ar: 'الكل', en: 'All' },
    { id: 'sale', ar: 'بيع', en: 'Sale' },
    { id: 'rent', ar: 'إيجار', en: 'Rent' },
    { id: 'invest', ar: 'استثمار', en: 'Invest' },
  ];

  return (
    <div>
      {/* شريط العنوان */}
      <section className="relative overflow-hidden bg-deep pb-10 pt-28 text-white md:pb-14 md:pt-36">
        <div className="bg-grid absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{t('تصفّح', 'Explore')}</span>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-5xl">{t('تصفّح عقارات جدة', 'Browse Jeddah properties')}</h1>
          <p className="mt-3 flex items-center gap-2 text-base text-mist/80">
            <span className="num rounded-full bg-brand px-3 py-0.5 text-sm font-bold text-on-brand" aria-live="polite">{data ? num(total) : '…'}</span>
            {t('عقار متاح للأفراد في جدة', 'properties available from individuals in Jeddah')}
          </p>
          <div role="tablist" aria-label={t('نوع الإعلان', 'Listing type')} className="mt-7 flex w-full gap-1 rounded-full sm:inline-flex sm:w-auto border border-white/15 bg-white/5 p-1">
            {tabs.map((x) => {
              const on = (lt ?? '') === x.id;
              return (
                <button key={x.id} role="tab" aria-selected={on} onClick={() => update({ listingType: x.id || null })}
                  className={cn('relative h-11 min-w-0 flex-1 rounded-full px-2 text-sm sm:flex-none sm:px-5 font-semibold transition-colors', on ? 'text-on-brand' : 'text-mist/80 hover:text-white')}>
                  {on && <motion.span layoutId="browse-tab" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', damping: 28, stiffness: 340 }} />}
                  <span className="relative">{t(x.ar, x.en)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[19.5rem_minmax(0,1fr)] lg:py-12">
        {/* الشريط الجانبي */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-card">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><SlidersHorizontal className="size-5 text-brand-text" />{t('الفلاتر', 'Filters')}</h2>
            <FilterPanel params={params} update={update} reset={reset} />
          </div>
        </aside>

        <section className="min-w-0" aria-busy={loading}>
          {/* شريط الترتيب */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="lg:hidden" onClick={() => setSheet(true)}>
              <SlidersHorizontal className="size-4" />{t('الفلاتر', 'Filters')}
              {chips.length > 0 && <span className="num grid size-5 place-items-center rounded-full bg-brand text-xs text-on-brand">{chips.length}</span>}
            </Button>
            <p className="text-sm text-muted">
              {data ? <><span className="num font-bold text-ink">{num(total)}</span> {t('نتيجة', 'results')}</> : t('جارٍ التحميل…', 'Loading…')}
            </p>
            <label className="ms-auto flex items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">{t('الترتيب', 'Sort')}</span>
              <Select value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })} className="h-11 min-w-44 text-sm" aria-label={t('الترتيب', 'Sort')}>
                <option value="newest">{t('الأحدث', 'Newest')}</option>
                <option value="price_asc">{t('السعر: الأقل أولاً', 'Price: low to high')}</option>
                <option value="price_desc">{t('السعر: الأعلى أولاً', 'Price: high to low')}</option>
              </Select>
            </label>
          </div>

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('الفلاتر النشطة', 'Active filters')}>
              <AnimatePresence initial={false}>
                {chips.map((c) => (
                  <motion.li key={c.key} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                    <button onClick={() => update(c.clear)} aria-label={`${t('إزالة', 'Remove')} ${c.label}`}
                      className="num flex min-h-9 items-center gap-1.5 rounded-full bg-brand-soft py-1.5 ps-3.5 pe-2.5 text-sm font-medium text-brand-text transition hover:brightness-95">
                      {c.label}<X className="size-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
              <li><button onClick={reset} className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"><RotateCcw className="size-3.5" />{t('مسح الكل', 'Clear all')}</button></li>
            </ul>
          )}

          <div className={cn('mt-6 transition-opacity duration-200', loading && data && 'opacity-50')}>
            {error && !data ? (
              <EmptyState icon={<Home className="size-6" />} title={t('تعذّر تحميل العقارات', 'Could not load properties')} text={errText(error, lang)}
                action={<Button onClick={() => setTick((x) => x + 1)}>{t('إعادة المحاولة', 'Try again')}</Button>} />
            ) : !data ? (
              <Grid>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="mx-auto h-[500px] w-full max-w-[380px] rounded-3xl" />)}</Grid>
            ) : data.items.length === 0 ? (
              <EmptyState icon={<Home className="size-6" />} title={t('لا توجد عقارات مطابقة', 'No matching properties')}
                text={t('جرّب تخفيف الفلاتر أو توسيع نطاق السعر.', 'Try loosening the filters or widening the price range.')}
                action={<Button onClick={reset}><RotateCcw className="size-4" />{t('إعادة ضبط الفلاتر', 'Reset filters')}</Button>} />
            ) : (
              <Grid>
                {data.items.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}>
                    <PropertyFlipCard p={p} onFavorite={toggleFav} />
                  </motion.div>
                ))}
              </Grid>
            )}
          </div>

          {data && pages > 1 && <Pagination page={page} pages={pages} onGo={(n) => { update({ page: n === 1 ? null : String(n) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </section>
      </div>

      {/* ورقة الفلاتر للجوال */}
      <AnimatePresence>
        {sheet && (
          <Sheet onClose={() => setSheet(false)} title={t('الفلاتر', 'Filters')}
            footer={<Button className="w-full" size="lg" onClick={() => setSheet(false)}>{t(`عرض ${num(total)} نتيجة`, `Show ${num(total)} results`)}</Button>}>
            <FilterPanel params={params} update={update} reset={reset} />
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function Pagination({ page, pages, onGo }: { page: number; pages: number; onGo: (n: number) => void }) {
  const { t, num } = usePrefs();
  // أرقام الصفحات مع نقاط ... عند الطول
  const list: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i); else if (list[list.length - 1] !== '…') list.push('…');
  const base = 'grid h-11 min-w-11 place-items-center rounded-full border border-line bg-surface px-3 text-sm font-semibold transition hover:border-brand/60 disabled:pointer-events-none disabled:opacity-40';
  return (
    <nav aria-label={t('التنقّل بين الصفحات', 'Pagination')} className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button className={cn(base, 'gap-1.5 px-4')} disabled={page <= 1} onClick={() => onGo(page - 1)} aria-label={t('السابق', 'Previous')}>
        <span className="flex items-center gap-1.5"><ChevronRight className="size-4 rtl:rotate-180" /><span className="hidden sm:inline">{t('السابق', 'Previous')}</span></span>
      </button>
      {list.map((n, i) => n === '…' ? <span key={`e${i}`} className="px-1 text-muted">…</span> : (
        <button key={n} onClick={() => onGo(n)} aria-current={n === page ? 'page' : undefined} aria-label={`${t('صفحة', 'Page')} ${n}`}
          className={cn(base, 'num', n === page && 'border-brand bg-brand text-on-brand hover:border-brand')}>{num(n)}</button>
      ))}
      <button className={cn(base, 'px-4')} disabled={page >= pages} onClick={() => onGo(page + 1)} aria-label={t('التالي', 'Next')}>
        <span className="flex items-center gap-1.5"><span className="hidden sm:inline">{t('التالي', 'Next')}</span><ChevronLeft className="size-4 rtl:rotate-180" /></span>
      </button>
    </nav>
  );
}

// ورقة سفلية تنزلق من الأسفل (للجوال)
function Sheet({ children, footer, title, onClose }: { children: React.ReactNode; footer: React.ReactNode; title: string; onClose: () => void }) {
  const { t } = usePrefs();
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', fn);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-deep/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label={t('إغلاق', 'Close')} className="grid size-11 place-items-center rounded-full hover:bg-surface-2"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2">{children}</div>
        <div className="border-t border-line p-4">{footer}</div>
      </motion.div>
    </motion.div>
  );
}
