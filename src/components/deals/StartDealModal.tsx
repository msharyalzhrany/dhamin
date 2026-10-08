// نافذة "ابدأ صفقة": السعر المتفق عليه (+ المدة للإيجار، + المبلغ للاستثمار) ثم POST /deals
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, Info } from 'lucide-react';
import { Modal, Skeleton } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { api, ApiError, errText } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePrefs } from '@/providers/prefs';
import { useToast } from '@/providers/toast';
import { useAuth } from '@/providers/auth';
import type { Property } from '@/lib/types';

export function StartDealModal({ open, onClose, conversationId, propertyId, onCreated }: {
  open: boolean; onClose: () => void; conversationId: string; propertyId: string; onCreated: (dealId: string) => void;
}) {
  const { t, lang, money, num } = usePrefs();
  const toast = useToast();
  const { refresh } = useAuth();
  const { data: prop, loading } = useApi<Property>(open ? `/properties/${propertyId}` : null);
  const [price, setPrice] = useState('');
  const [months, setMonths] = useState('12');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ code: string; text: string } | null>(null);
  const [touched, setTouched] = useState(false);

  // تعبئة مسبقة بسعر العقار عند وصول البيانات
  useEffect(() => {
    if (!prop) return;
    const inv = prop.investment;
    setPrice(String(prop.listingType === 'invest' && inv ? inv.minInvestment : prop.price));
    setMonths(String(inv?.durationMonths ?? 12));
    setErr(null); setTouched(false);
  }, [prop]);

  const kind = prop?.listingType;
  const inv = prop?.investment;
  const remaining = inv ? inv.targetAmount - inv.raisedAmount : 0;
  const p = Number(price);
  const m = Number(months);

  let priceErr: string | null = null;
  if (!Number.isInteger(p) || p <= 0) priceErr = t('أدخل مبلغاً صحيحاً بالريال', 'Enter a valid whole amount in SAR');
  else if (kind === 'invest' && inv && p < inv.minInvestment) priceErr = t(`الحد الأدنى للاستثمار ${money(inv.minInvestment)}`, `Minimum investment is ${money(inv.minInvestment)}`);
  else if (kind === 'invest' && inv && p > remaining) priceErr = t(`المتبقي في الفرصة ${money(remaining)} فقط`, `Only ${money(remaining)} is still available`);
  const monthsErr = kind === 'rent' && (!Number.isInteger(m) || m < 1 || m > 120) ? t('المدة من 1 إلى 120 شهراً', 'Duration must be 1 to 120 months') : null;

  const submit = async () => {
    setTouched(true);
    if (priceErr || monthsErr) return;
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { conversationId, agreedPrice: p };
      if (kind === 'rent') body.durationMonths = m;
      const r = await api<{ id: string }>('/deals', { method: 'POST', body });
      toast(t('تم إرسال اقتراح الصفقة', 'Deal proposal sent'));
      refresh();
      onCreated(r.id);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'ERROR';
      setErr({ code, text: errText(e, lang) });
    } finally { setBusy(false); }
  };

  const priceLabel = kind === 'invest' ? t('مبلغ الاستثمار (ر.س)', 'Investment amount (SAR)')
    : kind === 'rent' ? t(`قيمة الإيجار ${prop?.rentPeriod === 'monthly' ? 'الشهري' : 'السنوي'} (ر.س)`, `${prop?.rentPeriod === 'monthly' ? 'Monthly' : 'Yearly'} rent (SAR)`)
    : t('سعر البيع المتفق عليه (ر.س)', 'Agreed sale price (SAR)');

  return (
    <Modal open={open} onClose={onClose} title={t('ابدأ صفقة', 'Start a deal')}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-muted">
          {t('اقتراح الصفقة لا يلزم أحداً بشيء. بعد موافقة الطرف الآخر يُنشأ العقد ليوقّعه الطرفان.', 'A proposal does not bind anyone. Once the other party accepts, a contract is created for both of you to sign.')}
        </p>
        {loading || !prop ? <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : (
          <>
            <div className="rounded-2xl bg-surface-2 p-4 text-sm">
              <p className="font-semibold">{prop.title}</p>
              <p className="mt-1 text-muted">
                {t('سعر الإعلان:', 'Listed at:')} <span className="num font-semibold text-ink">{money(prop.price)}</span>
                {kind === 'invest' && inv && <> · {t('المتبقي', 'Remaining')} <span className="num font-semibold text-ink">{money(remaining)}</span> · {t('الحد الأدنى', 'Min')} <span className="num font-semibold text-ink">{money(inv.minInvestment)}</span></>}
              </p>
            </div>
            <Field label={priceLabel} error={touched ? priceErr : null}
              hint={kind === 'invest' && inv ? t(`بين ${num(inv.minInvestment)} و ${num(remaining)} ر.س`, `Between ${num(inv.minInvestment)} and ${num(remaining)} SAR`) : undefined}>
              {(id) => <Input id={id} type="number" inputMode="numeric" min={1} step={1} value={price} onChange={(e) => setPrice(e.target.value)} className="num" dir="ltr" />}
            </Field>
            {kind === 'rent' && (
              <Field label={t('مدة الإيجار (بالأشهر)', 'Lease duration (months)')} error={touched ? monthsErr : null}>
                {(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={120} step={1} value={months} onChange={(e) => setMonths(e.target.value)} className="num" dir="ltr" />}
              </Field>
            )}
            {kind === 'invest' && inv && (
              <p className="flex items-start gap-2 text-sm text-muted"><Info className="mt-0.5 size-4 shrink-0 text-brand-text" />{t(`مدة الاستثمار ${num(inv.durationMonths)} شهراً وعائد متوقع ${num(inv.expectedReturnPct)}% حسب الفرصة المعلنة.`, `Term: ${num(inv.durationMonths)} months, expected return ${num(inv.expectedReturnPct)}% as listed.`)}</p>
            )}
          </>
        )}

        {err && (
          <div role="alert" className="rounded-2xl border border-brand/50 bg-brand-soft p-4 text-sm">
            <p className="font-semibold">{err.text}</p>
            {err.code === 'DEAL_LIMIT' && <Link to="/app/deals" className="mt-1 inline-block font-semibold text-brand-text underline underline-offset-4">{t('إدارة صفقاتي', 'Manage my deals')}</Link>}
            {err.code === 'DEAL_EXISTS' && <p className="mt-1 text-muted">{t('أنهِ الصفقة الحالية أو ألغِها ثم حاول مجدداً.', 'Finish or cancel the current deal, then try again.')}</p>}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>{t('إلغاء', 'Cancel')}</Button>
          <Button onClick={submit} loading={busy} disabled={!prop}><Handshake className="size-4" />{t('أرسل الاقتراح', 'Send proposal')}</Button>
        </div>
      </div>
    </Modal>
  );
}
