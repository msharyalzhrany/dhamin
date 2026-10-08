// لوحة المحادثة: رأس العقار + شريط الصفقة + الرسائل (تحديث كل 3 ثوانٍ) + حقل الإرسال
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ExternalLink, Handshake, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar } from '@/components/Avatar';
import { PropertyImage } from '@/components/PropertyImage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { StartDealModal } from './StartDealModal';
import { KindChip, StatusChip, usePriceLine } from './shared';
import { api, errText } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePrefs } from '@/providers/prefs';
import { useToast } from '@/providers/toast';
import { useAuth } from '@/providers/auth';
import { cn } from '@/lib/utils';
import type { DealStatus, Message } from '@/lib/types';

type Conv = {
  id: string; meId: string;
  property: { id: string; title: string; cover: string | null; listingType: 'sale' | 'rent' | 'invest'; price: number; district: string; propertyType: string };
  other: { id: string; name: string; avatarUrl: string | null };
  deal: { id: string; status: DealStatus } | null;
};
type DealLite = { id: string; status: DealStatus; kind: 'sale' | 'rent' | 'invest'; agreedPrice: number; durationMonths: number | null; proposedBy: string };

const MAX = 1000;
const dayKey = (d: string) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };

export function ChatPane({ id, onBack, onActivity }: { id: string; onBack: () => void; onActivity: () => void }) {
  const { t, lang, date } = usePrefs();
  const toast = useToast();
  const { refresh } = useAuth();
  const { data: conv, error, loading, reload: reloadConv } = useApi<Conv>(`/conversations/${id}`);
  const hasDeal = !!conv?.deal;
  const { data: deal, reload: reloadDeal } = useApi<DealLite>(hasDeal ? `/deals/${conv!.deal!.id}` : null, { poll: 6000 });

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [first, setFirst] = useState(true);
  const [text, setText] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const sendingRef = useRef(0);
  const lastTs = useRef<string | null>(null);
  const [newBelow, setNewBelow] = useState(false);

  // عند تغيّر المحادثة نبدأ من الصفر
  useEffect(() => { setMsgs([]); setFirst(true); lastTs.current = null; stick.current = true; setText(''); }, [id]);

  // دوال متغيرة الهوية نحفظ آخر نسخة منها في ref حتى لا نعيد تشغيل التحديث الدوري
  const fx = useRef({ reloadConv, reloadDeal, refresh, onActivity, meId: '' });
  fx.current = { reloadConv, reloadDeal, refresh, onActivity, meId: conv?.meId ?? '' };

  const merge = useCallback((incoming: Message[]) => {
    if (!incoming.length) return;
    setMsgs((cur) => {
      const have = new Set(cur.map((m) => m.id));
      const add = incoming.filter((m) => !have.has(m.id));
      if (!add.length) return cur;
      return [...cur, ...add].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    });
    const last = incoming[incoming.length - 1].createdAt;
    if (!lastTs.current || +new Date(last) > +new Date(lastTs.current)) lastTs.current = last;
    if (incoming.some((m) => m.kind === 'system')) { const f = fx.current; f.reloadConv(); f.reloadDeal(); f.refresh(); f.onActivity(); }
  }, []);

  // التحديث الدوري: كل 3 ثوانٍ، ويتوقف إذا كان التبويب مخفياً
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden || sendingRef.current > 0) return;
      try {
        const q = lastTs.current ? `?after=${encodeURIComponent(lastTs.current)}` : '';
        const r = await api<{ items: Message[] }>(`/conversations/${id}/messages${q}`);
        if (!alive) return;
        merge(r.items);
        setFirst(false);
        if (r.items.length && !stick.current && r.items.some((m) => m.senderId !== fx.current.meId)) setNewBelow(true);
      } catch { /* نحاول في الدورة التالية */ }
    };
    pull();
    const iv = setInterval(pull, 3000);
    const vis = () => !document.hidden && pull();
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }, [id, merge]);

  // تمرير تلقائي للأسفل إلا إذا كان المستخدم قد صعد لقراءة القديم
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) { el.scrollTop = el.scrollHeight; setNewBelow(false); }
  }, [msgs, deal?.status]);
  const onScroll = () => {
    const el = scroller.current; if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (stick.current) setNewBelow(false);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || body.length > MAX || !conv) return;
    const tmp: Message = { id: `tmp-${Date.now()}`, senderId: conv.meId, body, kind: 'text', createdAt: new Date().toISOString() };
    stick.current = true;
    setMsgs((x) => [...x, tmp]); setText('');
    sendingRef.current += 1;
    try {
      const real = await api<Message>(`/conversations/${id}/messages`, { method: 'POST', body: { body } });
      setMsgs((x) => x.filter((m) => m.id !== tmp.id && m.id !== real.id).concat(real).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)));
      if (!lastTs.current || +new Date(real.createdAt) > +new Date(lastTs.current)) lastTs.current = real.createdAt;
      onActivity();
    } catch (e) {
      setMsgs((x) => x.filter((m) => m.id !== tmp.id));
      setText(body);
      toast(errText(e, lang), 'err');
    } finally { sendingRef.current -= 1; }
  };

  // مجموعة الرسائل مع فواصل الأيام
  const rows = useMemo(() => {
    const out: ({ type: 'day'; key: string; label: string } | { type: 'msg'; m: Message })[] = [];
    let prev = '';
    const todayK = dayKey(new Date().toISOString());
    const yK = dayKey(new Date(Date.now() - 864e5).toISOString());
    for (const m of msgs) {
      const k = dayKey(m.createdAt);
      if (k !== prev) {
        prev = k;
        out.push({ type: 'day', key: k, label: k === todayK ? t('اليوم', 'Today') : k === yK ? t('أمس', 'Yesterday') : date(m.createdAt, { weekday: 'long', day: 'numeric', month: 'long', calendar: 'gregory' }) });
      }
      out.push({ type: 'msg', m });
    }
    return out;
  }, [msgs, t, date]);

  if (error) return <div className="grid flex-1 place-items-center p-8 text-center"><div><p className="mb-3 font-medium">{errText(error, lang)}</p><Button variant="outline" onClick={() => reloadConv()}>{t('إعادة المحاولة', 'Retry')}</Button></div></div>;
  if (loading || !conv) return <div className="flex-1 space-y-4 p-5"><Skeleton className="h-16" /><Skeleton className="h-10 w-2/3" /><Skeleton className="ms-auto h-10 w-1/2" /><Skeleton className="h-10 w-3/5" /></div>;

  const canStart = !conv.deal || conv.deal.status === 'cancelled';
  const over = text.length > MAX;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* رأس: العقار + الطرف الآخر */}
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-4">
        <button onClick={onBack} aria-label={t('رجوع للمحادثات', 'Back to conversations')} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-2 lg:hidden">
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <Link to={`/properties/${conv.property.id}`} className="size-12 shrink-0 overflow-hidden rounded-xl" aria-label={conv.property.title}>
          <PropertyImage src={conv.property.cover} alt={conv.property.title} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{conv.other.name}</p>
          <Link to={`/properties/${conv.property.id}`} className="group flex items-center gap-1 text-xs text-muted hover:text-ink">
            <span className="truncate">{conv.property.title}</span><ExternalLink className="size-3 shrink-0 opacity-60 group-hover:opacity-100" />
          </Link>
        </div>
        <Avatar name={conv.other.name} src={conv.other.avatarUrl} className="hidden size-10 sm:grid" />
      </header>

      <DealStrip conv={conv} deal={deal} canStart={canStart} onStart={() => setStartOpen(true)} onChanged={() => { reloadDeal(); reloadConv(); refresh(); onActivity(); }} />

      {/* الرسائل */}
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} className="h-full space-y-1.5 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
          {first && !msgs.length && <div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="ms-auto h-10 w-1/2" /></div>}
          {!first && !msgs.length && <p className="py-10 text-center text-sm text-muted">{t('ابدأ المحادثة بتحية. لا تشارك بيانات حساسة خارج المنصة.', 'Start the conversation with a greeting. Never share sensitive data outside the platform.')}</p>}
          {rows.map((r) => r.type === 'day' ? (
            <div key={`d-${r.key}`} className="flex justify-center py-2"><span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">{r.label}</span></div>
          ) : r.m.kind === 'system' ? (
            <div key={r.m.id} className="flex justify-center py-1.5">
              <span className="max-w-[92%] rounded-2xl border border-line bg-surface-2 px-4 py-2 text-center text-xs leading-relaxed text-muted">{r.m.body}</span>
            </div>
          ) : (
            <Bubble key={r.m.id} m={r.m} mine={r.m.senderId === conv.meId} />
          ))}
        </div>
        {newBelow && (
          <button onClick={() => { const el = scroller.current; if (el) { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); } }}
            className="absolute inset-x-0 bottom-3 mx-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-on-brand shadow-card">
            <ArrowUp className="size-3.5 rotate-180" />{t('رسائل جديدة', 'New messages')}
          </button>
        )}
      </div>

      {/* الإرسال */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="chat-input" className="sr-only">{t('اكتب رسالة', 'Write a message')}</label>
            <textarea id="chat-input" value={text} rows={1} placeholder={t('اكتب رسالتك…', 'Write your message…')}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              className={cn('block max-h-32 min-h-11 w-full resize-none rounded-2xl border bg-surface px-4 py-2.5 text-[0.95rem] outline-none transition focus:ring-4 focus:ring-brand/20', over ? 'border-ink' : 'border-line focus:border-brand')}
              style={{ height: `${Math.min(8, Math.max(2.75, 1.6 * (text.split('\n').length) + 1.1))}rem` }} />
          </div>
          <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!text.trim() || over} aria-label={t('إرسال', 'Send')}>
            <ArrowUp className="size-5" />
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><Lock className="size-3" />{t('Enter للإرسال · Shift+Enter لسطر جديد', 'Enter to send · Shift+Enter for a new line')}</span>
          <span className={cn('num', over && 'font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4')}>{text.length}/{MAX}</span>
        </div>
      </form>

      <StartDealModal open={startOpen} onClose={() => setStartOpen(false)} conversationId={id} propertyId={conv.property.id}
        onCreated={() => { setStartOpen(false); reloadConv(); reloadDeal(); onActivity(); }} />
    </div>
  );
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const { date } = usePrefs();
  const pending = m.id.startsWith('tmp-');
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: pending ? 0.7 : 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }}
      className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 sm:max-w-[70%]', mine ? 'rounded-ee-md bg-brand text-on-brand' : 'rounded-es-md bg-surface-2 text-ink')}>
        <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{m.body}</p>
        <p className={cn('num mt-0.5 text-end text-[0.68rem]', mine ? 'text-on-brand/70' : 'text-muted')}>{date(m.createdAt, { hour: 'numeric', minute: '2-digit' })}</p>
      </div>
    </motion.div>
  );
}

// شريط الصفقة: لا صفقة → زر البدء | صفقة → الحالة + فتح الغرفة + بطاقة قبول/رفض إن كان الاقتراح من الطرف الآخر
function DealStrip({ conv, deal, canStart, onStart, onChanged }: { conv: Conv; deal: DealLite | null; canStart: boolean; onStart: () => void; onChanged: () => void }) {
  const { t, lang } = usePrefs();
  const toast = useToast();
  const nav = useNavigate();
  const priceLine = usePriceLine();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const act = async (kind: 'accept' | 'decline') => {
    if (!deal) return;
    setBusy(kind); setErr(null);
    try {
      if (kind === 'accept') {
        await api(`/deals/${deal.id}/accept`, { method: 'POST', body: {} });
        toast(t('تمت الموافقة وأُنشئ العقد', 'Accepted. The contract has been created'));
        onChanged(); nav(`/app/deals/${deal.id}`);
      } else {
        await api(`/deals/${deal.id}/cancel`, { method: 'POST', body: { reason: t('تم رفض اقتراح الصفقة', 'The deal proposal was declined') } });
        toast(t('تم رفض الاقتراح', 'Proposal declined'));
        onChanged();
      }
    } catch (e) { setErr(errText(e, lang)); } finally { setBusy(null); }
  };

  if (!conv.deal || !deal) {
    return canStart || !conv.deal ? (
      <div className="flex items-center justify-between gap-3 border-b border-line bg-brand-soft/60 px-4 py-2.5">
        <p className="min-w-0 text-sm text-muted">{conv.deal?.status === 'cancelled' ? t('الصفقة السابقة أُلغيت. يمكنك بدء صفقة جديدة.', 'The previous deal was cancelled. You can start a new one.') : t('اتفقتما على الشروط؟ وثّقها كصفقة محمية.', 'Agreed on terms? Make it a protected deal.')}</p>
        <Button size="sm" onClick={onStart} className="shrink-0"><Handshake className="size-4" />{t('ابدأ صفقة', 'Start a deal')}</Button>
      </div>
    ) : null;
  }
  const theirs = deal.status === 'negotiating' && deal.proposedBy !== conv.meId;
  return (
    <div className="border-b border-line bg-brand-soft/60 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusChip status={deal.status} /><KindChip kind={deal.kind} />
          <span className="num text-sm font-semibold">{priceLine(deal.kind, deal.agreedPrice, deal.durationMonths)}</span>
        </div>
        <div className="flex items-center gap-2">
          {canStart && <Button size="sm" variant="outline" onClick={onStart}>{t('صفقة جديدة', 'New deal')}</Button>}
          <Link to={`/app/deals/${deal.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-deep px-4 text-sm font-semibold text-white dark:bg-mist dark:text-deep">
            {t('افتح غرفة الصفقة', 'Open deal room')}<ArrowLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
          </Link>
        </div>
      </div>
      {theirs && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-line bg-surface p-3.5">
          <p className="text-sm font-semibold">{t(`${conv.other.name.split(' ')[0]} اقترح صفقة بـ`, `${conv.other.name.split(' ')[0]} proposed a deal at`)} <span className="num">{priceLine(deal.kind, deal.agreedPrice, deal.durationMonths)}</span></p>
          <p className="mt-0.5 text-xs text-muted">{t('عند الموافقة يُنشأ العقد للتوقيع. يمكنك رفض الاقتراح إن لم يناسبك.', 'Accepting creates the contract for signing. You can decline if it does not suit you.')}</p>
          {err && <p role="alert" className="mt-2 text-sm font-medium underline decoration-brand decoration-2 underline-offset-4">{err}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => act('accept')} loading={busy === 'accept'} disabled={!!busy}>{t('قبول الصفقة', 'Accept')}</Button>
            <Button size="sm" variant="outline" onClick={() => act('decline')} loading={busy === 'decline'} disabled={!!busy}>{t('رفض', 'Decline')}</Button>
          </div>
        </motion.div>
      )}
      {deal.status === 'negotiating' && !theirs && <p className="mt-1.5 text-xs text-muted">{t('اقتراحك بانتظار رد الطرف الآخر.', 'Your proposal is waiting for their reply.')}</p>}
    </div>
  );
}
