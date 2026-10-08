// إضافة/تعديل عقار — نموذج خطوات متحرّك مع معاينة حيّة للبطاقة
//   /app/properties/new  → إنشاء (POST /properties)
//   /app/properties/:id/edit → تعديل (PATCH /properties/:id)، ولا يمكن تغيير النوع/الاستخدام بعد النشر
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowRight, Check, KeyRound, Lock, Save, TrendingUp, Tag } from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Chip, Skeleton } from '@/components/ui/misc';
import { PropertyFlipCard } from '@/components/PropertyCard';
import { PhotoUploader, MAX_IMAGES, type Img } from '@/components/dashboard/PhotoUploader';
import { usePrefs } from '@/providers/prefs';
import { useMeta } from '@/providers/meta';
import { useAuth } from '@/providers/auth';
import { useToast } from '@/providers/toast';
import { api, errText, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

type LT = 'sale' | 'rent' | 'invest';
type Draft = {
  listingType: LT; propertyType: string; usage: string; title: string; description: string; price: string; rentPeriod: string;
  areaSqm: string; bedrooms: string; bathrooms: string; district: string; addressNote: string; amenities: string[];
  target: string; minInv: string; months: string; ret: string; images: Img[];
};
const empty: Draft = {
  listingType: 'sale', propertyType: 'apartment', usage: 'residential', title: '', description: '', price: '', rentPeriod: 'yearly',
  areaSqm: '', bedrooms: '', bathrooms: '', district: '', addressNote: '', amenities: [], target: '', minInv: '', months: '', ret: '', images: [],
};
type StepId = 'type' | 'details' | 'amenities' | 'invest' | 'photos';

// يحوّل الأرقام العربية (٠-٩) إلى لاتينية ويحذف ما عدا الأرقام
const AR = '٠١٢٣٤٥٦٧٨٩';
const digits = (v: string) => v.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[^\d]/g, '');
const toInt = (v: string) => (v === '' ? NaN : parseInt(v, 10));
const toDec = (v: string) => Number(v.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[٫,]/g, '.'));

export default function PropertyForm() {
  const { id } = useParams();
  const editing = !!id;
  const { t, lang, num, money } = usePrefs();
  const meta = useMeta();
  const { me, refresh } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [d, setD] = useState<Draft>(empty);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(editing);
  const [loadErr, setLoadErr] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [limitHit, setLimitHit] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setErrs((e) => (e[k] ? { ...e, [k]: '' } : e)); };

  // وضع التعديل: نحمّل العقار ونتأكد أنه لي
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    api<Property>(`/properties/${id}`).then((p) => {
      if (!alive) return;
      if (me && p.ownerId !== me.user.id) { setLoadErr(new ApiError(403, 'FORBIDDEN', 'هذا العقار ليس لك')); return; }
      const inv = p.investment;
      setD({
        listingType: p.listingType, propertyType: p.propertyType, usage: p.usage, title: p.title, description: p.description ?? '', price: String(p.price),
        rentPeriod: p.rentPeriod ?? 'yearly', areaSqm: p.areaSqm != null ? String(p.areaSqm) : '', bedrooms: p.bedrooms != null ? String(p.bedrooms) : '', bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
        district: p.district, addressNote: p.addressNote ?? '', amenities: p.amenities ?? [],
        target: inv ? String(inv.targetAmount) : '', minInv: inv ? String(inv.minInvestment) : '', months: inv ? String(inv.durationMonths) : '', ret: inv ? String(inv.expectedReturnPct) : '',
        images: (p.media ?? []).map((u) => ({ id: crypto.randomUUID(), url: u, preview: u, status: 'done' as const, progress: 100 })),
      });
    }).catch((e) => alive && setLoadErr(e)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, me?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isInvest = d.listingType === 'invest';
  const steps: { id: StepId; label: string }[] = [
    { id: 'type', label: t('النوع', 'Type') }, { id: 'details', label: t('التفاصيل', 'Details') }, { id: 'amenities', label: t('المرافق', 'Amenities') },
    ...(isInvest ? [{ id: 'invest' as const, label: t('الاستثمار', 'Investment') }] : []),
    { id: 'photos', label: t('الصور', 'Photos') },
  ];
  const cur = steps[Math.min(step, steps.length - 1)].id;
  const atLimit = !editing && !!me && me.usage.activeListings >= me.limits.activeListings;

  // التحقق (يطابق رسائل السيرفر)
  function validate(which: StepId[]): Record<string, string> {
    const e: Record<string, string> = {};
    if (which.includes('details')) {
      const title = d.title.trim();
      if (title.length < 5) e.title = t('العنوان قصير (5 أحرف على الأقل)', 'Title is too short (at least 5 characters)');
      else if (title.length > 120) e.title = t('العنوان طويل (120 حرفاً كحد أقصى)', 'Title is too long (max 120 characters)');
      if (d.description.length > 2000) e.description = t('الوصف أطول من 2000 حرف', 'Description is over 2000 characters');
      const price = toInt(d.price);
      if (!(price > 0)) e.price = t('السعر لازم يكون أكبر من صفر', 'Price must be greater than zero');
      if (d.listingType === 'rent' && !d.rentPeriod) e.rentPeriod = t('حدد فترة الإيجار', 'Choose the rent period');
      if (d.areaSqm !== '' && !(toInt(d.areaSqm) > 0)) e.areaSqm = t('المساحة لازم تكون أكبر من صفر', 'Area must be greater than zero');
      for (const k of ['bedrooms', 'bathrooms'] as const) if (d[k] !== '' && toInt(d[k]) > 50) e[k] = t('الحد الأقصى 50', 'Maximum is 50');
      if (!d.district) e.district = t('اختر الحي', 'Choose a district');
      if (d.addressNote.length > 200) e.addressNote = t('الحد الأقصى 200 حرف', 'Maximum 200 characters');
    }
    if (which.includes('invest') && isInvest) {
      const tg = toInt(d.target), mn = toInt(d.minInv), mo = toInt(d.months), rt = toDec(d.ret);
      if (!(tg > 0)) e.target = t('أدخل المبلغ المطلوب', 'Enter the target amount');
      if (!(mn > 0)) e.minInv = t('أدخل الحد الأدنى للاستثمار', 'Enter the minimum investment');
      else if (tg > 0 && mn > tg) e.minInv = t('الحد الأدنى أكبر من المبلغ المطلوب', 'Minimum is larger than the target amount');
      if (!(mo >= 1 && mo <= 240)) e.months = t('المدة من 1 إلى 240 شهراً', 'Term must be 1–240 months');
      if (d.ret === '' || !(rt >= 0 && rt <= 100)) e.ret = t('العائد من 0 إلى 100٪', 'Return must be 0–100%');
    }
    if (which.includes('amenities') && d.amenities.length > 14) e.amenities = t('الحد الأقصى 14 مرفقاً', 'Maximum 14 amenities');
    if (which.includes('photos')) {
      if (d.images.length > MAX_IMAGES) e.images = t('الحد الأقصى 10 صور', 'Maximum 10 photos');
      else if (d.images.some((i) => i.status === 'uploading')) e.images = t('انتظر اكتمال رفع الصور', 'Wait for the photos to finish uploading');
      else if (d.images.some((i) => i.status === 'error')) e.images = t('بعض الصور فشل رفعها — أعد المحاولة أو احذفها', 'Some photos failed to upload — retry or remove them');
    }
    return e;
  }

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  function next() {
    const e = validate([cur]);
    setErrs(e);
    if (Object.keys(e).length) return;
    go(Math.min(steps.length - 1, step + 1));
  }

  async function submit() {
    const all = validate(steps.map((s) => s.id));
    setErrs(all);
    if (Object.keys(all).length) {
      const bad = steps.findIndex((s) => Object.keys(validate([s.id])).length > 0);
      if (bad >= 0) go(bad);
      toast(t('راجع الحقول المطلوبة', 'Please review the highlighted fields'), 'err');
      return;
    }
    setSaving(true);
    const images = d.images.map((i) => i.url!).filter(Boolean);
    const base = {
      title: d.title.trim(), description: d.description.trim(), price: toInt(d.price), district: d.district, addressNote: d.addressNote.trim(),
      amenities: d.amenities, images,
      ...(d.areaSqm !== '' ? { areaSqm: toInt(d.areaSqm) } : {}),
      ...(d.bedrooms !== '' ? { bedrooms: toInt(d.bedrooms) } : {}),
      ...(d.bathrooms !== '' ? { bathrooms: toInt(d.bathrooms) } : {}),
    };
    try {
      let pid = id!;
      if (editing) await api(`/properties/${id}`, { method: 'PATCH', body: base });
      else {
        const r = await api<{ id: string }>('/properties', {
          method: 'POST',
          body: {
            ...base, listingType: d.listingType, propertyType: d.propertyType, usage: d.usage,
            ...(d.listingType === 'rent' ? { rentPeriod: d.rentPeriod } : {}),
            ...(isInvest ? { investment: { targetAmount: toInt(d.target), minInvestment: toInt(d.minInv), durationMonths: toInt(d.months), expectedReturnPct: toDec(d.ret) } } : {}),
          },
        });
        pid = r.id;
      }
      toast(editing ? t('تم حفظ التعديلات', 'Changes saved') : t('تم نشر إعلانك بنجاح', 'Your listing is live'));
      await refresh();
      nav(`/properties/${pid}`);
    } catch (e: any) {
      if (e?.code === 'LIMIT_REACHED') setLimitHit(errText(e, lang));
      toast(errText(e, lang), 'err');
    } finally { setSaving(false); }
  }

  // معاينة حيّة بنفس بطاقة الموقع
  const preview: Property = useMemo(() => ({
    id: 'preview', ownerId: '', ownerFirstName: null, listingType: d.listingType, propertyType: d.propertyType, usage: d.usage,
    title: d.title || t('عنوان إعلانك يظهر هنا', 'Your listing title appears here'), description: d.description, price: toInt(d.price) || 0,
    rentPeriod: d.listingType === 'rent' ? (d.rentPeriod as 'monthly' | 'yearly') : null,
    areaSqm: toInt(d.areaSqm) || null, bedrooms: d.bedrooms === '' ? null : toInt(d.bedrooms), bathrooms: d.bathrooms === '' ? null : toInt(d.bathrooms),
    city: 'jeddah', district: d.district || 'al-rawdah', addressNote: d.addressNote, amenities: d.amenities, status: 'active', createdAt: '', updatedAt: '',
    cover: d.images[0]?.preview ?? null, mediaCount: d.images.length,
    investment: isInvest ? { targetAmount: toInt(d.target) || 0, raisedAmount: 0, progressPct: 0, minInvestment: toInt(d.minInv) || 0, durationMonths: toInt(d.months) || 0, expectedReturnPct: toDec(d.ret) || 0 } : undefined,
  }), [d, isInvest, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-12 w-72" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (loadErr) {
    const forbidden = loadErr instanceof ApiError && loadErr.status === 403;
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-10 text-center shadow-card" role="alert">
        <AlertCircle className="mx-auto size-10" />
        <h1 className="mt-4 text-xl font-bold">{forbidden ? t('لا يمكنك تعديل هذا العقار', "You can't edit this property") : t('تعذّر تحميل العقار', 'Could not load the property')}</h1>
        <p className="mt-2 text-sm text-muted">{forbidden ? t('التعديل متاح لصاحب الإعلان فقط.', 'Only the listing owner can edit it.') : errText(loadErr, lang)}</p>
        <Link to="/app/properties" className={buttonStyles('primary', 'md', 'mt-6')}>{t('العودة لعقاراتي', 'Back to my properties')}</Link>
      </div>
    );
  }

  const lt = [
    { id: 'sale' as const, icon: Tag, ar: 'بيع', en: 'Sell', hint: t('بيع عقارك بسعر تحدده', 'Sell at a price you set') },
    { id: 'rent' as const, icon: KeyRound, ar: 'إيجار', en: 'Rent out', hint: t('أجّره شهرياً أو سنوياً', 'Rent monthly or yearly') },
    { id: 'invest' as const, icon: TrendingUp, ar: 'استثمار', en: 'Invest', hint: t('اجمع تمويلاً من مستثمرين', 'Raise funds from investors') },
  ];
  const locked = editing;
  const showRooms = d.propertyType !== 'land';
  const lastStep = step === steps.length - 1;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{editing ? t('تعديل إعلان', 'Edit listing') : t('إعلان جديد', 'New listing')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{editing ? t('تعديل العقار', 'Edit property') : t('أضف عقارك', 'List your property')}</h1>
      </header>

      {(atLimit || limitHit) && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand/40 bg-brand-soft p-4 text-sm" role="alert">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-brand-text" />
          <div><p>{limitHit ?? t(`وصلت للحد الأقصى (${num(me!.limits.activeListings)} إعلانات نشطة). أغلق إعلاناً قبل إضافة جديد.`, `You reached the limit (${num(me!.limits.activeListings)} active listings). Close one before adding another.`)}</p>
            <Link to="/app/properties" className="mt-1 inline-block font-semibold text-brand-text underline">{t('إدارة عقاراتي', 'Manage my properties')}</Link></div>
        </div>
      )}

      {/* شريط الخطوات */}
      <ol className="mb-6 flex items-center gap-2 rounded-3xl border border-line bg-surface p-3 shadow-card" aria-label={t('خطوات النموذج', 'Form steps')}>
        {steps.map((s, i) => (
          <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" onClick={() => (i <= step || !Object.keys(validate([cur])).length) && go(i)} aria-current={i === step ? 'step' : undefined}
              className={cn('flex min-h-11 min-w-0 items-center gap-2 rounded-full px-1.5 py-1 text-sm font-semibold transition-colors sm:pe-3', i === step ? 'bg-brand-soft text-brand-text' : 'text-muted')}>
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold', i < step ? 'bg-brand text-on-brand' : i === step ? 'bg-brand text-on-brand' : 'bg-surface-2')}>{i < step ? <Check className="size-4" /> : <span className="num">{num(i + 1)}</span>}</span>
              <span className="hidden truncate sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className={cn('hidden h-0.5 flex-1 rounded-full sm:block', i < step ? 'bg-brand' : 'bg-line')} />}
          </li>
        ))}
      </ol>

      <p className="-mt-3 mb-5 text-sm font-semibold text-brand-text sm:hidden">{t('الخطوة', 'Step')} <span className="num">{num(step + 1)}/{num(steps.length)}</span> · {steps[step].label}</p>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px] [&>*]:min-w-0">
        <div className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={cur} initial={{ opacity: 0, x: 28 * dir * (lang === 'ar' ? -1 : 1) }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 * dir * (lang === 'ar' ? -1 : 1) }} transition={{ duration: 0.25 }} className="space-y-6">
              {cur === 'type' && (
                <>
                  <div>
                    <h2 className="text-xl font-bold">{t('ماذا تريد أن تفعل بعقارك؟', 'What do you want to do?')}</h2>
                    {locked && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" />{t('لا يمكن تغيير النوع بعد النشر', "Type can't be changed after publishing")}</p>}
                  </div>
                  <div role="radiogroup" aria-label={t('نوع الإعلان', 'Listing type')} className="grid gap-3 sm:grid-cols-3">
                    {lt.map(({ id: k, icon: I, ar, en, hint }) => (
                      <button key={k} type="button" role="radio" aria-checked={d.listingType === k} disabled={locked && d.listingType !== k} onClick={() => set('listingType', k)}
                        className={cn('flex flex-col items-start gap-2 rounded-3xl border-2 p-5 text-start transition-all disabled:opacity-40', d.listingType === k ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand/50')}>
                        <span className={cn('grid size-11 place-items-center rounded-2xl', d.listingType === k ? 'bg-brand text-on-brand' : 'bg-surface-2')}><I className="size-5" /></span>
                        <span className="text-lg font-bold">{t(ar, en)}</span>
                        <span className="text-xs text-muted">{hint}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('نوع العقار', 'Property type')}>{(fid) => (
                      <Select id={fid} value={d.propertyType} disabled={locked} onChange={(e) => set('propertyType', e.target.value)}>{meta.propertyTypes.map((p) => <option key={p.id} value={p.id}>{p[lang]}</option>)}</Select>
                    )}</Field>
                    <Field label={t('الاستخدام', 'Usage')}>{(fid) => (
                      <Select id={fid} value={d.usage} disabled={locked} onChange={(e) => set('usage', e.target.value)}>{meta.usages.map((p) => <option key={p.id} value={p.id}>{p[lang]}</option>)}</Select>
                    )}</Field>
                  </div>
                </>
              )}

              {cur === 'details' && (
                <>
                  <h2 className="text-xl font-bold">{t('تفاصيل العقار', 'Property details')}</h2>
                  <Field label={t('عنوان الإعلان', 'Listing title')} error={errs.title} hint={`${num(d.title.trim().length)} / 120`}>{(fid) => (
                    <Input id={fid} value={d.title} maxLength={140} onChange={(e) => set('title', e.target.value)} placeholder={t('مثال: شقة ٣ غرف في حي الروضة', 'e.g. 3-bedroom apartment in Al Rawdah')} aria-invalid={!!errs.title} />
                  )}</Field>
                  <Field label={t('الوصف', 'Description')} error={errs.description} hint={<span className="num">{num(d.description.length)} / 2000</span>}>{(fid) => (
                    <Textarea id={fid} value={d.description} rows={5} onChange={(e) => set('description', e.target.value)} placeholder={t('اكتب ما يميّز العقار…', 'Describe what makes it special…')} />
                  )}</Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={isInvest ? t('قيمة العقار (ر.س)', 'Property value (SAR)') : d.listingType === 'rent' ? t('قيمة الإيجار (ر.س)', 'Rent amount (SAR)') : t('السعر (ر.س)', 'Price (SAR)')} error={errs.price} hint={toInt(d.price) > 0 ? money(toInt(d.price)) : undefined}>{(fid) => (
                      <Input id={fid} inputMode="numeric" dir="ltr" className="text-start" value={d.price} onChange={(e) => set('price', digits(e.target.value))} placeholder="1500000" aria-invalid={!!errs.price} />
                    )}</Field>
                    {d.listingType === 'rent' && (
                      <Field label={t('فترة الإيجار', 'Rent period')} error={errs.rentPeriod}>{(fid) => (
                        <Select id={fid} value={d.rentPeriod} disabled={locked} onChange={(e) => set('rentPeriod', e.target.value)}>{meta.rentPeriods.map((p) => <option key={p.id} value={p.id}>{p[lang]}</option>)}</Select>
                      )}</Field>
                    )}
                    <Field label={t('المساحة (م²)', 'Area (m²)')} error={errs.areaSqm}>{(fid) => (
                      <Input id={fid} inputMode="numeric" dir="ltr" className="text-start" value={d.areaSqm} onChange={(e) => set('areaSqm', digits(e.target.value))} placeholder="250" />
                    )}</Field>
                    {showRooms && <>
                      <Field label={t('غرف النوم', 'Bedrooms')} error={errs.bedrooms}>{(fid) => <Input id={fid} inputMode="numeric" dir="ltr" className="text-start" value={d.bedrooms} onChange={(e) => set('bedrooms', digits(e.target.value))} placeholder="3" />}</Field>
                      <Field label={t('دورات المياه', 'Bathrooms')} error={errs.bathrooms}>{(fid) => <Input id={fid} inputMode="numeric" dir="ltr" className="text-start" value={d.bathrooms} onChange={(e) => set('bathrooms', digits(e.target.value))} placeholder="2" />}</Field>
                    </>}
                    <Field label={t('الحي في جدة', 'District in Jeddah')} error={errs.district}>{(fid) => (
                      <Select id={fid} value={d.district} onChange={(e) => set('district', e.target.value)} aria-invalid={!!errs.district}>
                        <option value="">{t('اختر الحي', 'Choose a district')}</option>{meta.districts.map((p) => <option key={p.id} value={p.id}>{p[lang]}</option>)}
                      </Select>
                    )}</Field>
                  </div>
                  <Field label={t('ملاحظة العنوان (اختياري)', 'Address note (optional)')} error={errs.addressNote} hint={t('لا تكتب رقم جوالك أو عنوانك التفصيلي — يظهر للجميع', "Don't include your phone or exact address — it's public")}>{(fid) => (
                    <Input id={fid} value={d.addressNote} onChange={(e) => set('addressNote', e.target.value)} placeholder={t('قرب شارع التحلية', 'Near Tahlia street')} />
                  )}</Field>
                </>
              )}

              {cur === 'amenities' && (
                <>
                  <div>
                    <h2 className="text-xl font-bold">{t('المرافق والمزايا', 'Amenities')}</h2>
                    <p className="mt-1 text-sm text-muted">{t('اختر ما يتوفر في العقار', 'Pick what the property offers')} · <span className="num font-semibold text-ink">{num(d.amenities.length)} / 14</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {meta.amenities.map((a) => {
                      const on = d.amenities.includes(a.id);
                      return <Chip key={a.id} active={on} className="min-h-11" onClick={() => { if (!on && d.amenities.length >= 14) { toast(t('الحد الأقصى 14 مرفقاً', 'Maximum 14 amenities'), 'err'); return; } set('amenities', on ? d.amenities.filter((x) => x !== a.id) : [...d.amenities, a.id]); }}>{on && <Check className="me-1 inline size-4" />}{a[lang]}</Chip>;
                    })}
                  </div>
                  {errs.amenities && <p className="text-sm font-medium underline decoration-brand decoration-2 underline-offset-4" role="alert">{errs.amenities}</p>}
                </>
              )}

              {cur === 'invest' && (
                <>
                  <div>
                    <h2 className="text-xl font-bold">{t('بيانات الفرصة الاستثمارية', 'Investment details')}</h2>
                    {locked && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" />{t('لا يمكن تعديل شروط الاستثمار بعد النشر', "Investment terms can't be edited after publishing")}</p>}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('المبلغ المطلوب جمعه (ر.س)', 'Target amount (SAR)')} error={errs.target}>{(fid) => <Input id={fid} inputMode="numeric" dir="ltr" className="text-start" disabled={locked} value={d.target} onChange={(e) => set('target', digits(e.target.value))} placeholder="1000000" />}</Field>
                    <Field label={t('الحد الأدنى للاستثمار (ر.س)', 'Minimum investment (SAR)')} error={errs.minInv} hint={t('يجب ألا يتجاوز المبلغ المطلوب', 'Must not exceed the target')}>{(fid) => <Input id={fid} inputMode="numeric" dir="ltr" className="text-start" disabled={locked} value={d.minInv} onChange={(e) => set('minInv', digits(e.target.value))} placeholder="5000" />}</Field>
                    <Field label={t('مدة الاستثمار (شهر)', 'Term (months)')} error={errs.months}>{(fid) => <Input id={fid} inputMode="numeric" dir="ltr" className="text-start" disabled={locked} value={d.months} onChange={(e) => set('months', digits(e.target.value))} placeholder="24" />}</Field>
                    <Field label={t('العائد المتوقع (٪)', 'Expected return (%)')} error={errs.ret}>{(fid) => <Input id={fid} inputMode="decimal" dir="ltr" className="text-start" disabled={locked} value={d.ret} onChange={(e) => set('ret', e.target.value.replace(/[^\d.٫]/g, ''))} placeholder="8.5" />}</Field>
                  </div>
                </>
              )}

              {cur === 'photos' && (
                <>
                  <div>
                    <h2 className="text-xl font-bold">{t('صور العقار', 'Property photos')}</h2>
                    <p className="mt-1 text-sm text-muted">{t('الإعلانات المصوّرة تحصل على مشاهدات أكثر.', 'Listings with photos get more views.')} <span className="num font-semibold text-ink">{num(d.images.length)} / {num(MAX_IMAGES)}</span></p>
                  </div>
                  <PhotoUploader images={d.images} onChange={(fn) => setD((x) => ({ ...x, images: fn(x.images) }))} />
                  {errs.images && <p className="text-sm font-medium underline decoration-brand decoration-2 underline-offset-4" role="alert">{errs.images}</p>}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="ghost" onClick={() => (step === 0 ? nav('/app/properties') : go(step - 1))}>
              <ArrowRight className="size-4 ltr:rotate-180" />{step === 0 ? t('إلغاء', 'Cancel') : t('السابق', 'Back')}
            </Button>
            {lastStep ? (
              <Button loading={saving} disabled={atLimit} onClick={submit}><Save className="size-4" />{editing ? t('حفظ التعديلات', 'Save changes') : t('نشر الإعلان', 'Publish listing')}</Button>
            ) : (
              <Button onClick={next}>{t('التالي', 'Next')}<ArrowRight className="size-4 rtl:rotate-180" /></Button>
            )}
          </div>
          {editing && !lastStep && (
            <div className="mt-3 flex justify-end"><Button variant="soft" size="sm" loading={saving} onClick={submit}><Save className="size-4" />{t('حفظ الآن', 'Save now')}</Button></div>
          )}
        </div>

        {/* المعاينة الحيّة */}
        <aside className="hidden lg:sticky lg:top-24 lg:block" aria-label={t('معاينة الإعلان', 'Listing preview')}>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted rtl:tracking-normal">{t('معاينة حيّة', 'Live preview')}</p>
          <PropertyFlipCard p={preview} />
          <p className="mt-3 text-center text-xs text-muted">{t('مرّر على البطاقة لقلبها', 'Hover the card to flip it')}</p>
        </aside>
      </div>
    </div>
  );
}
