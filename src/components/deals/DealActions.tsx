// بطاقة "الخطوة التالية" في غرفة الصفقة + نوافذ التوقيع والتأكيد والإلغاء والتقييم
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, Ban, CheckCircle2, FileSignature, Hourglass, Landmark, PackageCheck, PenLine, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/misc';
import { api, ApiError, errText } from '@/lib/api';
import { usePrefs } from '@/providers/prefs';
import { useToast } from '@/providers/toast';
import { useAuth } from '@/providers/auth';
import { cn } from '@/lib/utils';
import { TEMPLATE } from './contractText';
import type { DealDetail } from './types';

export const SIG_FONT = "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', 'Lucida Handwriting', cursive";

/** يشغّل طلباً مع حالة تحميل وخطأ مترجم */
function useAction(done: () => void) {
  const { lang } = usePrefs();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<{ code: string; text: string } | null>(null);
  const run = async (key: string, path: string, body: unknown, okText: string) => {
    setBusy(key); setErr(null);
    try { await api(path, { method: 'POST', body }); done(); return okText; }
    catch (e) { setErr({ code: e instanceof ApiError ? e.code : 'ERROR', text: errText(e, lang) }); return null; }
    finally { setBusy(null); }
  };
  return { busy, err, setErr, run };
}

function ErrorNote({ err, dealId }: { err: { code: string; text: string } | null; dealId: string }) {
  const { t } = usePrefs();
  if (!err) return null;
  return (
    <div role="alert" className="rounded-2xl border border-brand/50 bg-brand-soft p-3.5 text-sm">
      <p className="font-semibold">{err.text}</p>
      {err.code === 'USE_TICKET' && <Link to={`/app/support?deal=${dealId}`} className="mt-1 inline-block font-semibold text-brand-text underline underline-offset-4">{t('افتح تذكرة دعم', 'Open a support ticket')}</Link>}
      {err.code === 'DEAL_LIMIT' && <Link to="/app/deals" className="mt-1 inline-block font-semibold text-brand-text underline underline-offset-4">{t('إدارة صفقاتي', 'Manage my deals')}</Link>}
    </div>
  );
}

// ---------------------------------------------------------------
// نافذة التوقيع
// ---------------------------------------------------------------
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

export function SignModal({ deal, open, onClose, onDone }: { deal: DealDetail; open: boolean; onClose: () => void; onDone: () => void }) {
  const { t, money, num } = usePrefs();
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const { busy, err, run } = useAction(onDone);
  const c = deal.contract;
  if (!c) return null;
  const tpl = TEMPLATE[c.snapshot.templateType];
  const accountName = user?.name ?? '';
  const match = norm(name) === norm(accountName) && name.trim().length > 0;
  const mismatch = name.trim().length > 0 && !match;
  const myRole = deal.role === 'owner' ? tpl.a : tpl.b;

  const submit = async () => {
    const ok = await run('sign', `/deals/${deal.id}/sign`, { signedName: name.trim() }, t('تم توقيع العقد', 'Contract signed'));
    if (ok) { toast(ok); onClose(); setName(''); setAgree(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('توقيع العقد', 'Sign the contract')}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-surface-2 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-text">{tpl.title.ar} · {tpl.title.en}</p>
          <p className="num mt-1 font-bold">{c.number}</p>
          <p className="mt-1">{c.snapshot.property.title}</p>
          <p className="mt-1 text-muted">{t('القيمة', 'Amount')}: <span className="num font-bold text-ink">{money(c.snapshot.price)}</span>
            {c.snapshot.durationMonths ? <> · {t(`${num(c.snapshot.durationMonths)} شهراً`, `${num(c.snapshot.durationMonths)} months`)}</> : null}</p>
          <p className="mt-1 text-muted">{t('صفتك في العقد', 'Your role')}: <span className="font-semibold text-ink">{t(myRole.ar, myRole.en)}</span></p>
        </div>

        <Field label={t('اكتب اسمك كما هو في حسابك', 'Type your name exactly as on your account')}
          hint={<>{t('الاسم المسجّل:', 'Account name:')} <span className="font-semibold text-ink">{accountName}</span></>}
          error={mismatch ? t('الاسم لا يطابق اسم حسابك', 'This does not match your account name') : null}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" dir="auto" placeholder={accountName} />}
        </Field>

        {/* معاينة التوقيع بخط يدوي */}
        <div aria-live="polite">
          <p className="mb-1.5 text-sm font-medium">{t('معاينة توقيعك', 'Your signature preview')}</p>
          <div className={cn('flex min-h-24 items-center justify-center rounded-2xl border-2 border-dashed px-4 py-4 transition-colors', match ? 'border-brand bg-brand-soft' : 'border-line bg-surface-2')}>
            {name.trim() ? <motion.span key={name.length} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="break-words text-center text-4xl leading-tight" style={{ fontFamily: SIG_FONT, fontStyle: 'italic' }} dir="auto">{name}</motion.span>
              : <span className="flex items-center gap-2 text-sm text-muted"><PenLine className="size-4" />{t('سيظهر توقيعك هنا', 'Your signature will appear here')}</span>}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--brand)]" />
          <span>{t('قرأت العقد وأوافق على جميع بنوده، وأعتبر كتابة اسمي هنا توقيعاً إلكترونياً مني.', 'I have read the contract and agree to all its terms, and I treat typing my name here as my electronic signature.')}</span>
        </label>

        {err && <ErrorNote err={err} dealId={deal.id} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>{t('إلغاء', 'Cancel')}</Button>
          <Button onClick={submit} disabled={!match || !agree} loading={busy === 'sign'}><FileSignature className="size-4" />{t('وقّع العقد', 'Sign contract')}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------
// نافذة تأكيد عامة (التحويل / الاستلام)
// ---------------------------------------------------------------
function ConfirmModal({ open, onClose, title, body, confirm, onConfirm, busy, err, dealId }: {
  open: boolean; onClose: () => void; title: string; body: ReactNode; confirm: string; onConfirm: () => void; busy: boolean; err: { code: string; text: string } | null; dealId: string;
}) {
  const { t } = usePrefs();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div className="text-sm leading-relaxed text-muted">{body}</div>
        <ErrorNote err={err} dealId={dealId} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>{t('رجوع', 'Go back')}</Button>
          <Button onClick={onConfirm} loading={busy}><CheckCircle2 className="size-4" />{confirm}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------
// نافذة الإلغاء
// ---------------------------------------------------------------
export function CancelModal({ deal, open, onClose, onDone }: { deal: DealDetail; open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = usePrefs();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const { busy, err, run } = useAction(onDone);
  const len = reason.trim().length;
  const bad = len < 3 || len > 300;
  const submit = async () => {
    const ok = await run('cancel', `/deals/${deal.id}/cancel`, { reason: reason.trim() }, t('تم إلغاء الصفقة', 'Deal cancelled'));
    if (ok) { toast(ok); onClose(); setReason(''); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('إلغاء الصفقة', 'Cancel the deal')}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">{t('سيتم إلغاء العقد وإبلاغ الطرف الآخر، ويعود العقار للعرض. لا يمكن التراجع عن الإلغاء.', 'The contract will be voided, the other party notified, and the property returns to the listings. This cannot be undone.')}</p>
        <Field label={t('سبب الإلغاء', 'Reason for cancelling')} hint={<span className="num">{len}/300</span>}>
          {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t('اكتب السبب باختصار (3 أحرف على الأقل)', 'Briefly state the reason (at least 3 characters)')} />}
        </Field>
        <ErrorNote err={err} dealId={deal.id} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>{t('تراجع', 'Keep the deal')}</Button>
          <Button variant="dark" onClick={submit} disabled={bad} loading={busy === 'cancel'}><Ban className="size-4" />{t('تأكيد الإلغاء', 'Confirm cancellation')}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------
// تقييم بالنجوم
// ---------------------------------------------------------------
export function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const { t } = usePrefs();
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={t(`${value} من 5`, `${value} out of 5`)}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn(size === 'sm' ? 'size-4' : 'size-5', i <= value ? 'fill-brand text-brand' : 'text-line')} />)}
    </span>
  );
}

function ReviewForm({ deal, other, onDone }: { deal: DealDetail; other: string; onDone: () => void }) {
  const { t } = usePrefs();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const { busy, err, run } = useAction(onDone);
  const labels = [t('', ''), t('سيئة', 'Poor'), t('مقبولة', 'Fair'), t('جيدة', 'Good'), t('ممتازة', 'Very good'), t('رائعة', 'Excellent')];
  const shown = hover || rating;
  const submit = async () => {
    const ok = await run('review', `/deals/${deal.id}/review`, { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) }, t('شكراً لتقييمك', 'Thanks for your review'));
    if (ok) toast(ok);
  };
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={t('التقييم', 'Rating')} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={t(`${i} من 5`, `${i} of 5`)} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(0)} onClick={() => setRating(i)}
            className="grid size-11 place-items-center rounded-full transition-transform hover:scale-110 active:scale-95">
            <Star className={cn('size-8 transition-colors', i <= shown ? 'fill-brand text-brand' : 'text-line')} />
          </button>
        ))}
        <span className="ms-2 min-w-16 text-sm font-semibold text-brand-text">{labels[shown]}</span>
      </div>
      <Field label={t(`تعليق عن ${other} (اختياري)`, `Comment about ${other} (optional)`)} hint={<span className="num">{comment.length}/500</span>}>
        {(id) => <Textarea id={id} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />}
      </Field>
      <ErrorNote err={err} dealId={deal.id} />
      <Button onClick={submit} disabled={!rating} loading={busy === 'review'}><Star className="size-4" />{t('أرسل التقييم', 'Submit review')}</Button>
    </div>
  );
}

// ---------------------------------------------------------------
// بطاقة الخطوة التالية
// ---------------------------------------------------------------
export function NextActionCard({ deal, onChanged }: { deal: DealDetail; onChanged: () => void }) {
  const { t, money } = usePrefs();
  const toast = useToast();
  const [signOpen, setSignOpen] = useState(false);
  const [confirm, setConfirm] = useState<'transfer' | 'receipt' | null>(null);
  const { busy, err, setErr, run } = useAction(onChanged);
  const other = deal.role === 'owner' ? deal.counterparty : deal.owner;
  const first = other.name.split(' ')[0];
  const a = deal.nextAction;

  const go = async (key: string, path: string, ok: string, after?: () => void) => {
    const r = await run(key, path, {}, ok);
    if (r) { toast(r); after?.(); }
  };

  let icon = <ShieldCheck className="size-6" />;
  let title: ReactNode = '';
  let text: ReactNode = '';
  let actions: ReactNode = null;
  let waiting = false;

  switch (a) {
    case 'accept':
      title = t(`${first} اقترح صفقة بـ ${money(deal.agreedPrice)}`, `${first} proposed a deal at ${money(deal.agreedPrice)}`);
      text = t('عند قبولك يُنشأ العقد برقم وختم فريد، ثم يوقّعه الطرفان. يمكنك رفض الاقتراح إن لم يناسبك.', 'When you accept, a contract with a unique number and seal is created for both of you to sign. You can decline if it does not suit you.');
      actions = <>
        <Button size="lg" onClick={() => go('accept', `/deals/${deal.id}/accept`, t('تمت الموافقة وأُنشئ العقد', 'Accepted. Contract created'))} loading={busy === 'accept'} disabled={!!busy}><CheckCircle2 className="size-5" />{t('قبول الصفقة', 'Accept deal')}</Button>
        <Button size="lg" variant="outline" onClick={() => go('decline', `/deals/${deal.id}/cancel`, t('تم رفض الاقتراح', 'Proposal declined'))} loading={busy === 'decline'} disabled={!!busy}>{t('رفض', 'Decline')}</Button>
      </>;
      break;
    case 'wait':
      waiting = true; icon = <Hourglass className="size-6" />;
      title = t(`بانتظار رد ${first}`, `Waiting for ${first} to respond`);
      text = t('أرسلت اقتراحك. سنخبرك في المحادثة حال موافقته أو رفضه. يمكنك إلغاء الاقتراح في أي وقت.', 'Your proposal is sent. We will tell you in the chat once they accept or decline. You can withdraw it any time.');
      break;
    case 'sign':
      icon = <FileSignature className="size-6" />;
      title = t('العقد جاهز لتوقيعك', 'The contract is ready for your signature');
      text = t('راجع بنود العقد أدناه جيداً، ثم وقّع بكتابة اسمك كما هو في حسابك.', 'Read the contract below carefully, then sign by typing your name as it appears on your account.');
      actions = <Button size="lg" onClick={() => setSignOpen(true)}><PenLine className="size-5" />{t('راجع ووقّع العقد', 'Review & sign')}</Button>;
      break;
    case 'wait_signature':
      waiting = true; icon = <Hourglass className="size-6" />;
      title = t(`وقّعتَ العقد. بانتظار توقيع ${first}`, `You signed. Waiting for ${first} to sign`);
      text = t('بمجرد توقيع الطرف الآخر يُختم العقد وتنتقل الصفقة لمرحلة التحويل.', 'As soon as the other party signs, the contract is sealed and the deal moves to the transfer step.');
      break;
    case 'confirm_transfer':
      icon = <Landmark className="size-6" />;
      title = t('حوّل المبلغ ثم أكّد هنا', 'Transfer the money, then confirm here');
      text = t(`حوّل ${money(deal.agreedPrice)} إلى ${first} مباشرة عبر بنكك خارج المنصة. لا تضغط التأكيد إلا بعد أن يتم التحويل فعلاً، لأن ${first} سيُطلب منه تأكيد الاستلام.`, `Transfer ${money(deal.agreedPrice)} to ${first} directly through your bank, outside the platform. Only confirm after the transfer has actually been made, because ${first} will be asked to confirm receipt.`);
      actions = <Button size="lg" onClick={() => { setErr(null); setConfirm('transfer'); }}><Landmark className="size-5" />{t('تم التحويل', "I've transferred")}</Button>;
      break;
    case 'wait_transfer':
      waiting = true; icon = <Hourglass className="size-6" />;
      title = t(`بانتظار ${first} ليحوّل المبلغ`, `Waiting for ${first} to transfer`);
      text = t(`على ${first} تحويل ${money(deal.agreedPrice)} إليك ثم تأكيد التحويل هنا. لا تؤكد الاستلام قبل وصول المبلغ فعلاً إلى حسابك.`, `${first} must transfer ${money(deal.agreedPrice)} to you and confirm here. Never confirm receipt before the money is actually in your account.`);
      break;
    case 'confirm_receipt':
      icon = <PackageCheck className="size-6" />;
      title = t(`${first} أكّد التحويل. هل وصلك المبلغ؟`, `${first} confirmed the transfer. Did the money arrive?`);
      text = t(`تحقق من حسابك البنكي. أكّد الاستلام فقط إذا وصلك ${money(deal.agreedPrice)} كاملاً. إن لم يصل فافتح تذكرة دعم ولا تؤكد.`, `Check your bank account. Confirm only if the full ${money(deal.agreedPrice)} arrived. If it did not, open a support ticket and do not confirm.`);
      actions = <>
        <Button size="lg" onClick={() => { setErr(null); setConfirm('receipt'); }}><PackageCheck className="size-5" />{t('تم الاستلام', "I've received it")}</Button>
        <Link to={`/app/support?deal=${deal.id}`} className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-surface px-7 text-base font-semibold hover:bg-surface-2">{t('لم يصلني المبلغ', "It hasn't arrived")}</Link>
      </>;
      break;
    case 'wait_receipt':
      waiting = true; icon = <Hourglass className="size-6" />;
      title = t(`بانتظار ${first} ليؤكد استلام المبلغ`, `Waiting for ${first} to confirm receipt`);
      text = t('أكّدت التحويل. عندما يؤكد الطرف الآخر الاستلام تكتمل الصفقة. إن تأخر الأمر فافتح تذكرة دعم.', 'You confirmed the transfer. The deal completes once they confirm receipt. If it drags on, open a support ticket.');
      break;
    case 'review':
      icon = <Star className="size-6" />;
      title = t('اكتملت الصفقة! قيّم تجربتك', 'Deal complete! Rate your experience');
      text = t(`تقييمك لـ ${first} يساعد الآخرين على التعامل بثقة.`, `Your rating of ${first} helps others deal with confidence.`);
      actions = <ReviewForm deal={deal} other={first} onDone={onChanged} />;
      break;
    default: {
      if (deal.status === 'completed') { icon = <CheckCircle2 className="size-6" />; title = t('اكتملت الصفقة بنجاح', 'Deal completed successfully'); text = t('تم تأكيد التحويل والاستلام من الطرفين. يمكنك حفظ العقد أو طباعته في أي وقت.', 'Transfer and receipt were confirmed by both parties. You can save or print the contract any time.'); }
      else if (deal.status === 'cancelled') { icon = <Ban className="size-6" />; title = t('أُلغيت هذه الصفقة', 'This deal was cancelled'); text = deal.cancelReason ? t(`السبب: ${deal.cancelReason}`, `Reason: ${deal.cancelReason}`) : ''; }
      else if (deal.status === 'disputed') { icon = <AlertTriangle className="size-6" />; title = t('الصفقة قيد المراجعة بسبب نزاع', 'This deal is under dispute review'); text = t('فريق الدعم يراجع السجلات. تابع تذكرتك وستصلك التحديثات.', 'Our support team is reviewing the records. Follow your ticket for updates.'); }
    }
  }

  return (
    <motion.section key={a ?? deal.status} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      className={cn('relative overflow-hidden rounded-3xl border p-6 shadow-card sm:p-8', waiting ? 'border-line bg-surface' : a ? 'border-brand/60 bg-brand-soft' : 'border-line bg-surface')}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', waiting ? 'bg-surface-2 text-muted' : 'bg-brand text-on-brand')}>
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">{waiting ? t('قيد الانتظار', 'In progress') : a ? t('خطوتك التالية', 'Your next step') : t('حالة الصفقة', 'Deal status')}</p>
          <h2 className="text-xl font-bold leading-snug md:text-2xl">{title}</h2>
          {text && <p className="max-w-2xl leading-relaxed text-muted">{text}</p>}
          {a === 'review' ? actions : actions && <div className="flex flex-wrap gap-3 pt-1">{actions}</div>}
          {err && !confirm && <ErrorNote err={err} dealId={deal.id} />}
        </div>
      </div>

      <SignModal deal={deal} open={signOpen} onClose={() => setSignOpen(false)} onDone={onChanged} />
      <ConfirmModal open={confirm === 'transfer'} onClose={() => setConfirm(null)} busy={busy === 'transfer'} err={err} dealId={deal.id}
        title={t('تأكيد التحويل', 'Confirm the transfer')} confirm={t('نعم، حوّلتُ المبلغ', 'Yes, I transferred it')}
        body={<>{t(`هل حوّلتَ فعلاً ${money(deal.agreedPrice)} إلى ${first} عبر بنكك؟ هذا الإجراء لا يمكن التراجع عنه، وسيُطلب من ${first} تأكيد الاستلام.`, `Did you really transfer ${money(deal.agreedPrice)} to ${first} through your bank? This cannot be undone, and ${first} will be asked to confirm receipt.`)}</>}
        onConfirm={async () => { const r = await run('transfer', `/deals/${deal.id}/confirm-transfer`, {}, t('تم تأكيد التحويل', 'Transfer confirmed')); if (r) { toast(r); setConfirm(null); } }} />
      <ConfirmModal open={confirm === 'receipt'} onClose={() => setConfirm(null)} busy={busy === 'receipt'} err={err} dealId={deal.id}
        title={t('تأكيد الاستلام', 'Confirm receipt')} confirm={t('نعم، استلمتُ المبلغ', 'Yes, I received it')}
        body={<>{t(`هل وصلك ${money(deal.agreedPrice)} كاملاً من ${first} في حسابك؟ بعد التأكيد تكتمل الصفقة ولا يمكن التراجع.`, `Did the full ${money(deal.agreedPrice)} from ${first} arrive in your account? After confirming, the deal completes and cannot be undone.`)}</>}
        onConfirm={async () => { const r = await run('receipt', `/deals/${deal.id}/confirm-receipt`, {}, t('اكتملت الصفقة', 'Deal completed')); if (r) { toast(r); setConfirm(null); } }} />
    </motion.section>
  );
}
