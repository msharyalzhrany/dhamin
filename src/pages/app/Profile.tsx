// ملفي /app/profile — الصورة، البيانات، التوثيق، التقييمات، ومعاينة الملف العام
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, Camera, Clock, Handshake, Heart, Save, Star, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Badge, Skeleton } from '@/components/ui/misc';
import { uploadFile } from '@/components/dashboard/PhotoUploader';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';
import { useToast } from '@/providers/toast';
import { useApi } from '@/lib/useApi';
import { api, errText } from '@/lib/api';
import { cn } from '@/lib/utils';

type PublicUser = { id: string; firstName: string; avatarUrl: string | null; bio: string | null; memberSince: string; ratingAvg: number | null; ratingCount: number; verified: { phone: boolean; address: boolean }; completedDeals: number; activeListings: number; reviews: { rating: number; comment: string | null; createdAt: string; reviewerFirstName: string }[] };

const card = 'rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6';
const AR = '٠١٢٣٤٥٦٧٨٩';
const latin = (v: string) => v.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
// +9665xxxxxxxx → 05xxxxxxxx للعرض في الحقل
const localPhone = (p?: string | null) => (p ? p.replace(/^\+?966/, '0') : '');

function Stars({ v }: { v: number }) {
  return <span className="inline-flex" aria-label={`${v}/5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn('size-4', i <= Math.round(v) ? 'fill-brand text-brand' : 'text-line')} />)}</span>;
}

function VerifyBadge({ ok }: { ok: boolean }) {
  const { t } = usePrefs();
  return ok
    ? <Badge tone="solid"><BadgeCheck className="size-3.5" />{t('موثّق', 'Verified')}</Badge>
    : <Badge tone="outline"><Clock className="size-3.5" />{t('قيد التوثيق', 'Pending verification')}</Badge>;
}

export default function Profile() {
  const { t, lang, num, date, ago } = usePrefs();
  const { me, refresh } = useAuth();
  const toast = useToast();
  const pub = useApi<PublicUser>(me ? `/users/${me.user.id}` : null);
  const [f, setF] = useState({ name: '', phone: '', addr: '', bio: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [avBusy, setAvBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (me) setF({ name: me.user.name, phone: localPhone(me.user.phone), addr: me.profile.nationalAddress ?? '', bio: me.profile.bio ?? '' });
  }, [me?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;

  async function save(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    const phone = latin(f.phone).replace(/\s|-/g, '');
    const addr = latin(f.addr).trim().toUpperCase();
    if (f.name.trim().length < 2) er.name = t('الاسم قصير', 'Name is too short');
    if (phone && !/^(?:\+?966|0)?5\d{8}$/.test(phone)) er.phone = t('رقم جوال سعودي غير صحيح (مثال 0501234567)', 'Invalid Saudi mobile number (e.g. 0501234567)');
    if (addr && !/^[A-Z]{4}\d{4}$/.test(addr)) er.addr = t('العنوان الوطني المختصر = 4 حروف + 4 أرقام (مثال RRRD2929)', 'Short national address = 4 letters + 4 digits (e.g. RRRD2929)');
    if (f.bio.length > 300) er.bio = t('النبذة أطول من 300 حرف', 'Bio is over 300 characters');
    setErrs(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    try {
      await api('/me', { method: 'PATCH', body: { name: f.name.trim(), bio: f.bio.trim(), ...(phone ? { phone } : {}), ...(addr ? { nationalAddress: addr } : {}) } });
      await refresh(); pub.reload();
      toast(t('تم حفظ ملفك الشخصي', 'Profile saved'));
    } catch (err) { toast(errText(err, lang), 'err'); } finally { setSaving(false); }
  }

  async function setAvatar(url: string) {
    await api('/me', { method: 'PATCH', body: { avatarUrl: url } });
    await refresh(); pub.reload();
  }
  async function pick(files: FileList | null) {
    const fl = files?.[0];
    if (!fl) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(fl.type)) return toast(t('صيغة غير مدعومة (JPG/PNG/WebP)', 'Unsupported format (JPG/PNG/WebP)'), 'err');
    if (fl.size > 5 * 1024 * 1024) return toast(t('الحجم أكبر من 5 ميجا', 'File is larger than 5MB'), 'err');
    setAvBusy(true);
    try { await setAvatar(await uploadFile(fl, () => {})); toast(t('تم تحديث الصورة', 'Photo updated')); }
    catch (err: any) { toast(err?.code === 'TOO_LARGE' ? t('الحجم أكبر من 5 ميجا', 'File is larger than 5MB') : err?.code === 'BAD_FILE' ? t('صيغة غير مدعومة (JPG/PNG/WebP)', 'Unsupported format (JPG/PNG/WebP)') : errText(err, lang), 'err'); }
    finally { setAvBusy(false); if (file.current) file.current.value = ''; }
  }
  async function removeAvatar() {
    setAvBusy(true);
    try { await setAvatar(''); toast(t('تمت إزالة الصورة', 'Photo removed')); } catch (err) { toast(errText(err, lang), 'err'); } finally { setAvBusy(false); }
  }

  const p = me.profile;
  const first = me.user.name.trim().split(/\s+/)[0];
  const u = pub.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{t('حسابي', 'My account')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{t('ملفي الشخصي', 'My profile')}</h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <div className="space-y-6">
          {/* الصورة */}
          <section className={cn(card, 'flex flex-col items-center gap-5 sm:flex-row')}>
            <Avatar name={me.user.name} src={p.avatarUrl} className="size-24 text-3xl" />
            <div className="flex-1 text-center sm:text-start">
              <h2 className="text-xl font-bold">{me.user.name}</h2>
              <p className="text-sm text-muted">{t('JPG أو PNG أو WebP حتى 5 ميجا', 'JPG, PNG or WebP up to 5MB')}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button size="sm" variant="outline" loading={avBusy} onClick={() => file.current?.click()}><Camera className="size-4" />{p.avatarUrl ? t('تغيير الصورة', 'Change photo') : t('رفع صورة', 'Upload photo')}</Button>
                {p.avatarUrl && <Button size="sm" variant="ghost" disabled={avBusy} onClick={removeAvatar}><Trash2 className="size-4" />{t('إزالة', 'Remove')}</Button>}
                <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t('رفع صورة الملف الشخصي', 'Upload profile photo')} onChange={(e) => pick(e.target.files)} />
              </div>
            </div>
          </section>

          {/* البيانات */}
          <form onSubmit={save} noValidate className={cn(card, 'space-y-5')}>
            <h2 className="text-xl font-bold">{t('بياناتي', 'My details')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('الاسم الكامل', 'Full name')} error={errs.name}>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />}</Field>
              <Field label={t('البريد الإلكتروني', 'Email')} hint={t('لا يمكن تغييره', "Can't be changed")}>{(id) => <Input id={id} value={me.user.email} readOnly dir="ltr" className="text-start opacity-70" />}</Field>
              <div className="space-y-2">
                <Field label={t('رقم الجوال', 'Mobile number')} error={errs.phone} hint={t('الصيغة: 05xxxxxxxx', 'Format: 05xxxxxxxx')}>{(id) => <Input id={id} value={f.phone} dir="ltr" inputMode="tel" className="text-start" placeholder="05xxxxxxxx" onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />}</Field>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <VerifyBadge ok={p.phoneVerified} />{me.user.phone && <span className="num" dir="ltr">{me.user.phone}</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Field label={t('العنوان الوطني المختصر', 'Short national address')} error={errs.addr} hint={t('4 حروف + 4 أرقام، مثل RRRD2929', '4 letters + 4 digits, e.g. RRRD2929')}>{(id) => <Input id={id} value={f.addr} dir="ltr" maxLength={8} className="text-start uppercase" placeholder="ABCD1234" onChange={(e) => setF({ ...f, addr: e.target.value.toUpperCase() })} />}</Field>
                <VerifyBadge ok={p.nationalAddressVerified} />
              </div>
            </div>
            <Field label={t('نبذة عنك', 'About you')} error={errs.bio} hint={<span className="num">{num(f.bio.length)} / 300</span>}>{(id) => <Textarea id={id} rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />}</Field>
            <Button type="submit" loading={saving}><Save className="size-4" />{t('حفظ التغييرات', 'Save changes')}</Button>
          </form>

          {/* التقييمات */}
          <section className={card} aria-labelledby="rv-h">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="rv-h" className="text-xl font-bold">{t('تقييماتي', 'My reviews')}</h2>
              {p.ratingCount > 0 && <div className="flex items-center gap-2"><Stars v={p.ratingAvg ?? 0} /><span className="num font-bold">{(p.ratingAvg ?? 0).toFixed(1)}</span><span className="text-sm text-muted">({num(p.ratingCount)})</span></div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[{ i: Handshake, v: me.stats.completedDeals, l: t('صفقات مكتملة', 'Completed deals') }, { i: Heart, v: me.stats.favorites, l: t('في مفضلتي', 'My favorites') }].map(({ i: I, v, l }) => (
                <div key={l} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-text"><I className="size-5" /></span><div><p className="num text-2xl font-bold">{num(v)}</p><p className="text-xs text-muted">{l}</p></div></div>
              ))}
            </div>
            <ul className="mt-4 space-y-3">
              {pub.loading && !u && <Skeleton className="h-16" />}
              {u && u.reviews.length === 0 && <li className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">{t('لا توجد تقييمات بعد. تظهر هنا بعد إتمام صفقاتك.', 'No reviews yet. They appear here after your deals complete.')}</li>}
              {u?.reviews.map((r, i) => (
                <li key={i} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold">{r.reviewerFirstName}</span><span className="text-xs text-muted">{ago(r.createdAt)}</span></div>
                  <Stars v={r.rating} />
                  {r.comment && <p className="mt-2 text-sm leading-relaxed text-muted">{r.comment}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* معاينة الملف العام */}
        <aside className="lg:sticky lg:top-24" aria-label={t('معاينة الملف العام', 'Public profile preview')}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted rtl:tracking-normal">{t('هكذا يراك الآخرون', 'How others see you')}</p>
          <motion.div layout className={cn(card, 'text-center')}>
            <Avatar name={first} src={p.avatarUrl} className="mx-auto size-20 text-2xl" />
            <h3 className="mt-3 text-lg font-bold">{first}</h3>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <Badge tone={p.phoneVerified ? 'solid' : 'outline'}>{p.phoneVerified ? <BadgeCheck className="size-3.5" /> : <Clock className="size-3.5" />}{t('الجوال', 'Phone')}</Badge>
              <Badge tone={p.nationalAddressVerified ? 'solid' : 'outline'}>{p.nationalAddressVerified ? <BadgeCheck className="size-3.5" /> : <Clock className="size-3.5" />}{t('العنوان', 'Address')}</Badge>
            </div>
            {p.ratingCount > 0 ? <p className="mt-3 flex items-center justify-center gap-1.5 text-sm"><Star className="size-4 fill-brand text-brand" /><span className="num font-bold">{(p.ratingAvg ?? 0).toFixed(1)}</span><span className="text-muted">({num(p.ratingCount)})</span></p> : <p className="mt-3 text-sm text-muted">{t('عضو جديد', 'New member')}</p>}
            {(f.bio || p.bio) && <p className="mt-3 break-words text-sm leading-relaxed text-muted">{f.bio || p.bio}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-sm">
              <div><p className="num text-lg font-bold">{num(u?.completedDeals ?? me.stats.completedDeals)}</p><p className="text-xs text-muted">{t('صفقات', 'Deals')}</p></div>
              <div><p className="num text-lg font-bold">{num(u?.activeListings ?? 0)}</p><p className="text-xs text-muted">{t('إعلانات', 'Listings')}</p></div>
            </div>
            {u && <p className="mt-3 text-xs text-muted">{t('عضو منذ', 'Member since')} <span>{date(u.memberSince, { month: 'long', year: 'numeric', calendar: 'gregory' })}</span></p>}
            <p className="mt-3 text-xs text-muted">{t('يظهر اسمك الأول فقط للعامة. جوالك وعنوانك لا يُعرضان.', 'Only your first name is public. Phone and address stay private.')}</p>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
