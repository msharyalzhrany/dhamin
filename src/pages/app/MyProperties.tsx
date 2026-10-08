// عقاراتي /app/properties — قائمة إعلاناتي مع فلترة بالحالة وإجراءات (تعديل/إغلاق/أرشفة)
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Archive, Eye, ExternalLink, Home, Lock, Pencil, Plus, RotateCcw, XCircle } from 'lucide-react';
import { Button, LinkButton, buttonStyles } from '@/components/ui/button';
import { Badge, EmptyState, Modal, Skeleton } from '@/components/ui/misc';
import { PropertyImage } from '@/components/PropertyImage';
import { priceLabel } from '@/components/PropertyCard';
import { usePrefs } from '@/providers/prefs';
import { useMeta, nameOf } from '@/providers/meta';
import { useAuth } from '@/providers/auth';
import { useToast } from '@/providers/toast';
import { useApi } from '@/lib/useApi';
import { api, errText } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

type St = Property['status'];
const TABS: ('all' | St)[] = ['all', 'active', 'reserved', 'closed', 'archived'];

export function PropStatusChip({ s }: { s: St }) {
  const { t } = usePrefs();
  const map: Record<St, [string, 'solid' | 'soft' | 'outline' | 'dark']> = {
    active: [t('نشط', 'Active'), 'solid'], reserved: [t('محجوز', 'Reserved'), 'dark'],
    closed: [t('مغلق', 'Closed'), 'outline'], archived: [t('مؤرشف', 'Archived'), 'outline'],
  };
  return <Badge tone={map[s][1]}>{map[s][0]}</Badge>;
}

export default function MyProperties() {
  const { t, lang, num, money, date, L } = usePrefs();
  const meta = useMeta();
  const { me, refresh } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ items: Property[] }>('/properties/mine');
  const [tab, setTab] = useState<'all' | St>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Property | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);

  const items = data?.items ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [items]);
  const list = tab === 'all' ? items : items.filter((p) => p.status === tab);
  const used = me?.usage.activeListings ?? 0, max = me?.limits.activeListings ?? 5;
  const full = used >= max;
  const tabLabel = (k: 'all' | St) => ({ all: t('الكل', 'All'), active: t('نشط', 'Active'), reserved: t('محجوز', 'Reserved'), closed: t('مغلق', 'Closed'), archived: t('مؤرشف', 'Archived') })[k];

  async function setStatus(p: Property, status: 'active' | 'closed' | 'archived') {
    setBusy(p.id); setLimitMsg(null);
    try {
      await api(`/properties/${p.id}`, { method: 'PATCH', body: { status } });
      toast(status === 'active' ? t('أُعيد فتح الإعلان', 'Listing reopened') : status === 'closed' ? t('تم إغلاق الإعلان', 'Listing closed') : t('تمت أرشفة الإعلان', 'Listing archived'));
      await Promise.all([reload(), refresh()]);
    } catch (e: any) {
      const msg = errText(e, lang);
      if (e?.code === 'LIMIT_REACHED') setLimitMsg(msg);
      toast(msg, 'err');
    } finally { setBusy(null); setConfirm(null); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{t('إعلاناتي', 'My listings')}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{t('عقاراتي', 'My properties')}</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-48 rounded-2xl border border-line bg-surface p-3">
            <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">{t('إعلانات نشطة', 'Active listings')}</span><span className="num font-bold">{num(used)} / {num(max)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-line"><motion.div className="hatch h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (used / Math.max(1, max)) * 100)}%` }} /></div>
          </div>
          {full ? <Button disabled><Plus className="size-4" />{t('إضافة عقار', 'Add property')}</Button> : <LinkButton to="/app/properties/new"><Plus className="size-4" />{t('إضافة عقار', 'Add property')}</LinkButton>}
        </div>
      </header>

      {(full || limitMsg) && (
        <div className="flex items-start gap-3 rounded-2xl border border-brand/40 bg-brand-soft p-4 text-sm" role="status">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-brand-text" />
          <p>{limitMsg ?? t(`وصلت للحد الأقصى (${num(max)} إعلانات نشطة). أغلق أحد إعلاناتك لتتمكن من إضافة أو إعادة فتح إعلان آخر.`, `You reached the limit (${num(max)} active listings). Close one of your listings to add or reopen another.`)}</p>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1" role="tablist" aria-label={t('تصفية بالحالة', 'Filter by status')}>
        {TABS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('relative min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors', tab === k ? 'text-on-brand' : 'text-muted hover:text-ink')}>
            {tab === k && <motion.span layoutId="mp-tab" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
            <span className="relative">{tabLabel(k)} <span className="num opacity-70">{num(counts[k] ?? 0)}</span></span>
          </button>
        ))}
      </div>

      {loading && !data && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>}
      {error != null && !data && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-10 text-center" role="alert">
          <AlertCircle className="size-8" /><p className="font-semibold">{errText(error, lang)}</p>
          <Button variant="outline" onClick={reload}>{t('إعادة المحاولة', 'Try again')}</Button>
        </div>
      )}
      {data && list.length === 0 && (
        <EmptyState icon={<Home className="size-6" />}
          title={items.length === 0 ? t('لم تضف أي عقار بعد', 'No listings yet') : t('لا توجد إعلانات بهذه الحالة', 'No listings with this status')}
          text={items.length === 0 ? t('أضف أول إعلان لك ليظهر للمهتمين في جدة.', 'Add your first listing so buyers and tenants in Jeddah can find it.') : undefined}
          action={items.length === 0 && !full ? <LinkButton to="/app/properties/new"><Plus className="size-4" />{t('إضافة عقار', 'Add property')}</LinkButton> : undefined} />
      )}

      <ul className="space-y-4">
        <AnimatePresence initial={false}>
          {list.map((p) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-3 shadow-card sm:flex-row sm:p-4">
              <div className="h-44 w-full shrink-0 overflow-hidden rounded-2xl bg-surface-2 sm:h-auto sm:min-h-32 sm:w-52"><PropertyImage src={p.cover} alt={p.title} /></div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-lg font-bold leading-snug">{p.title}</h2>
                    <p className="mt-1 text-sm text-muted">{nameOf(meta.districts, p.district, lang)} · <span>{date(p.createdAt, { year: 'numeric', month: 'short', day: 'numeric', calendar: 'gregory' })}</span></p>
                  </div>
                  <PropStatusChip s={p.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{L(meta.listingTypes.find((x) => x.id === p.listingType))}</Badge>
                  <Badge tone="outline">{L(meta.propertyTypes.find((x) => x.id === p.propertyType))}</Badge>
                  <Badge tone="outline">{L(meta.usages.find((x) => x.id === p.usage))}</Badge>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                  <div className="flex items-center gap-5">
                    <div><p className="text-xs text-muted">{p.investment ? t('المبلغ المستهدف', 'Target') : t('السعر', 'Price')}</p><p className="num font-bold">{p.investment ? money(p.investment.targetAmount) : priceLabel(p, money, lang)}</p></div>
                    <div><p className="text-xs text-muted">{t('المشاهدات', 'Views')}</p><p className="flex items-center gap-1 font-bold"><Eye className="size-4 text-brand-text" /><span className="num">{num(p.viewsCount ?? 0)}</span></p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.status !== 'archived' && <Link to={`/properties/${p.id}`} className={buttonStyles('ghost', 'sm')}><ExternalLink className="size-4" />{t('الصفحة العامة', 'Public page')}</Link>}
                    {p.status !== 'archived' && <Link to={`/app/properties/${p.id}/edit`} className={buttonStyles('outline', 'sm')}><Pencil className="size-4" />{t('تعديل', 'Edit')}</Link>}
                    {p.status === 'active' && <Button size="sm" variant="soft" loading={busy === p.id} onClick={() => setStatus(p, 'closed')}><Lock className="size-4" />{t('إغلاق', 'Close')}</Button>}
                    {(p.status === 'closed' || p.status === 'archived') && <Button size="sm" variant="soft" loading={busy === p.id} onClick={() => setStatus(p, 'active')}><RotateCcw className="size-4" />{t('إعادة فتح', 'Reopen')}</Button>}
                    {(p.status === 'active' || p.status === 'closed') && <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => setConfirm(p)}><Archive className="size-4" />{t('أرشفة', 'Archive')}</Button>}
                    {p.status === 'reserved' && <span className="inline-flex items-center gap-1.5 text-xs text-muted"><XCircle className="size-4" />{t('محجوز بصفقة جارية', 'Reserved by an open deal')}</span>}
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={t('أرشفة الإعلان؟', 'Archive this listing?')}>
        <p className="text-sm leading-relaxed text-muted">{t('سيختفي الإعلان من الموقع ولن يظهر للزوار. يمكنك إعادة فتحه لاحقاً من تبويب «مؤرشف».', 'The listing will disappear from the site. You can reopen it later from the “Archived” tab.')}</p>
        {confirm && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm font-semibold">{confirm.title}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>{t('إلغاء', 'Cancel')}</Button>
          <Button variant="dark" loading={!!confirm && busy === confirm.id} onClick={() => confirm && setStatus(confirm, 'archived')}><Archive className="size-4" />{t('أرشفة', 'Archive')}</Button>
        </div>
      </Modal>
    </div>
  );
}
