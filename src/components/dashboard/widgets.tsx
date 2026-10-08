// عناصر لوحة التحكم: بطاقات المؤشرات، مسار الصفقات، المهام، العملاء المحتملون، التقويم
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CalendarDays, CheckCircle2, Eye, FileSignature, MessageSquare, Star, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { PropertyImage } from '@/components/PropertyImage';
import { Badge, EmptyState } from '@/components/ui/misc';
import { Counter } from '@/components/Reveal';
import { usePrefs } from '@/providers/prefs';
import { useMeta, nameOf } from '@/providers/meta';
import { cn } from '@/lib/utils';
import type { DealItem, DealStatus } from '@/lib/types';
import { Sparkline } from './charts';

export type DashboardData = {
  kpis: { activeListings: number; views30d: number; favoritesReceived: number; activeDeals: number; completedDeals: number; unreadMessages: number; ratingAvg: number | null; ratingCount: number };
  viewsSeries: { date: string; views: number }[];
  dealsByStatus: Record<DealStatus, number>;
  topProperty: { id: string; title: string; cover: string | null; price: number; viewsCount: number; listingType: string; district: string } | null;
  actions: { dealId: string; action: 'accept' | 'sign' | 'confirm_transfer' | 'confirm_receipt' | 'review'; propertyTitle: string; other: { id: string; name: string } }[];
  leads: { conversationId: string; name: string; property: { id: string; title: string }; lastMessage: string | null; unread: number; at: string }[];
  recentDeals: DealItem[];
};

export const card = 'rounded-3xl border border-line bg-surface shadow-card';

/* ---------- بطاقة مؤشر ---------- */
export function KpiCard({ icon, label, to, children, delay = 0 }: { icon: ReactNode; label: string; to?: string; children: ReactNode; delay?: number }) {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-text">{icon}</span>
        <span className="text-sm font-medium leading-tight text-muted">{label}</span>
      </div>
      <div className="mt-4">{children}</div>
    </>
  );
  const cls = cn(card, 'block p-5 transition-colors', to && 'hover:border-brand/50');
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -3 }}>
      {to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}
    </motion.div>
  );
}

/** رقم كبير متحرك */
export function BigNum({ to, suffix }: { to: number; suffix?: ReactNode }) {
  const { num } = usePrefs();
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      <Counter to={to} format={num} className="num text-3xl font-bold tracking-tight" />
      {suffix && <span className="text-sm font-medium text-muted">{suffix}</span>}
    </p>
  );
}

export function MiniMeter({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
      <motion.div className="hatch h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

/** شارة التغيّر: آخر 15 يوم مقابل ما قبلها */
export function DeltaChip({ cur, prev }: { cur: number; prev: number }) {
  const { t, num } = usePrefs();
  if (cur === 0 && prev === 0) return <span className="text-xs text-muted">{t('لا تغيّر', 'No change')}</span>;
  const pct = prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);
  const up = cur >= prev;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', up ? 'bg-brand-soft text-brand-text' : 'border border-line text-ink')}>
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      <span className="num">{pct === null ? `+${num(cur)}` : `${up ? '+' : ''}${num(pct)}%`}</span>
    </span>
  );
}

export function ViewsKpi({ series, total }: { series: number[]; total: number }) {
  const { t } = usePrefs();
  const cur = series.slice(-15).reduce((a, b) => a + b, 0);
  const prev = series.slice(-30, -15).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="flex items-end justify-between gap-2">
        <BigNum to={total} />
        <Sparkline values={series} className="h-9 w-20 shrink-0" />
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-muted"><DeltaChip cur={cur} prev={prev} /> {t('مقابل الـ15 يوماً السابقة', 'vs previous 15 days')}</p>
    </>
  );
}

/* ---------- مسار الصفقات ---------- */
const ORDER: DealStatus[] = ['negotiating', 'agreed', 'awaiting_signatures', 'awaiting_transfer', 'awaiting_receipt', 'completed', 'disputed', 'cancelled'];
function shade(s: DealStatus) {
  const mix = (p: number) => `color-mix(in srgb, var(--brand) ${p}%, var(--surface))`;
  switch (s) {
    case 'negotiating': return mix(30);
    case 'agreed': return mix(42);
    case 'awaiting_signatures': return mix(55);
    case 'awaiting_transfer': return mix(70);
    case 'awaiting_receipt': return mix(85);
    case 'completed': return 'var(--brand)';
    case 'disputed': return 'var(--ink)';
    default: return 'color-mix(in srgb, var(--ink) 28%, var(--surface))';
  }
}

export function DealStatusChip({ s }: { s: DealStatus }) {
  const { L } = usePrefs();
  const meta = useMeta();
  const label = L(meta.dealStatuses.find((x) => x.id === s)) || s;
  const tone = s === 'completed' ? 'solid' : s === 'cancelled' ? 'outline' : s === 'disputed' ? 'dark' : 'soft';
  return <Badge tone={tone}>{label}</Badge>;
}

export function DealsPipeline({ by, recent }: { by: Record<DealStatus, number>; recent: DealItem[] }) {
  const { t, num, L, money } = usePrefs();
  const meta = useMeta();
  const parts = ORDER.filter((s) => (by[s] ?? 0) > 0);
  const total = parts.reduce((a, s) => a + by[s], 0);
  return (
    <section className={cn(card, 'p-5 sm:p-6')} aria-labelledby="pipe-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pipe-h" className="text-lg font-bold">{t('مسار الصفقات', 'Deals pipeline')}</h2>
        <Link to="/app/deals" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline">{t('كل الصفقات', 'All deals')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
      </div>
      {total === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-muted">{t('لا توجد صفقات بعد. ابدأ محادثة مع مالك عقار لتبدأ أول صفقة.', 'No deals yet. Start a chat with a property owner to open your first deal.')}</p>
      ) : (
        <>
          <div className="mt-4 flex h-5 gap-1 overflow-hidden rounded-full" role="img" aria-label={parts.map((s) => `${L(meta.dealStatuses.find((x) => x.id === s))}: ${num(by[s])}`).join(', ')}>
            {parts.map((s, i) => (
              <motion.div key={s} title={`${L(meta.dealStatuses.find((x) => x.id === s))}: ${by[s]}`}
                className={cn('h-full min-w-2 first:rounded-s-full last:rounded-e-full', s !== 'completed' && s !== 'cancelled' && 'hatch')}
                style={{ backgroundColor: shade(s) }}
                initial={{ flexGrow: 0 }} animate={{ flexGrow: by[s] }} transition={{ delay: 0.1 * i, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
            ))}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {parts.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                <span className="size-3 shrink-0 rounded-full border border-line" style={{ backgroundColor: shade(s) }} />
                <span className="text-muted">{L(meta.dealStatuses.find((x) => x.id === s))}</span>
                <span className="num font-semibold">{num(by[s])}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {recent.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="mb-2 text-sm font-semibold text-muted">{t('آخر الصفقات', 'Recent deals')}</h3>
          <ul className="space-y-1">
            {recent.map((d) => (
              <li key={d.id}>
                <Link to={`/app/deals/${d.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface-2">
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-surface-2"><PropertyImage src={d.property.cover} alt="" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.property.title}</p>
                    <p className="truncate text-xs text-muted">{d.other.name} · <span className="num">{money(d.agreedPrice)}</span></p>
                  </div>
                  <DealStatusChip s={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------- مهام تحتاج إجراءك ---------- */
export function ActionsList({ items }: { items: DashboardData['actions'] }) {
  const { t } = usePrefs();
  const text = (a: DashboardData['actions'][number]) => {
    const n = a.other.name;
    switch (a.action) {
      case 'accept': return { icon: <Star className="size-4" />, title: t(`${n} اقترح صفقة`, `${n} proposed a deal`), cta: t('راجع واقبل', 'Review & accept') };
      case 'sign': return { icon: <FileSignature className="size-4" />, title: t('العقد جاهز لتوقيعك', 'Contract ready for your signature'), cta: t('وقّع الآن', 'Sign now') };
      case 'confirm_transfer': return { icon: <Wallet className="size-4" />, title: t('أكّد تحويل المبلغ', 'Confirm the payment transfer'), cta: t('أكّد التحويل', 'Confirm transfer') };
      case 'confirm_receipt': return { icon: <CheckCircle2 className="size-4" />, title: t('أكّد استلام المبلغ', 'Confirm you received the payment'), cta: t('أكّد الاستلام', 'Confirm receipt') };
      default: return { icon: <Star className="size-4" />, title: t(`قيّم تجربتك مع ${n}`, `Rate your experience with ${n}`), cta: t('أضف تقييماً', 'Add a review') };
    }
  };
  return (
    <section className={cn(card, 'p-5 sm:p-6')} aria-labelledby="act-h">
      <h2 id="act-h" className="text-lg font-bold">{t('يحتاج إجراءك', 'Needs your action')}</h2>
      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-surface-2 px-4 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-text"><CheckCircle2 className="size-6" /></span>
          <p className="font-semibold">{t('كل شيء تمام', "You're all caught up")}</p>
          <p className="text-sm text-muted">{t('لا توجد إجراءات معلّقة عليك الآن.', 'Nothing is waiting on you right now.')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((a, i) => {
            const x = text(a);
            return (
              <motion.li key={`${a.dealId}-${a.action}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }}>
                <Link to={`/app/deals/${a.dealId}`} className="group flex items-center gap-3 rounded-2xl border border-line p-3 transition-colors hover:border-brand/60 hover:bg-brand-soft/50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">{x.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{x.title}</p>
                    <p className="truncate text-xs text-muted">{a.propertyTitle}</p>
                    <p className="mt-0.5 text-xs font-semibold text-brand-text">{x.cta}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- العملاء المحتملون ---------- */
export function LeadsTable({ items }: { items: DashboardData['leads'] }) {
  const { t, ago } = usePrefs();
  return (
    <section className={cn(card, 'p-5 sm:p-6')} aria-labelledby="leads-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="leads-h" className="text-lg font-bold">{t('العملاء المحتملون', 'Leads')}</h2>
        <Link to="/app/messages" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline">{t('كل الرسائل', 'All messages')}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-4"><EmptyState icon={<MessageSquare className="size-6" />} title={t('لا توجد محادثات بعد', 'No conversations yet')} text={t('عندما يتواصل معك مهتم بعقارك سيظهر هنا.', 'When someone contacts you about a listing, they will show up here.')} /></div>
      ) : (
        <div className="mt-3" role="table" aria-label={t('العملاء المحتملون', 'Leads')}>
          <div role="row" className="hidden grid-cols-[1.1fr_1.2fr_1.6fr_auto] gap-4 px-3 pb-2 text-xs font-semibold text-muted md:grid">
            <span role="columnheader">{t('العميل', 'Lead')}</span><span role="columnheader">{t('العقار', 'Property')}</span><span role="columnheader">{t('آخر رسالة', 'Last message')}</span><span role="columnheader" className="w-20 text-end">{t('الوقت', 'Time')}</span>
          </div>
          <ul className="space-y-1 md:space-y-0 md:divide-y md:divide-line">
            {items.map((l) => (
              <li key={l.conversationId} role="row">
                <Link to={`/app/messages/${l.conversationId}`}
                  className="flex flex-col gap-1.5 rounded-2xl border border-line p-3 transition-colors hover:bg-surface-2 md:grid md:grid-cols-[1.1fr_1.2fr_1.6fr_5rem] md:items-center md:gap-4 md:rounded-none md:border-0 md:px-3">
                  <div role="cell" className="flex min-w-0 items-center gap-2.5">
                    <span className="relative shrink-0"><Avatar name={l.name} className="size-9" />{l.unread > 0 && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-2 border-surface bg-brand" aria-label={t('رسائل غير مقروءة', 'Unread messages')} />}</span>
                    <span className={cn('truncate text-sm', l.unread ? 'font-bold' : 'font-semibold')}>{l.name}</span>
                    <span className="ms-auto shrink-0 whitespace-nowrap text-xs text-muted md:hidden">{ago(l.at)}</span>
                  </div>
                  <span role="cell" className="truncate text-xs font-medium text-brand-text md:text-sm md:text-ink">{l.property.title}</span>
                  <span role="cell" className={cn('line-clamp-2 text-xs md:line-clamp-1 md:text-sm', l.unread ? 'font-semibold text-ink' : 'text-muted')}>{l.lastMessage ?? '—'}</span>
                  <span role="cell" className="hidden text-end text-xs text-muted md:block">{ago(l.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------- التقويم ---------- */
export function CalendarCard({ deals }: { deals: DealItem[] }) {
  const { t, lang, num, date } = usePrefs();
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth(), today = now.getDate();
  const weekStart = lang === 'ar' ? 6 : 0; // السبت للعربي، الأحد للإنجليزي
  const names = Array.from({ length: 7 }, (_, i) => date(new Date(Date.UTC(2023, 0, 1 + ((weekStart + i) % 7))), { weekday: 'narrow', timeZone: 'UTC', calendar: 'gregory' }));
  const first = new Date(y, mo, 1).getDay();
  const lead = (first - weekStart + 7) % 7;
  const days = new Date(y, mo + 1, 0).getDate();
  const marked = useMemo(() => {
    const s = new Set<number>();
    deals.forEach((d) => { const x = new Date(d.updatedAt); if (x.getFullYear() === y && x.getMonth() === mo) s.add(x.getDate()); });
    return s;
  }, [deals, y, mo]);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <section className={cn(card, 'p-5 sm:p-6')} aria-labelledby="cal-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cal-h" className="flex items-center gap-2 text-lg font-bold"><CalendarDays className="size-5 text-brand-text" />{date(now, { month: 'long', year: 'numeric', calendar: 'gregory' })}</h2>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label={date(now, { month: 'long', year: 'numeric', calendar: 'gregory' })}>
        {names.map((n, i) => <div key={i} role="columnheader" className="pb-2 text-xs font-semibold text-muted">{n}</div>)}
        {cells.map((c, i) => c === null ? <div key={i} /> : (
          <div key={i} role="gridcell" aria-current={c === today ? 'date' : undefined} className="grid place-items-center py-0.5">
            <span className={cn('relative grid size-9 place-items-center rounded-full text-sm', c === today ? 'bg-brand font-bold text-on-brand' : 'text-ink', c < today && c !== today && 'text-muted')}>
              <span className="num">{num(c)}</span>
              {marked.has(c) && <span className={cn('absolute bottom-1 size-1.5 rounded-full', c === today ? 'bg-on-brand' : 'bg-brand')} aria-label={t('نشاط صفقة', 'Deal activity')} />}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted"><span className="size-1.5 rounded-full bg-brand" />{t('نقطة = نشاط على إحدى صفقاتك في ذلك اليوم', 'Dot = activity on one of your deals that day')}</p>
    </section>
  );
}

/* ---------- أفضل عقار ---------- */
export function TopPropertyCard({ p }: { p: NonNullable<DashboardData['topProperty']> }) {
  const { t, num, money, lang } = usePrefs();
  const meta = useMeta();
  return (
    <section className="group relative isolate flex min-h-72 overflow-hidden rounded-3xl border border-line shadow-card" aria-label={t('أفضل عقار أداءً', 'Top performing listing')}>
      <div className="absolute inset-0 -z-10 transition-transform duration-700 group-hover:scale-105"><PropertyImage src={p.cover} alt="" /></div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-deep via-deep/55 to-deep/10" />
      <div className="flex w-full flex-col justify-between p-5 text-white">
        <Badge tone="solid" className="self-start"><Star className="size-3.5" />{t('الأعلى مشاهدة', 'Most viewed')}</Badge>
        <div>
          <p className="text-xs text-white/75">{nameOf(meta.districts, p.district, lang)}</p>
          <h3 className="mt-1 line-clamp-2 text-xl font-bold leading-snug">{p.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="num font-bold">{money(p.price)}</span>
            <span className="inline-flex items-center gap-1.5 text-white/85"><Eye className="size-4" /><span className="num">{num(p.viewsCount)}</span> {t('مشاهدة', 'views')}</span>
          </div>
          <Link to={`/properties/${p.id}`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand transition hover:brightness-110">
            {t('عرض الإعلان', 'View listing')}<ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
