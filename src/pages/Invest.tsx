// صفحة الفرص الاستثمارية + محاكي الاستثمار (محاكاة فقط — لا أسهم حقيقية)
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Calculator, Gavel, Info, Timer, TrendingUp, Wallet, Coins, Landmark } from 'lucide-react';
import { api, errText } from '@/lib/api';
import { Button, LinkButton } from '@/components/ui/button';
import { Chip, EmptyState, Progress, Skeleton, Badge } from '@/components/ui/misc';
import { Input, Select } from '@/components/ui/field';
import { Reveal } from '@/components/Reveal';
import { InvestSimulator } from '@/components/browse/InvestSimulator';
import { usePrefs } from '@/providers/prefs';
import { nameOf, useMeta } from '@/providers/meta';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

type SortKey = 'return' | 'min' | 'funded' | 'term';

export default function Invest() {
  const { t, lang } = usePrefs();
  const meta = useMeta();
  const [sp, setSp] = useSearchParams();
  const [items, setItems] = useState<Property[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  const [sort, setSort] = useState<SortKey>('return');
  const [budget, setBudget] = useState('');
  const [district, setDistrict] = useState('');
  const [sel, setSel] = useState(sp.get('opp') ?? '');

  useEffect(() => {
    setError(null);
    api<{ items: Property[] }>('/properties?listingType=invest&pageSize=24').then((d) => setItems(d.items)).catch(setError);
  }, [tick]);

  const shown = useMemo(() => {
    let l = (items ?? []).filter((p) => p.investment);
    if (district) l = l.filter((p) => p.district === district);
    const b = Number(budget);
    if (b > 0) l = l.filter((p) => p.investment!.minInvestment <= b);
    const k = (p: Property) => p.investment!;
    return [...l].sort((a, b2) => sort === 'return' ? k(b2).expectedReturnPct - k(a).expectedReturnPct : sort === 'min' ? k(a).minInvestment - k(b2).minInvestment : sort === 'funded' ? k(b2).progressPct - k(a).progressPct : k(a).durationMonths - k(b2).durationMonths);
  }, [items, district, budget, sort]);

  const simItems = (items ?? []).filter((p) => p.investment);
  const selected = simItems.find((p) => p.id === sel)?.id ?? simItems[0]?.id ?? '';
  const pick = (id: string) => { setSel(id); setSp((o) => { const n = new URLSearchParams(o); n.set('opp', id); return n; }, { replace: true }); };
  const toSim = (id: string) => { pick(id); document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth' }); };

  const sorts: { id: SortKey; ar: string; en: string }[] = [
    { id: 'return', ar: 'الأعلى عائداً', en: 'Highest return' },
    { id: 'min', ar: 'الأقل حداً أدنى', en: 'Lowest minimum' },
    { id: 'funded', ar: 'الأكثر تغطية', en: 'Most funded' },
    { id: 'term', ar: 'الأقصر مدة', en: 'Shortest term' },
  ];

  return (
    <div>
      <section className="relative isolate overflow-hidden pb-16 pt-32 text-white md:pb-24 md:pt-44">
        <img src="/img/riyadh-night.jpg" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-deep/85" />
        <div className="bg-grid absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl space-y-5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{t('الاستثمار العقاري', 'Real-estate investing')}</span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">{t('استثمر في عقارات جدة بحصص صغيرة', 'Invest in Jeddah property with small tickets')}</h1>
            <p className="text-lg leading-relaxed text-mist/80">{t('اختر فرصة، جرّب المبلغ في المحاكي، ثم ابدأ صفقة موثّقة بعقد مختوم وتوقيع إلكتروني.', 'Pick an opportunity, test your amount in the simulator, then start a deal backed by a sealed contract and e-signature.')}</p>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur"><Info className="size-4 shrink-0 text-brand" />{t('محاكاة استثمارية — لا تُباع أسهم حقيقية', 'Simulation only — no real shares are sold')}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="#opportunities" className="inline-flex h-12 items-center rounded-full bg-brand px-7 font-semibold text-on-brand transition hover:brightness-110">{t('تصفّح الفرص', 'See opportunities')}</a>
              <a href="#simulator" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 font-semibold backdrop-blur hover:bg-white/20"><Calculator className="size-4" />{t('جرّب المحاكي', 'Try the simulator')}</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="opportunities" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">{t('الفرص المتاحة', 'Open opportunities')}</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{t('فرص استثمارية نشطة', 'Active investment opportunities')}</h2></div>
        </div>
        <div className="mb-8 flex flex-wrap items-end gap-4 rounded-3xl border border-line bg-surface p-4 shadow-card">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('الترتيب', 'Sort')}>
            {sorts.map((s) => <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>{t(s.ar, s.en)}</Chip>)}
          </div>
          <label className="block min-w-40 flex-1 sm:flex-none"><span className="mb-1 block text-xs text-muted">{t('ميزانيتي (ريال)', 'My budget (SAR)')}</span>
            <Input type="number" inputMode="numeric" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={t('الحد الأدنى ≤ ميزانيتي', 'Minimum ≤ budget')} className="num h-11 text-sm" /></label>
          <label className="block min-w-44 flex-1 sm:flex-none"><span className="mb-1 block text-xs text-muted">{t('الحي', 'District')}</span>
            <Select value={district} onChange={(e) => setDistrict(e.target.value)} className="h-11 text-sm"><option value="">{t('كل الأحياء', 'All districts')}</option>{meta.districts.map((d) => <option key={d.id} value={d.id}>{d[lang]}</option>)}</Select></label>
        </div>

        {error ? (
          <EmptyState icon={<Landmark className="size-6" />} title={t('تعذّر تحميل الفرص', 'Could not load opportunities')} text={errText(error, lang)} action={<Button onClick={() => setTick((x) => x + 1)}>{t('إعادة المحاولة', 'Try again')}</Button>} />
        ) : !items ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[27rem] rounded-3xl" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={<Landmark className="size-6" />} title={t('لا توجد فرص مطابقة', 'No matching opportunities')} text={t('غيّر الميزانية أو الحي لرؤية المزيد.', 'Change the budget or district to see more.')}
            action={<Button onClick={() => { setBudget(''); setDistrict(''); }}>{t('مسح التصفية', 'Clear filters')}</Button>} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{shown.map((p, i) => <Reveal key={p.id} delay={Math.min(i, 5) * 0.05}><OppCard p={p} onSim={() => toSim(p.id)} /></Reveal>)}</div>
        )}
      </section>

      <section id="simulator" className="scroll-mt-24 bg-surface-2/60 py-14 md:py-20">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6">
          <Reveal className="max-w-2xl space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">{t('المحاكي', 'Simulator')}</span>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('احسب عائدك قبل أن تقرر', 'Estimate your return before you decide')}</h2>
          </Reveal>
          {!items ? <Skeleton className="h-96 rounded-3xl" /> : simItems.length ? <InvestSimulator items={simItems} selectedId={selected} onSelect={pick} /> : <EmptyState icon={<Calculator className="size-6" />} title={t('لا توجد فرص للمحاكاة حالياً', 'No opportunities to simulate yet')} />}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Link to="/auctions" className="group flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card transition hover:border-brand/60">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-text"><Gavel className="size-6" /></span>
          <div className="min-w-0 flex-1"><p className="font-bold">{t('المزادات — قريباً', 'Auctions — coming soon')}</p><p className="text-sm text-muted">{t('نجهّز مزادات عقارية شفافة داخل ضامن.', 'We are preparing transparent property auctions on Dhamin.')}</p></div>
          <ArrowRight className="size-5 text-muted transition group-hover:text-brand-text rtl:rotate-180" />
        </Link>
      </section>
    </div>
  );
}

function OppCard({ p, onSim }: { p: Property; onSim: () => void }) {
  const { t, money, num, lang } = usePrefs();
  const meta = useMeta();
  const inv = p.investment!;
  const remaining = Math.max(0, inv.targetAmount - inv.raisedAmount);
  const cells = [
    { i: Wallet, l: t('الحد الأدنى', 'Minimum'), v: money(inv.minInvestment) },
    { i: Timer, l: t('المدة', 'Term'), v: `${num(inv.durationMonths)} ${t('شهر', 'mo')}` },
    { i: TrendingUp, l: t('العائد الصافي المتوقع', 'Expected net return'), v: `${num(inv.expectedReturnPct)}%` },
    { i: Coins, l: t('المبلغ المتبقي', 'Remaining'), v: money(remaining) },
  ];
  return (
    <article className="flex h-full flex-col gap-5 rounded-3xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:border-brand/50">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><Badge>{nameOf(meta.propertyTypes, p.propertyType, lang)}</Badge><Badge tone="outline">{nameOf(meta.districts, p.district, lang)}</Badge></div>
        <h3 className="line-clamp-2 min-h-[3.2rem] text-xl font-bold leading-snug"><Link to={`/properties/${p.id}`} className="hover:text-brand-text">{p.title}</Link></h3>
      </div>
      <div>
        <p className="text-xs text-muted">{t('المبلغ المحصّل', 'Amount raised')}</p>
        <p className="num text-3xl font-bold tracking-tight">{money(inv.raisedAmount)}</p>
        <div className="mt-3 space-y-1.5"><Progress value={inv.progressPct} />
          <p className="flex justify-between text-xs text-muted"><span>{t('نسبة التغطية', 'Coverage')} <span className="num font-bold text-ink">{inv.progressPct}%</span></span><span>{t('من', 'of')} <span className="num">{money(inv.targetAmount)}</span></span></p></div>
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        {cells.map((c) => <div key={c.l} className="rounded-2xl bg-surface-2 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted"><c.i className="size-3.5 shrink-0 text-brand-text" />{c.l}</dt><dd className="num mt-1 text-sm font-bold">{c.v}</dd></div>)}
      </dl>
      <div className="mt-auto grid gap-2 pt-1">
        <LinkButton to={`/properties/${p.id}`} size="lg" className="w-full">{t('استثمر الآن', 'Invest now')}<ArrowRight className="size-4 rtl:rotate-180" /></LinkButton>
        <button type="button" onClick={onSim} className={cn('h-11 rounded-full text-sm font-semibold text-brand-text transition hover:bg-brand-soft')}><Calculator className="me-1.5 inline size-4" />{t('جرّب في المحاكي', 'Try in simulator')}</button>
      </div>
    </article>
  );
}
