// صفحة تفاصيل العقار — عامة؛ الإجراءات (تواصل/مفضلة) تتطلب دخولاً عبر useLoginGuard
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Armchair, ArrowUpDown, Bath, BedDouble, BadgeCheck, CarFront, ChefHat, ChevronLeft, Cpu, DoorOpen, Dumbbell, Eye, Expand, FileSignature, Flower2,
  Handshake, Home, KeyRound, Layers, MapPin, ParkingCircle, ShieldCheck, Snowflake, Sailboat, Star, Tag, UserRound, Waves, Wallet, Check, type LucideIcon,
} from 'lucide-react';
import { api, errText } from '@/lib/api';
import { Gallery } from '@/components/browse/Gallery';
import { ActionCard } from '@/components/browse/ActionCard';
import { useToggleFavorite } from '@/components/browse/hooks';
import { PropertyFlipCard } from '@/components/PropertyCard';
import { Avatar } from '@/components/Avatar';
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc';
import { Button, LinkButton } from '@/components/ui/button';
import { useApi } from '@/lib/useApi';
import { usePrefs } from '@/providers/prefs';
import { nameOf, useMeta } from '@/providers/meta';
import { useAuth } from '@/providers/auth';
import type { Property } from '@/lib/types';

const AMENITY_ICON: Record<string, LucideIcon> = {
  parking: ParkingCircle, elevator: ArrowUpDown, pool: Waves, garden: Flower2, gym: Dumbbell, security: ShieldCheck, 'maid-room': UserRound,
  'driver-room': CarFront, furnished: Armchair, 'central-ac': Snowflake, kitchen: ChefHat, balcony: DoorOpen, 'sea-view': Sailboat, 'smart-home': Cpu,
};

export default function PropertyDetail() {
  const { id } = useParams();
  const { t, lang } = usePrefs();
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useApi<Property>(`/properties/${id}`);
  // عند تسجيل الدخول بعد فتح الصفحة نعيد الجلب ليصل isFavorite
  useEffect(() => { if (user) reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const applyFav = useCallback((_: string, fav: boolean) => setData((d) => (d ? { ...d, isFavorite: fav } : d)), [setData]);
  const toggleFav = useToggleFavorite(applyFav);

  if (loading && !data) return <DetailSkeleton />;
  if (error || !data) {
    const nf = (error as { status?: number })?.status === 404;
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-32">
        <EmptyState icon={<Home className="size-6" />} title={nf ? t('لم نجد هذا العقار', 'We could not find this property') : t('تعذّر تحميل العقار', 'Could not load the property')}
          text={nf ? t('ربما حُذف الإعلان أو تغيّر الرابط.', 'The listing may have been removed or the link changed.') : errText(error, lang)}
          action={<div className="flex gap-2">{!nf && <Button onClick={reload}>{t('إعادة المحاولة', 'Try again')}</Button>}<LinkButton to="/properties" variant={nf ? 'primary' : 'outline'}>{t('تصفّح العقارات', 'Browse properties')}</LinkButton></div>} />
      </div>
    );
  }
  return <Detail p={data} onFav={() => toggleFav(data)} />;
}

function Detail({ p, onFav }: { p: Property; onFav: () => void }) {
  const { t, lang, num, money, date, L } = usePrefs();
  const meta = useMeta();
  const district = nameOf(meta.districts, p.district, lang);
  const images = p.media?.length ? p.media : p.cover ? [p.cover] : [];
  const o = p.owner;
  const closed = p.status === 'reserved' || p.status === 'closed';

  const facts = [
    { i: BedDouble, l: t('غرف النوم', 'Bedrooms'), v: p.bedrooms != null ? num(p.bedrooms) : '—' },
    { i: Bath, l: t('الحمامات', 'Bathrooms'), v: p.bathrooms != null ? num(p.bathrooms) : '—' },
    { i: Expand, l: t('المساحة', 'Area'), v: p.areaSqm ? `${num(p.areaSqm)} m²` : '—' },
    { i: Layers, l: t('الاستخدام', 'Usage'), v: nameOf(meta.usages, p.usage, lang) },
    { i: Home, l: t('نوع العقار', 'Type'), v: nameOf(meta.propertyTypes, p.propertyType, lang) },
    ...(p.listingType === 'sale' && p.areaSqm ? [{ i: Tag, l: t('سعر المتر', 'Price per m²'), v: money(Math.round(p.price / p.areaSqm)) }] : []),
  ];
  const steps = [
    { i: Handshake, ar: 'الاتفاق على الشروط', en: 'Agree on terms' },
    { i: FileSignature, ar: 'عقد مختوم وتوقيع إلكتروني', en: 'Sealed contract & e-signature' },
    { i: Wallet, ar: 'تأكيد التحويل', en: 'Confirm the transfer' },
    { i: KeyRound, ar: 'تأكيد الاستلام', en: 'Confirm receipt' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 md:pt-32">
      <nav aria-label="breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link to="/properties" className="hover:text-ink">{t('العقارات', 'Properties')}</Link><ChevronLeft className="size-3.5 rtl:rotate-180" />
        <Link to={`/properties?listingType=${p.listingType}`} className="hover:text-ink">{L(meta.listingTypes.find((x) => x.id === p.listingType))}</Link><ChevronLeft className="size-3.5 rtl:rotate-180" />
        <span className="line-clamp-1 text-ink">{p.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">
          <Gallery images={images} title={p.title}
            overlay={closed ? <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-deep/85 px-4 py-3 text-sm font-semibold text-white backdrop-blur"><Check className="size-4 text-brand" />{p.status === 'reserved' ? t('محجوز — هذا العقار عليه صفقة جارية', 'Reserved — a deal is in progress') : t('مغلق — لم يعد متاحاً', 'Closed — no longer available')}</div> : null} />

          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="solid">{L(meta.listingTypes.find((x) => x.id === p.listingType))}</Badge>
              <Badge>{nameOf(meta.propertyTypes, p.propertyType, lang)}</Badge>
              <Badge tone="outline">{nameOf(meta.usages, p.usage, lang)}</Badge>
              {closed && <Badge tone="dark">{p.status === 'reserved' ? t('محجوز', 'Reserved') : t('مغلق', 'Closed')}</Badge>}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{p.title}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
              <span className="flex items-center gap-1.5"><MapPin className="size-4 text-brand-text" />{district}, {L(meta.city)}</span>
              {p.viewsCount != null && <span className="flex items-center gap-1.5 text-sm"><Eye className="size-4" /><span className="num">{num(p.viewsCount)}</span> {t('مشاهدة', 'views')}</span>}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.l} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-text"><f.i className="size-5" /></span>
                <div className="min-w-0"><dt className="text-xs text-muted">{f.l}</dt><dd className="num truncate text-sm font-bold">{f.v}</dd></div>
              </div>
            ))}
          </dl>

          <section className="space-y-3">
            <h2 className="text-xl font-bold">{t('الوصف', 'Description')}</h2>
            <p className="whitespace-pre-line leading-8 text-muted">{p.description || t('لم يضف المالك وصفاً بعد.', 'The owner has not added a description yet.')}</p>
          </section>

          {p.amenities.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">{t('المرافق', 'Amenities')}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.amenities.map((a) => { const I = AMENITY_ICON[a] ?? Check; return (
                  <li key={a} className="flex items-center gap-2.5 rounded-2xl bg-surface-2 px-4 py-3 text-sm font-medium"><I className="size-5 shrink-0 text-brand-text" />{nameOf(meta.amenities, a, lang)}</li>
                ); })}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-bold">{t('الموقع', 'Location')}</h2>
            <div className="relative overflow-hidden rounded-3xl bg-deep p-6 text-white">
              <div className="bg-grid absolute inset-0" />
              <div className="relative flex items-center gap-4">
                <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-brand text-on-brand"><span className="absolute inset-0 animate-[pulse-ring_2s_infinite] rounded-full" /><MapPin className="size-6" /></span>
                <div className="min-w-0"><p className="text-lg font-bold">{t('حي', 'District of')} {district}</p><p className="text-sm text-mist/75">{L(meta.city)}{p.addressNote ? ` · ${p.addressNote}` : ''}</p></div>
              </div>
              <p className="relative mt-4 text-xs text-mist/60">{t('العنوان الدقيق يُشارك داخل المحادثة بعد الاتفاق.', 'The exact address is shared in chat once you agree.')}</p>
            </div>
          </section>

          {o && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">{t('المالك', 'Owner')}</h2>
              <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-surface p-5">
                <Avatar name={o.firstName} src={o.avatarUrl} className="size-14 text-lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-lg font-bold">{o.firstName}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Star className="size-4 fill-brand text-brand" />{o.ratingCount > 0 ? <><span className="num font-semibold text-ink">{o.ratingAvg?.toFixed(1)}</span> (<span className="num">{num(o.ratingCount)}</span>)</> : t('عضو جديد', 'New member')}
                    <span aria-hidden>·</span>{t('عضو منذ', 'Member since')} <span>{date(o.memberSince, { year: 'numeric', month: 'short' })}</span>
                  </p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {o.verified.phone && <Badge><BadgeCheck className="size-3.5" />{t('جوال موثّق', 'Phone verified')}</Badge>}
                  {o.verified.address && <Badge><BadgeCheck className="size-3.5" />{t('عنوان وطني موثّق', 'Address verified')}</Badge>}
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-bold">{t('كيف نحمي صفقتك', 'How your deal is protected')}</h2>
            <ol className="grid gap-3 sm:grid-cols-4">
              {steps.map((s, k) => (
                <li key={k} className="relative rounded-2xl border border-line bg-surface p-4">
                  <span className="num absolute end-3 top-3 text-xs font-bold text-muted">{k + 1}</span>
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-text"><s.i className="size-5" /></span>
                  <p className="mt-3 text-sm font-semibold leading-snug">{t(s.ar, s.en)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start"><ActionCard p={p} onFavorite={onFav} /></aside>
      </div>

      <Similar p={p} />
    </div>
  );
}

// عقارات مشابهة: نفس الحي أولاً ثم نفس النوع
function Similar({ p }: { p: Property }) {
  const { t } = usePrefs();
  const { user } = useAuth();
  const [items, setItems] = useState<Property[] | null>(null);
  useEffect(() => {
    let off = false;
    Promise.all([
      api<{ items: Property[] }>(`/properties?district=${p.district}&pageSize=8`),
      api<{ items: Property[] }>(`/properties?propertyType=${p.propertyType}&pageSize=8`),
    ]).then(([a, b]) => {
      if (off) return;
      const seen = new Set<string>([p.id]);
      setItems([...a.items, ...b.items].filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, 3));
    }).catch(() => !off && setItems([]));
    return () => { off = true; };
  }, [p.id, p.district, p.propertyType, user?.id]);
  const apply = useCallback((id: string, fav: boolean) => setItems((l) => l && l.map((x) => (x.id === id ? { ...x, isFavorite: fav } : x))), []);
  const toggle = useToggleFavorite(apply);
  if (!items?.length) return null;
  return (
    <section className="mt-16 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('عقارات مشابهة', 'Similar properties')}</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{items.map((x) => <PropertyFlipCard key={x.id} p={x} onFavorite={toggle} />)}</div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6"><Skeleton className="aspect-[16/10] w-full rounded-3xl" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-24 w-full" /></div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    </div>
  );
}
