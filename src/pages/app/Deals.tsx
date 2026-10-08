// قائمة الصفقات: تبويبات (نشطة/مكتملة/ملغاة ومتنازع عليها/الكل) + بطاقات + عدّاد الحد
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, FileCheck2, Handshake } from 'lucide-react';
import { PropertyImage } from '@/components/PropertyImage';
import { Avatar } from '@/components/Avatar';
import { Button, buttonStyles } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { KindChip, MY_TURN, StatusChip, ACTIVE_STATUSES, useNextLabel, usePriceLine } from '@/components/deals/shared';
import { errText } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';
import { cn } from '@/lib/utils';
import type { DealItem } from '@/lib/types';

type Tab = 'active' | 'completed' | 'closed' | 'all';

export default function Deals() {
  const { t, lang, num, ago } = usePrefs();
  const { me } = useAuth();
  const nextLabel = useNextLabel();
  const priceLine = usePriceLine();
  const { data, error, loading, reload } = useApi<{ items: DealItem[] }>('/deals', { poll: 15000 });
  const [tab, setTab] = useState<Tab>('active');
  const items = data?.items ?? [];

  const groups: Record<Tab, (d: DealItem) => boolean> = {
    active: (d) => ACTIVE_STATUSES.includes(d.status),
    completed: (d) => d.status === 'completed',
    closed: (d) => d.status === 'cancelled' || d.status === 'disputed',
    all: () => true,
  };
  const tabs: { id: Tab; label: string }[] = [
    { id: 'active', label: t('نشطة', 'Active') }, { id: 'completed', label: t('مكتملة', 'Completed') },
    { id: 'closed', label: t('ملغاة ومتنازع عليها', 'Cancelled & disputed') }, { id: 'all', label: t('الكل', 'All') },
  ];
  const shown = items.filter(groups[tab]);
  const used = me?.usage.activeDeals ?? 0;
  const max = me?.limits.activeDeals ?? 3;
  const pending = items.filter((d) => MY_TURN.includes(d.nextAction) && d.status !== 'completed').length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">{t('الصفقات المحمية', 'Protected deals')}</span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{t('صفقاتي', 'My deals')}</h1>
          <p className="mt-2 max-w-xl text-muted">
            {pending > 0 ? t(`لديك ${num(pending)} خطوة بانتظارك.`, `You have ${num(pending)} step${pending > 1 ? 's' : ''} waiting for you.`) : t('كل صفقة لها عقد موثّق وخطوات واضحة من الاتفاق حتى الاستلام.', 'Every deal has a documented contract and clear steps from agreement to receipt.')}
          </p>
        </div>
        {me && (
          <div className="w-full rounded-3xl border border-line bg-surface p-4 shadow-card md:w-72">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{t('الصفقات النشطة', 'Active deals')}</span>
              <span className="num font-bold">{num(used)} / {num(max)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={max}>
              <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (used / Math.max(1, max)) * 100)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <p className="mt-2 text-xs text-muted">{used >= max ? t('وصلت للحد. أنهِ صفقة أو ألغِها لبدء غيرها.', 'Limit reached. Finish or cancel a deal to start another.') : t(`يمكنك بدء ${num(max - used)} صفقة إضافية.`, `You can start ${num(max - used)} more.`)}</p>
          </div>
        )}
      </div>

      {/* التبويبات */}
      <div role="tablist" aria-label={t('تصنيف الصفقات', 'Deal filters')} className="-mx-1 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-card sm:w-fit">
        {tabs.map((x) => {
          const n = items.filter(groups[x.id]).length;
          const on = tab === x.id;
          return (
            <button key={x.id} role="tab" aria-selected={on} onClick={() => setTab(x.id)}
              className={cn('relative min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors', on ? 'text-on-brand' : 'text-muted hover:text-ink')}>
              {on && <motion.span layoutId="deal-tab" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', damping: 28, stiffness: 340 }} />}
              <span className="relative flex items-center gap-2">{x.label}<span className={cn('num rounded-full px-1.5 text-xs', on ? 'bg-deep/15' : 'bg-surface-2')}>{num(n)}</span></span>
            </button>
          );
        })}
      </div>

      {loading && <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>}
      {!!error && !data && (
        <EmptyState title={t('تعذّر تحميل الصفقات', 'Could not load deals')} text={errText(error, lang)} action={<Button variant="outline" onClick={() => reload()}>{t('إعادة المحاولة', 'Retry')}</Button>} />
      )}
      {data && !shown.length && (
        <EmptyState icon={<Handshake className="size-7" />}
          title={tab === 'active' ? t('لا صفقات نشطة', 'No active deals') : tab === 'completed' ? t('لا صفقات مكتملة بعد', 'No completed deals yet') : tab === 'closed' ? t('لا صفقات ملغاة', 'Nothing cancelled') : t('لا صفقات بعد', 'No deals yet')}
          text={t('ابدأ بمحادثة مع مالك عقار، وعندما تتفقان اضغط "ابدأ صفقة" داخل المحادثة.', 'Chat with a property owner, and once you agree press "Start a deal" inside the conversation.')}
          action={<div className="flex gap-2"><Link to="/properties" className={buttonStyles('primary', 'md')}>{t('تصفّح العقارات', 'Browse properties')}</Link><Link to="/app/messages" className={buttonStyles('outline', 'md')}>{t('رسائلي', 'My messages')}</Link></div>} />
      )}

      <motion.ul layout className="grid gap-4 md:grid-cols-2">
        {shown.map((d, i) => {
          const mine = MY_TURN.includes(d.nextAction);
          const cta = nextLabel(d.nextAction, d.other.name.split(' ')[0]);
          return (
            <motion.li key={d.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.4 }}>
              <Link to={`/app/deals/${d.id}`} className="group block overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/60">
                <div className="flex gap-4 p-4">
                  <div className="size-24 shrink-0 overflow-hidden rounded-2xl sm:size-28"><PropertyImage src={d.property.cover} alt={d.property.title} className="transition-transform duration-500 group-hover:scale-105" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><StatusChip status={d.status} /><KindChip kind={d.kind} /></div>
                    <h3 className="mt-2 line-clamp-2 font-bold leading-snug">{d.property.title}</h3>
                    <p className="num mt-1 text-lg font-bold text-brand-text">{priceLine(d.kind, d.agreedPrice, d.durationMonths)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-sm">
                  <Avatar name={d.other.name} src={d.other.avatarUrl} className="size-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.other.name} <span className="text-xs font-normal text-muted">· {d.payerIsMe ? t('أنت الدافع', 'You pay') : t('أنت المستلم', 'You receive')}</span></p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      {d.contractNumber && <><FileCheck2 className="size-3.5" /><span className="num">{d.contractNumber}</span><span aria-hidden>·</span></>}
                      <span>{ago(d.updatedAt)}</span>
                    </p>
                  </div>
                </div>
                {cta && (
                  <div className={cn('flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold', mine ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted')}>
                    <span>{mine ? t('خطوتك التالية: ', 'Your next step: ') : ''}{cta}</span>
                    <ArrowLeft className="size-4 shrink-0 transition-transform rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                  </div>
                )}
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
