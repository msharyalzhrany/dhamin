// غرفة الصفقة: المراحل + الخطوة التالية + الأطراف + المبلغ + العقد الرسمي + السجل الزمني
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Ban, ChevronLeft, FileText, LifeBuoy, MessageSquare, Phone, ShieldCheck, Star, Wallet } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { PropertyImage } from '@/components/PropertyImage';
import { Button, buttonStyles } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { ContractDocument } from '@/components/deals/ContractDocument';
import { CancelModal, NextActionCard, Stars } from '@/components/deals/DealActions';
import { DealStepper } from '@/components/deals/DealStepper';
import { KindChip, StatusChip, usePriceLine } from '@/components/deals/shared';
import { TEMPLATE } from '@/components/deals/contractText';
import type { DealDetail } from '@/components/deals/types';
import { errText } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useMeta, nameOf } from '@/providers/meta';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';

const Card = ({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`rounded-3xl border border-line bg-surface p-5 shadow-card ${className}`}>
    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">{icon}{title}</h3>
    {children}
  </section>
);

export default function DealRoom() {
  const { id } = useParams();
  const { t, lang } = usePrefs();
  const { refresh } = useAuth();
  const { data: deal, error, loading, reload } = useApi<DealDetail>(id ? `/deals/${id}` : null, { poll: 5000 });
  const [cancelOpen, setCancelOpen] = useState(false);
  const changed = () => { reload(); refresh(); };

  const crumbs = (
    <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted">
      <Link to="/app/deals" className="font-medium hover:text-ink">{t('الصفقات', 'Deals')}</Link>
      <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
      <span className="max-w-[60vw] truncate text-ink">{deal?.property.title ?? '…'}</span>
    </nav>
  );

  if (loading && !deal) return <div className="mx-auto max-w-6xl space-y-5">{crumbs}<Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-56 rounded-3xl" /></div>;
  if (!deal) return (
    <div className="mx-auto max-w-3xl">{crumbs}
      <EmptyState icon={<ShieldCheck className="size-7" />} title={t('تعذّر فتح الصفقة', 'Could not open this deal')} text={error ? errText(error, lang) : undefined}
        action={<div className="flex gap-2"><Button variant="outline" onClick={() => reload()}>{t('إعادة المحاولة', 'Retry')}</Button><Link to="/app/deals" className={buttonStyles('primary', 'md')}>{t('كل الصفقات', 'All deals')}</Link></div>} />
    </div>
  );
  return <Room deal={deal} crumbs={crumbs} changed={changed} cancelOpen={cancelOpen} setCancelOpen={setCancelOpen} />;
}

function Room({ deal, crumbs, changed, cancelOpen, setCancelOpen }: { deal: DealDetail; crumbs: ReactNode; changed: () => void; cancelOpen: boolean; setCancelOpen: (b: boolean) => void }) {
  const { t, lang, num, money, date } = usePrefs();
  const meta = useMeta();
  const priceLine = usePriceLine();
  const other = deal.role === 'owner' ? deal.counterparty : deal.owner;
  const tpl = TEMPLATE[deal.kind];
  const canCancel = ['negotiating', 'agreed', 'awaiting_signatures', 'awaiting_transfer'].includes(deal.status);
  const needsTicket = deal.status === 'awaiting_receipt' || deal.status === 'disputed';
  const payer = deal.counterparty, receiver = deal.owner;

  // السجل الزمني من حقول الصفقة
  const first = (n: string) => n.split(' ')[0];
  const ev: { at: string; label: string; note?: string }[] = [];
  const proposer = deal.proposedBy === deal.owner.id ? deal.owner : deal.counterparty;
  ev.push({ at: deal.createdAt, label: t(`${first(proposer.name)} اقترح الصفقة`, `${first(proposer.name)} proposed the deal`) });
  if (deal.contract) {
    ev.push({ at: deal.contract.snapshot.createdAt, label: t('قُبل الاقتراح وأُنشئ العقد', 'Proposal accepted, contract created'), note: deal.contract.number });
    for (const s of deal.contract.signatures) ev.push({ at: s.signedAt, label: t(`وقّع ${first(s.signedName)} العقد`, `${first(s.signedName)} signed the contract`) });
    if (deal.contract.signedAt) ev.push({ at: deal.contract.signedAt, label: t('اكتمل التوقيع وخُتم العقد', 'Both signed, contract sealed') });
  }
  if (deal.payerConfirmedAt) ev.push({ at: deal.payerConfirmedAt, label: t(`${first(payer.name)} أكّد التحويل`, `${first(payer.name)} confirmed the transfer`) });
  if (deal.receiverConfirmedAt) ev.push({ at: deal.receiverConfirmedAt, label: t(`${first(receiver.name)} أكّد الاستلام`, `${first(receiver.name)} confirmed receipt`) });
  if (deal.status === 'completed') ev.push({ at: deal.receiverConfirmedAt ?? deal.updatedAt, label: t('اكتملت الصفقة', 'Deal completed') });
  if (deal.status === 'cancelled') ev.push({ at: deal.updatedAt, label: t('أُلغيت الصفقة', 'Deal cancelled'), note: deal.cancelReason ?? undefined });
  if (deal.status === 'disputed') ev.push({ at: deal.updatedAt, label: t('فُتح نزاع على الصفقة', 'A dispute was opened') });
  ev.sort((a, b) => +new Date(a.at) - +new Date(b.at));

  const party = (p: DealDetail['owner'], isOwner: boolean) => {
    const isMe = deal.role === (isOwner ? 'owner' : 'counterparty');
    const role = isOwner ? tpl.a : tpl.b;
    return (
      <div key={p.id} className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3.5">
        <Avatar name={p.name} src={p.avatarUrl} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.name}{isMe && <span className="ms-2 text-xs font-normal text-brand-text">({t('أنت', 'you')})</span>}</p>
          <p className="text-xs text-muted">{t(role.ar, role.en)} · {isOwner ? t('المستلم', 'Receives') : t('الدافع', 'Pays')}</p>
          {p.ratingAvg ? <p className="mt-1 flex items-center gap-1.5 text-xs"><Stars value={Math.round(p.ratingAvg)} size="sm" /><span className="num font-semibold">{num(p.ratingAvg, { maximumFractionDigits: 1 })}</span></p> : <p className="mt-1 text-xs text-muted">{t('بدون تقييمات بعد', 'No ratings yet')}</p>}
          {p.phone ? <a href={`tel:${p.phone}`} className="num mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-brand-text hover:underline" dir="ltr"><Phone className="size-3.5" />{p.phone}</a>
            : <p className="mt-1.5 text-xs text-muted">{t('يظهر الجوال بعد قبول الصفقة', 'Phone appears after the deal is accepted')}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      {crumbs}

      {/* الترويسة */}
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center">
        <Link to={`/properties/${deal.property.id}`} className="block h-40 w-full shrink-0 overflow-hidden rounded-2xl sm:size-32" aria-label={deal.property.title}><PropertyImage src={deal.property.cover} alt={deal.property.title} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><StatusChip status={deal.status} /><KindChip kind={deal.kind} />{deal.contract && <span className="num text-xs font-semibold text-muted">{deal.contract.number}</span>}</div>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-4xl">{deal.property.title}</h1>
          <p className="mt-1 text-sm text-muted">{nameOf(meta.propertyTypes, deal.property.propertyType, lang)} · {nameOf(meta.districts, deal.property.district, lang)}{t('، جدة', ', Jeddah')}</p>
        </div>
        <div className="sm:text-end">
          <p className="text-xs text-muted">{deal.kind === 'invest' ? t('مبلغ الاستثمار', 'Investment') : deal.kind === 'rent' ? t('قيمة الإيجار', 'Rent') : t('السعر المتفق عليه', 'Agreed price')}</p>
          <p className="num text-2xl font-bold text-brand-text md:text-3xl">{money(deal.agreedPrice)}</p>
          {deal.durationMonths ? <p className="num text-sm text-muted">{t(`لمدة ${num(deal.durationMonths)} شهراً`, `for ${num(deal.durationMonths)} months`)}</p> : null}
        </div>
      </motion.header>

      {/* المراحل */}
      <section className="mt-5 rounded-3xl border border-line bg-surface px-5 py-6 shadow-card sm:px-8" aria-label={t('مراحل الصفقة', 'Deal progress')}><DealStepper deal={deal} /></section>

      <div className="mt-5"><NextActionCard deal={deal} onChanged={changed} /></div>

      {(deal.reviews.mine || deal.reviews.theirs) && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {([['mine', t('تقييمك', 'Your review'), t('عن', 'of') + ' ' + first(other.name)], ['theirs', t(`تقييم ${first(other.name)} لك`, `${first(other.name)}'s review of you`), '']] as const).map(([k, title]) => {
            const r = deal.reviews[k];
            return r ? (
              <Card key={k} title={title} icon={<Star className="size-4" />}>
                <Stars value={r.rating} />
                {r.comment ? <p className="mt-3 leading-relaxed">{r.comment}</p> : <p className="mt-3 text-sm text-muted">{t('بدون تعليق', 'No comment')}</p>}
              </Card>
            ) : null;
          })}
        </div>
      )}

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* العقد */}
        <div className="order-2 min-w-0 lg:order-1">
          {deal.contract ? (
            <>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><FileText className="size-5 text-brand-text" />{t('العقد الرسمي', 'Official contract')}</h2>
              <ContractDocument contract={deal.contract} />
            </>
          ) : (
            <Card title={t('العقد', 'Contract')} icon={<FileText className="size-4" />}>
              <p className="leading-relaxed text-muted">{t(`عند قبول الاقتراح يُنشأ ${tpl.title.ar} برقم فريد وختم رقمي، ويوقّعه الطرفان إلكترونياً قبل أي تحويل.`, `When the proposal is accepted, a ${tpl.title.en.toLowerCase()} with a unique number and digital seal is created and signed by both parties before any transfer.`)}</p>
            </Card>
          )}
        </div>

        {/* الجانب */}
        <aside className="order-1 min-w-0 space-y-5 lg:order-2">
          <Card title={t('الأطراف', 'Parties')} icon={<ShieldCheck className="size-4" />} className="space-y-3">
            {party(deal.owner, true)}
            {party(deal.counterparty, false)}
          </Card>

          <Card title={t('ملخص المبلغ', 'Money summary')} icon={<Wallet className="size-4" />}>
            <p className="num text-3xl font-bold">{priceLine(deal.kind, deal.agreedPrice, null)}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">{t('الدافع', 'Payer')}</dt><dd className="font-semibold">{first(payer.name)}{deal.payerIsMe && ` (${t('أنت', 'you')})`}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{t('المستلم', 'Receiver')}</dt><dd className="font-semibold">{first(receiver.name)}{!deal.payerIsMe && ` (${t('أنت', 'you')})`}</dd></div>
              {deal.durationMonths ? <div className="flex justify-between gap-3"><dt className="text-muted">{t('المدة', 'Duration')}</dt><dd className="num font-semibold">{t(`${num(deal.durationMonths)} شهراً`, `${num(deal.durationMonths)} months`)}</dd></div> : null}
              <div className="flex justify-between gap-3"><dt className="text-muted">{t('سعر الإعلان', 'Listed price')}</dt><dd className="num font-semibold">{money(deal.property.price)}</dd></div>
            </dl>
            <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">{t('يُحوَّل المبلغ مباشرة بين الطرفين خارج المنصة؛ ضامن توثّق الاتفاق والتأكيدات ولا تحتفظ بأموال.', 'Money moves directly between the parties outside the platform. Dhamin documents the agreement and confirmations and never holds funds.')}</p>
          </Card>

          <Card title={t('السجل الزمني', 'Timeline')}>
            <ol className="relative space-y-4 border-s-2 border-line ps-5">
              {ev.map((e, i) => (
                <motion.li key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="relative">
                  <span className="absolute -start-[1.72rem] top-1.5 size-3 rounded-full border-2 border-surface bg-brand" aria-hidden />
                  <p className="text-sm font-semibold leading-snug">{e.label}</p>
                  {e.note && <p className="num text-xs text-muted">{e.note}</p>}
                  <p className="num text-xs text-muted">{date(e.at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', calendar: 'gregory' })}</p>
                </motion.li>
              ))}
            </ol>
          </Card>

          <Card title={t('إجراءات أخرى', 'Other actions')} className="flex flex-col gap-2.5">
            <Link to={`/app/messages/${deal.conversationId}`} className={buttonStyles('outline', 'md', 'w-full')}><MessageSquare className="size-4" />{t('فتح المحادثة', 'Open chat')}</Link>
            {needsTicket && <Link to={`/app/support?deal=${deal.id}`} className={buttonStyles('outline', 'md', 'w-full')}><LifeBuoy className="size-4" />{t('فتح تذكرة دعم', 'Open a support ticket')}</Link>}
            {canCancel && <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(true)}><Ban className="size-4" />{deal.status === 'negotiating' && deal.proposedBy === (deal.role === 'owner' ? deal.owner.id : deal.counterparty.id) ? t('سحب الاقتراح', 'Withdraw proposal') : t('إلغاء الصفقة', 'Cancel deal')}</Button>}
            <Link to={`/properties/${deal.property.id}`} className="inline-flex items-center justify-center gap-1.5 py-1 text-sm font-medium text-muted hover:text-ink">{t('عرض صفحة العقار', 'View the property')}<ArrowLeft className="size-4 rtl:rotate-0 ltr:rotate-180" /></Link>
          </Card>
        </aside>
      </div>
      <CancelModal deal={deal} open={cancelOpen} onClose={() => setCancelOpen(false)} onDone={changed} />
    </div>
  );
}
