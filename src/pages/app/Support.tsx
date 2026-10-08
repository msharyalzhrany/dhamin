// الدعم /app/support — فتح تذكرة، تذاكري وحالاتها، بطاقات مساعدة
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ChevronDown, HelpCircle, LifeBuoy, MessageCircleQuestion, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc';
import { usePrefs } from '@/providers/prefs';
import { useMeta } from '@/providers/meta';
import { useToast } from '@/providers/toast';
import { useApi } from '@/lib/useApi';
import { api, errText } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DealItem } from '@/lib/types';

type Ticket = { id: string; dealId: string | null; subject: string; body: string; status: 'open' | 'in_review' | 'resolved' | 'closed'; createdAt: string };

function TicketRow({ tk }: { tk: Ticket }) {
  const { t, L, date } = usePrefs();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const label = L(meta.ticketStatuses.find((s) => s.id === tk.status)) || tk.status;
  return (
    <li className="rounded-2xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 p-4 text-start">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{tk.subject}</p>
          <p className="text-xs text-muted">{date(tk.createdAt, { year: 'numeric', month: 'short', day: 'numeric', calendar: 'gregory' })}</p>
        </div>
        <Badge tone={tk.status === 'resolved' ? 'solid' : tk.status === 'closed' ? 'outline' : 'soft'}>{label}</Badge>
        <ChevronDown className={cn('size-5 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-label={open ? t('إخفاء', 'Collapse') : t('عرض', 'Expand')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="whitespace-pre-wrap break-words border-t border-line p-4 text-sm leading-relaxed text-muted">{tk.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function Support() {
  const { t, lang, num } = usePrefs();
  const toast = useToast();
  const [sp] = useSearchParams();
  const tickets = useApi<{ items: Ticket[] }>('/tickets');
  const deals = useApi<{ items: DealItem[] }>('/deals');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [dealId, setDealId] = useState(sp.get('deal') ?? '');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (subject.trim().length < 3) er.subject = t('الموضوع قصير (3 أحرف على الأقل)', 'Subject is too short (min 3 characters)');
    if (subject.trim().length > 120) er.subject = t('الموضوع طويل (120 حرفاً كحد أقصى)', 'Subject is too long (max 120 characters)');
    if (body.trim().length < 10) er.body = t('اشرح المشكلة بشكل أوضح (10 أحرف على الأقل)', 'Please explain in more detail (min 10 characters)');
    if (body.trim().length > 3000) er.body = t('النص أطول من 3000 حرف', 'Message is over 3000 characters');
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api('/tickets', { method: 'POST', body: { subject: subject.trim(), body: body.trim(), ...(dealId ? { dealId } : {}) } });
      toast(t('وصلتنا تذكرتك وسنراجعها قريباً', 'Ticket received — we will review it soon'));
      setSubject(''); setBody(''); setDealId('');
      tickets.reload();
    } catch (err) { toast(errText(err, lang), 'err'); } finally { setBusy(false); }
  }

  const helps = [
    { icon: HelpCircle, title: t('كيف تعمل الصفقات؟', 'How do deals work?'), text: t('تفاوض في المحادثة، اقبل العرض، وقّع العقد إلكترونياً، ثم أكّد التحويل والاستلام. نحفظ كل خطوة.', 'Negotiate in chat, accept the offer, sign the contract online, then confirm transfer and receipt. Every step is recorded.') },
    { icon: ShieldCheck, title: t('تواصل آمن', 'Stay safe'), text: t('لا تحوّل مبالغ خارج مسار الصفقة، ولا تشارك بياناتك البنكية في المحادثة.', 'Never pay outside the deal flow and never share bank details in chat.') },
    { icon: MessageCircleQuestion, title: t('جرّب المساعد الذكي', 'Try the assistant'), text: t('اضغط على فقاعة المساعد أسفل الشاشة للحصول على إجابة فورية على أسئلتك الشائعة.', 'Tap the assistant bubble at the bottom of the screen for instant answers.') },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{t('نحن هنا لمساعدتك', "We're here to help")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{t('الدعم', 'Support')}</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {helps.map(({ icon: I, title, text }) => (
          <div key={title} className="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-text"><I className="size-5" /></span>
            <h2 className="mt-3 font-bold">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold"><LifeBuoy className="size-5 text-brand-text" />{t('فتح تذكرة جديدة', 'Open a new ticket')}</h2>
          <Field label={t('الموضوع', 'Subject')} error={errs.subject}>{(id) => <Input id={id} value={subject} maxLength={140} onChange={(e) => setSubject(e.target.value)} aria-invalid={!!errs.subject} />}</Field>
          <Field label={t('صفقة مرتبطة (اختياري)', 'Related deal (optional)')} hint={t('اربطها بصفقتك إن كانت المشكلة تخصها', 'Link it to your deal if the issue is about it')}>{(id) => (
            <Select id={id} value={dealId} onChange={(e) => setDealId(e.target.value)}>
              <option value="">{t('بدون', 'None')}</option>
              {(deals.data?.items ?? []).map((d) => <option key={d.id} value={d.id}>{d.property.title} · {d.other.name}</option>)}
            </Select>
          )}</Field>
          <Field label={t('تفاصيل المشكلة', 'Details')} error={errs.body} hint={<span className="num">{num(body.length)} / 3000</span>}>{(id) => <Textarea id={id} rows={6} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errs.body} />}</Field>
          <Button type="submit" loading={busy}><Send className="size-4 rtl:-scale-x-100" />{t('إرسال التذكرة', 'Send ticket')}</Button>
        </form>

        <section className="space-y-3" aria-labelledby="tk-h">
          <h2 id="tk-h" className="text-xl font-bold">{t('تذاكري', 'My tickets')}</h2>
          {tickets.loading && !tickets.data && <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>}
          {tickets.error != null && !tickets.data && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-8 text-center" role="alert"><AlertCircle className="size-7" /><p className="text-sm font-semibold">{errText(tickets.error, lang)}</p><Button variant="outline" size="sm" onClick={tickets.reload}>{t('إعادة المحاولة', 'Try again')}</Button></div>
          )}
          {tickets.data && tickets.data.items.length === 0 && <EmptyState icon={<LifeBuoy className="size-6" />} title={t('لا توجد تذاكر', 'No tickets yet')} text={t('عند فتح تذكرة ستظهر هنا مع حالتها.', 'Tickets you open will show up here with their status.')} />}
          <ul className="space-y-2">{tickets.data?.items.map((tk) => <TicketRow key={tk.id} tk={tk} />)}</ul>
        </section>
      </div>
    </div>
  );
}
