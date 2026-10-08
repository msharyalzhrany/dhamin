// بطاقة العقار (قلب ثلاثي الأبعاد) — تُستخدم في الرئيسية والتصفح والمفضلة
import { Link } from 'react-router-dom';
import { ArrowRight, Bath, BedDouble, Expand, Heart, MapPin, Sparkles, Star, Timer, TrendingUp, Wallet } from 'lucide-react';
import { PerspectiveFlipCard } from '@/components/ui/card-14';
import { PropertyImage } from '@/components/PropertyImage';
import { Progress } from '@/components/ui/misc';
import { usePrefs } from '@/providers/prefs';
import { nameOf, useMeta } from '@/providers/meta';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

export function priceLabel(p: Property, money: (n: number) => string, lang: 'ar' | 'en') {
  if (p.listingType === 'rent') return `${money(p.price)} / ${p.rentPeriod === 'monthly' ? (lang === 'ar' ? 'شهر' : 'mo') : (lang === 'ar' ? 'سنة' : 'yr')}`;
  return money(p.price);
}

export function PropertyFlipCard({ p, onFavorite, className }: { p: Property; onFavorite?: (p: Property) => void; className?: string }) {
  const { t, lang, money, num, L } = usePrefs();
  const meta = useMeta();
  const inv = p.investment;
  const typeLabel = L(meta.listingTypes.find((x) => x.id === p.listingType));
  const district = nameOf(meta.districts, p.district, lang);

  const front = (
    <div className="flex size-full flex-col [transform-style:preserve-3d]">
      <div className="relative h-60 w-full [transform-style:preserve-3d] [transform:translateZ(50px)]">
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-line bg-surface-2">
          <PropertyImage src={p.cover} alt={p.title} className="transition duration-700 group-hover/p-card:scale-110" />
        </div>
        <div className="absolute start-3 top-3 rounded-full bg-deep/80 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur [transform:translateZ(60px)]">{typeLabel}</div>
        {onFavorite && (
          <button
            type="button"
            aria-label={t('إضافة للمفضلة', 'Save to favorites')}
            aria-pressed={!!p.isFavorite}
            onClick={(e) => { e.stopPropagation(); onFavorite(p); }}
            className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-lg backdrop-blur transition hover:scale-110 [transform:translateZ(80px)]"
          >
            <Heart className={cn('size-4', p.isFavorite && 'fill-brand text-brand')} />
          </button>
        )}
        <div className="absolute bottom-3 start-3 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11px] font-medium text-ink shadow-lg backdrop-blur [transform:translateZ(80px)]">
          <Star className="size-3.5 fill-brand text-brand" />
          <span>{p.owner?.ratingAvg ? <span className="num">{p.owner.ratingAvg.toFixed(1)}</span> : t('جديد', 'New')}</span>
        </div>
      </div>

      <div className="flex flex-grow flex-col justify-between px-4 pb-3 pt-5 [transform-style:preserve-3d]">
        <div className="space-y-2 [transform-style:preserve-3d] [transform:translateZ(60px)]">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-text">
            <Sparkles className="size-4" />
            <span>{L(meta.propertyTypes.find((x) => x.id === p.propertyType))} · {L(meta.usages.find((x) => x.id === p.usage))}</span>
          </div>
          <h3 className="line-clamp-2 text-[1.2rem] font-bold leading-snug tracking-tight transition duration-300 group-hover/p-card:text-brand-text">{p.title}</h3>
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted"><MapPin className="size-4 text-brand-text" />{district}, {L(meta.city)}</p>
        </div>

        {inv ? (
          <div className="space-y-1.5 [transform:translateZ(40px)]">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-muted">{t('تم جمع', 'Raised')}</span>
              <span className="num font-bold">{inv.progressPct}%</span>
            </div>
            <Progress value={inv.progressPct} />
          </div>
        ) : (
          <div className="flex items-end justify-between [transform:translateZ(40px)]">
            <div>
              <p className="text-[11px] font-medium text-muted">{p.listingType === 'rent' ? t('الإيجار', 'Rent') : t('السعر', 'Price')}</p>
              <p className="num text-lg font-bold">{priceLabel(p, money, lang)}</p>
            </div>
            <ArrowRight className="size-4 text-muted transition-all group-hover/p-card:text-brand-text group-hover/p-card:translate-x-1 rtl:rotate-180 rtl:group-hover/p-card:-translate-x-1" />
          </div>
        )}
      </div>
    </div>
  );

  const facts = inv
    ? [
        { icon: Wallet, label: money(inv.minInvestment), sub: t('الحد الأدنى', 'Minimum'), z: 130 },
        { icon: Timer, label: `${num(inv.durationMonths)} ${t('شهر', 'mo')}`, sub: t('المدة', 'Term'), z: 160 },
        { icon: TrendingUp, label: `${num(inv.expectedReturnPct)}%`, sub: t('عائد متوقع', 'Return'), z: 130 },
      ]
    : [
        { icon: BedDouble, label: p.bedrooms != null ? `${num(p.bedrooms)}` : '—', sub: t('غرف', 'Beds'), z: 130 },
        { icon: Bath, label: p.bathrooms != null ? `${num(p.bathrooms)}` : '—', sub: t('حمامات', 'Baths'), z: 160 },
        { icon: Expand, label: p.areaSqm ? `${num(p.areaSqm)} m²` : '—', sub: t('المساحة', 'Area'), z: 130 },
      ];

  const back = (
    <div className="flex size-full flex-col items-center justify-center [transform-style:preserve-3d]">
      <div className="mb-8 flex w-full justify-center gap-3 [transform-style:preserve-3d]">
        {facts.map(({ icon: I, label, sub, z }) => (
          <div key={sub} style={{ transform: `translateZ(${z}px)` }} className="flex min-w-[84px] flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface-2 p-3 [transform-style:preserve-3d]">
            <div className="rounded-xl border border-line bg-surface p-2 text-brand-text shadow-sm [transform:translateZ(20px)]"><I className="size-5" /></div>
            <p className="num text-xs font-bold [transform:translateZ(10px)]">{label}</p>
            <p className="text-[10px] text-muted">{sub}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 px-2 [transform-style:preserve-3d]">
        <h3 className="text-lg font-bold [transform:translateZ(80px)]">{inv ? t('تفاصيل الفرصة', 'Opportunity') : t('أبرز المزايا', 'Highlights')}</h3>
        <p className="mx-auto line-clamp-3 max-w-[280px] text-[13px] leading-relaxed text-muted [transform:translateZ(40px)]">
          {p.description || t('تواصل مع المالك لمعرفة التفاصيل الكاملة.', 'Contact the owner for full details.')}
        </p>
      </div>
      <div className="mt-6 w-full px-4 [transform-style:preserve-3d]">
        <Link
          to={`/properties/${p.id}`}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-xs font-bold tracking-wide text-on-brand shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] transition-all [transform:translateZ(100px)] hover:scale-[1.03] active:scale-95"
        >
          {t('عرض التفاصيل', 'View details')}
          <ArrowRight className="size-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );

  return <PerspectiveFlipCard className={cn('mx-auto', className)} w="w-full max-w-[380px]" h="h-[500px]" front={front} back={back} />;
}
