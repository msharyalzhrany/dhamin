// بطاقات جانبية في هيرو الصفحة الرئيسية (للشاشات الكبيرة فقط):
//   HeroFeatured: عقار مميز + أحياء مطلوبة   |   HeroTools: حاسبة القسط + خطوات الضمان
// تصميم هادئ: بطاقات صلبة بألوان الموقع (بدون زجاج/توهّج/أيقونات زخرفية).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { PropertyImage } from '@/components/PropertyImage';
import { usePrefs } from '@/providers/prefs';
import { useMeta } from '@/providers/meta';
import { useApi } from '@/lib/useApi';
import type { Property } from '@/lib/types';

const card = 'overflow-hidden rounded-2xl border border-line bg-surface text-start text-ink shadow-card';
const head = 'border-b border-line px-4 py-3 text-sm font-bold';
const fade = (d: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.45 } });

export function HeroFeatured() {
  const { t, L, money, num } = usePrefs();
  const meta = useMeta();
  const { data } = useApi<{ items: Property[] }>('/properties?listingType=sale&sort=price_desc&pageSize=8');
  const p = data?.items.find((x) => x.cover) ?? null;
  const districts = ['al-rawdah', 'al-shati', 'al-hamra', 'obhur-north', 'al-salamah'];
  return (
    <div className="flex w-64 flex-col gap-3.5">
      <motion.div {...fade(0.4)} className={card}>
        <div className={head}>{t('عقار مميز', 'Featured property')}</div>
        {p ? (
          <Link to={`/properties/${p.id}`} className="group block">
            <div className="relative aspect-[4/3] overflow-hidden">
              <PropertyImage src={p.cover} alt={p.title} className="transition duration-500 group-hover:scale-105" />
              <span className="absolute start-3 top-3 rounded bg-deep/85 px-2 py-0.5 text-[11px] font-semibold text-white">{t('للبيع', 'For sale')}</span>
            </div>
            <div className="space-y-1.5 p-4">
              <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</p>
              <p className="text-xs text-muted">
                {L(meta.districts.find((d) => d.id === p.district))}
                {p.areaSqm ? ` · ${num(p.areaSqm)} ${t('م²', 'm²')}` : ''}
                {p.bedrooms ? ` · ${num(p.bedrooms)} ${t('غرف', 'beds')}` : ''}
              </p>
              <p className="num pt-1 text-lg font-bold">{money(p.price)}</p>
            </div>
          </Link>
        ) : <div className="aspect-[4/3] animate-pulse bg-surface-2" />}
      </motion.div>

      <motion.div {...fade(0.5)} className={card}>
        <div className={head}>{t('أحياء مطلوبة', 'Popular districts')}</div>
        <ul className="divide-y divide-line">
          {districts.map((id) => (
            <li key={id}>
              <Link to={`/properties?district=${id}`} className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-surface-2">
                {L(meta.districts.find((d) => d.id === id)) || id}
                <ChevronLeft className="size-4 text-muted rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

// حاسبة القسط: قسط شهري ثابت = P·r / (1 − (1+r)^−n). النسبة تقريبية للتوضيح فقط وليست عرض تمويل.
export function HeroTools() {
  const { t, money, num } = usePrefs();
  const [price, setPrice] = useState(1500000);
  const [down, setDown] = useState(10);
  const [years, setYears] = useState(25);
  const rate = 5.5;
  const loan = Math.max(0, price * (1 - down / 100));
  const r = rate / 100 / 12, n = years * 12;
  const monthly = loan === 0 ? 0 : (loan * r) / (1 - Math.pow(1 + r, -n));
  const lbl = 'flex items-center justify-between text-xs text-muted';
  const slider = 'mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-[#39ab79]';
  return (
    <div className="flex w-64 flex-col gap-3.5">
      <motion.div {...fade(0.4)} className={card}>
        <div className={head}>{t('حاسبة القسط الشهري', 'Monthly payment calculator')}</div>
        <div className="space-y-4 p-4">
          <label className="block">
            <span className={lbl}>{t('سعر العقار', 'Property price')}<span>{t('ر.س', 'SAR')}</span></span>
            <input type="number" inputMode="numeric" min={0} step={50000} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
              className="num mt-1.5 h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm font-semibold text-ink outline-none focus:border-brand" />
          </label>
          <label className="block">
            <span className={lbl}>{t('الدفعة الأولى', 'Down payment')}<b className="num text-ink">{num(down)}%</b></span>
            <input type="range" min={0} max={50} step={5} value={down} onChange={(e) => setDown(Number(e.target.value))} className={slider} />
          </label>
          <label className="block">
            <span className={lbl}>{t('مدة السداد', 'Term')}<b className="num text-ink">{num(years)} {t('سنة', 'yrs')}</b></span>
            <input type="range" min={5} max={30} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} className={slider} />
          </label>
          <div className="rounded-lg bg-surface-2 px-3 py-3">
            <p className="text-xs text-muted">{t('القسط الشهري التقريبي', 'Estimated monthly payment')}</p>
            <p className="num mt-0.5 text-xl font-bold">{money(Math.round(monthly))}</p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">{t(`تقدير على نسبة ${num(rate)}% سنوياً للتوضيح فقط، وليس عرض تمويل.`, `Estimate at ${rate}% a year, for illustration only. Not a financing offer.`)}</p>
        </div>
      </motion.div>

      <motion.div {...fade(0.5)} className={card}>
        <div className={head}>{t('كيف نضمن صفقتك', 'How we protect your deal')}</div>
        <ol className="divide-y divide-line">
          {[t('عقد موثّق بختم وبصمة رقمية', 'Sealed contract with a digital fingerprint'), t('توقيع إلكتروني من الطرفين', 'E-signature from both sides'), t('تأكيد التحويل والاستلام', 'Confirmed transfer and receipt')].map((label, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-brand">{num(i + 1)}</span>{label}
            </li>
          ))}
        </ol>
      </motion.div>
    </div>
  );
}
