// الصفحة الرئيسية — دمج: هيرو saas-template + أقسام Absher (خدمات/أرقام) + NexDash (أقسام داكنة/فاتحة) + بطاقات card-14
import { TextEffect } from '@/components/ui/text-effect';
import { lazy, Suspense, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, BadgeCheck, Building2, Check, ChevronDown, FileSignature, Gavel, HandCoins, Handshake, KeyRound, Search, ShieldCheck, Star, TrendingUp } from 'lucide-react';
import { LinkButton, buttonStyles } from '@/components/ui/button';
import { Badge, Progress, SectionHead } from '@/components/ui/misc';
import { Select } from '@/components/ui/field';
import { Counter, Reveal } from '@/components/Reveal';
import { PropertyFlipCard } from '@/components/PropertyCard';
import { LogoMark } from '@/components/Logo';
const Hero3D = lazy(() => import('@/components/Hero3D'));
import { PROMOS } from '@/lib/promos';
import { usePrefs } from '@/providers/prefs';
import { useMeta } from '@/providers/meta';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

/* ---------- 1) الهيرو ---------- */
function SearchPanel() {
  const { t, L } = usePrefs();
  const meta = useMeta();
  const nav = useNavigate();
  const [type, setType] = useState<'sale' | 'rent' | 'invest'>('sale');
  const [district, setDistrict] = useState('');
  const [pt, setPt] = useState('');
  const tabs = [['sale', t('شراء', 'Buy')], ['rent', t('إيجار', 'Rent')], ['invest', t('استثمار', 'Invest')]] as const;
  function go() {
    if (type === 'invest' && !district && !pt) return nav('/invest');
    const q = new URLSearchParams({ listingType: type });
    if (district) q.set('district', district);
    if (pt) q.set('propertyType', pt);
    nav(`/properties?${q}`);
  }
  return (
    <div className="w-full max-w-xl rounded-xl border border-line bg-surface p-3 text-ink shadow-card">
      <div className="mb-3 flex gap-1 rounded-lg bg-surface-2 p-1">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setType(id)} className={cn('relative flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors', type === id ? 'text-on-brand' : 'text-muted hover:text-ink')}>
            {type === id && <motion.span layoutId="hero-tab" className="absolute inset-0 rounded-md bg-brand" transition={{ type: 'spring', damping: 28, stiffness: 340 }} />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select aria-label={t('الحي', 'District')} value={district} onChange={(e) => setDistrict(e.target.value)} className=""><option value="">{t('كل أحياء جدة', 'All Jeddah districts')}</option>{meta.districts.map((d) => <option key={d.id} value={d.id}>{L(d)}</option>)}</Select>
        <Select aria-label={t('نوع العقار', 'Property type')} value={pt} onChange={(e) => setPt(e.target.value)} className=""><option value="">{t('كل الأنواع', 'All types')}</option>{meta.propertyTypes.map((d) => <option key={d.id} value={d.id}>{L(d)}</option>)}</Select>
        <button onClick={go} className={buttonStyles('primary', 'lg', 'h-12 sm:col-span-2')}><Search className="size-4" />{t('ابحث', 'Search')}</button>
      </div>
    </div>
  );
}

function Hero() {
  const { t, lang } = usePrefs();
  return (
    <section className="relative isolate overflow-hidden bg-hero px-5 pb-16 pt-44 text-ink md:min-h-[100svh] md:pt-52">
      <div className="absolute inset-x-0 top-[98px] z-20"><PromoTicker variant={TICKER_VARIANT} /></div>
      {/* خلفية: دوائر ملونة ناعمة */}
      <div className="absolute -start-32 top-1/3 -z-10 size-[34rem] rounded-full bg-brand/15 blur-3xl" />
      <div className="absolute -end-20 top-10 -z-10 size-[26rem] rounded-full bg-accent/20 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative z-10 flex flex-col items-start text-start">
          <motion.aside initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs shadow-card">
            <Gavel className="size-3.5 text-brand-text" /><span className="text-muted">{t('جديد: المزادات العقارية قريباً', 'New: real-estate auctions are coming soon')}</span>
            <Link to="/auctions" className="flex items-center gap-1 font-semibold text-brand-text">{t('اعرف أكثر', 'Learn more')}<ArrowRight className="size-3 rtl:rotate-180" /></Link>
          </motion.aside>
          <TextEffect key={lang} as="h1" per="word" preset={lang === 'ar' ? 'blur' : 'slide'} delay={0.15}
            className="text-4xl font-bold leading-[1.2] text-ink md:text-5xl lg:text-6xl">
            {t('صفقتك العقارية، بضمان من أول رسالة حتى المفتاح.', 'Your property deal, protected from first message to the key.')}
          </TextEffect>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-5 max-w-xl text-base text-muted md:text-lg">
            {t('بيع، إيجار واستثمار في جدة بين الأفراد: عقد موثّق بختم وتوقيع إلكتروني، وتأكيد من الطرفين للتحويل والاستلام.', 'Buy, rent and invest in Jeddah between individuals: a sealed contract with e-signature, and both sides confirm transfer and receipt.')}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 w-full"><SearchPanel /></motion.div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <LinkButton to="/signup" size="lg">{t('ابدأ صفقتك', 'Start a deal')}</LinkButton>
            <LinkButton to="/properties" variant="outline" size="lg">{t('تصفّح بدون حساب', 'Browse without an account')}</LinkButton>
          </div>
        </div>
        <div className="relative h-[26rem] sm:h-[32rem] lg:h-[40rem]">
          <Suspense fallback={null}><Hero3D className="absolute inset-0" /></Suspense>
        </div>
      </div>
    </section>
  );
}

/* ---------- 2) الخدمات الفورية (على طريقة أبشر) ---------- */
function Services() {
  const { t } = usePrefs();
  const [tab, setTab] = useState(0);
  const tabs = [
    { k: t('أشتري', 'I want to buy'), items: [[Building2, t('فلل وشقق للبيع', 'Villas & apartments'), '/properties?listingType=sale'], [Search, t('بحث بالحي والميزانية', 'Search by district & budget'), '/properties'], [FileSignature, t('عقد بيع موثّق', 'Sealed sale contract'), '/#how']] },
    { k: t('أستأجر', 'I want to rent'), items: [[KeyRound, t('شقق ومحلات للإيجار', 'Rentals'), '/properties?listingType=rent'], [FileSignature, t('عقد إيجار بتوقيع إلكتروني', 'E-signed lease'), '/#how'], [BadgeCheck, t('ملاك موثّقون بتقييم', 'Rated, verified owners'), '/#trust']] },
    { k: t('أستثمر', 'I want to invest'), items: [[TrendingUp, t('فرص بعائد متوقع', 'Opportunities with expected return'), '/invest'], [HandCoins, t('محاكي العائد', 'Return simulator'), '/invest#simulator'], [Gavel, t('المزادات (قريباً)', 'Auctions (soon)'), '/auctions']] },
    { k: t('أعرض عقاري', 'I want to list'), items: [[Building2, t('أضف عقارك بالصور', 'Add your property with photos'), '/app/properties/new'], [Handshake, t('تواصل وصفقة داخل المنصة', 'Chat & deal in one place'), '/app/messages'], [Star, t('تقييمات بعد الصفقة', 'Reviews after the deal'), '/#trust']] },
  ];
  return (
    <section className="bg-bg px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal><SectionHead eyebrow={t('خدمات فورية', 'Instant services')} title={t('ماذا تريد أن تفعل اليوم؟', 'What do you want to do today?')} /></Reveal>
        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map((x, i) => (
            <button key={i} onClick={() => setTab(i)} className={cn('relative rounded-sm px-5 py-2.5 text-sm font-semibold transition-colors', tab === i ? 'text-on-brand' : 'bg-surface text-ink hover:bg-surface-2')}>
              {tab === i && <motion.span layoutId="svc-tab" className="absolute inset-0 rounded-sm bg-brand" />}<span className="relative">{x.k}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="mt-8 grid gap-4 md:grid-cols-3">
            {tabs[tab].items.map(([I, label, to]: any) => (
              <Link key={label} to={to} className="group flex items-center gap-4 rounded-lg border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:border-brand">
                <span className="grid size-12 place-items-center rounded-md bg-brand-soft text-brand-text transition group-hover:bg-brand group-hover:text-on-brand"><I className="size-6" /></span>
                <span className="flex-1 font-semibold">{label}</span>
                <ArrowRight className="size-4 text-muted transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ---------- 3) عقارات مميزة (بطاقات 3D) ---------- */
function Featured() {
  const { t } = usePrefs();
  const { data } = useApi<{ items: Property[] }>('/properties?pageSize=6');
  return (
    <section className="bg-surface-2 px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal><SectionHead eyebrow={t('أحدث العقارات', 'Latest listings')} title={t('عقارات من جدة، حقيقية وموثّقة', 'Real, verified Jeddah listings')} /></Reveal>
          <LinkButton to="/properties" variant="outline">{t('عرض الكل', 'View all')}<ArrowRight className="size-4 rtl:rotate-180" /></LinkButton>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.items ?? Array.from({ length: 3 })).slice(0, 6).map((p, i) => p ? <Reveal key={(p as Property).id} delay={(i % 3) * 0.08}><PropertyFlipCard p={p as Property} /></Reveal> : <div key={i} className="skeleton mx-auto h-[500px] w-full max-w-[380px] rounded-lg" />)}
        </div>
        <p className="mt-8 text-center text-sm text-muted">{t('مرّر المؤشر على البطاقة (أو اضغط عليها في الجوال) لتنقلب وتظهر التفاصيل.', 'Hover a card (or tap on mobile) to flip it and see details.')}</p>
      </div>
    </section>
  );
}

/* ---------- 4) مشاهد 3D بصور حقيقية (تحت بعض مع انتقال عند التمرير) ---------- */
function Scene({ src, title, text, flip }: { src: string; title: string; text: string; flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.2, 1]);
  return (
    <div ref={ref} className="[perspective:1600px]">
      <motion.div style={{ rotateX, scale, opacity }} className="relative mx-auto h-[26rem] max-w-6xl overflow-hidden rounded-lg md:h-[34rem]">
        <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        <div className={cn('absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/30 to-transparent', flip && 'md:bg-gradient-to-e')} />
        <div className="absolute inset-x-0 bottom-0 p-7 text-white md:p-12"><h3 className="max-w-xl text-3xl font-bold md:text-5xl">{title}</h3><p className="mt-3 max-w-lg text-white/75">{text}</p></div>
      </motion.div>
    </div>
  );
}
function Scenes() {
  const { t } = usePrefs();
  return (
    <section className="space-y-10 overflow-hidden bg-deep px-5 py-24">
      <Scene src="/img/jeddah-corniche.jpg" title={t('جدة: من الكورنيش إلى أبحر', 'Jeddah: from the Corniche to Obhur')} text={t('نبدأ من عروس البحر الأحمر، وكل عقار فيها بصفقة واضحة الخطوات.', 'We start with the Red Sea’s bride — every listing comes with a clear deal path.')} />
      <Scene src="/img/riyadh-aerial.jpg" title={t('مدن تكبر، وفرص تتسع', 'Growing cities, widening opportunities')} text={t('فرص استثمارية بعائد متوقع ومدة وحد أدنى واضح.', 'Investment opportunities with expected return, term and a clear minimum.')} />
      <Scene src="/img/yanbu-tower.jpg" title={t('شفافية في كل خطوة', 'Transparency at every step')} text={t('عقد مختوم، توقيع إلكتروني، وتأكيد من الطرفين.', 'Sealed contract, e-signature and confirmation from both sides.')} />
    </section>
  );
}

/* ---------- 5) كيف تعمل ---------- */
function How() {
  const { t } = usePrefs();
  const steps = [
    [Handshake, t('اتفاق', 'Agree'), t('تواصل مع الطرف الآخر داخل المنصة واتفقا على السعر والمدة.', 'Chat in-platform and agree on price and term.')],
    [FileSignature, t('عقد وتوقيع', 'Contract & sign'), t('يُنشأ العقد تلقائياً من بيانات الطرفين والعقار، ويوقّعه الطرفان إلكترونياً.', 'The contract is generated from both parties and the property, then e-signed.')],
    [HandCoins, t('تم التحويل', 'Transferred'), t('الدافع يؤكد أنه حوّل المبلغ.', 'The payer confirms the transfer.')],
    [BadgeCheck, t('تم الاستلام', 'Received'), t('المستلم يؤكد الاستلام فتكتمل الصفقة.', 'The receiver confirms and the deal completes.')],
    [Star, t('تقييم', 'Review'), t('يقيّم كل طرف الآخر لبناء الثقة.', 'Each side reviews the other to build trust.')],
  ] as const;
  return (
    <section id="how" className="bg-bg px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal><SectionHead eyebrow={t('كيف تعمل', 'How it works')} title={t('خمس خطوات واضحة.', 'Five clear steps.')} text={t('كل خطوة تظهر للطرفين، ولا تنتقل الصفقة إلا بتأكيد صريح.', 'Every step is visible to both sides and the deal only advances on explicit confirmation.')} /></Reveal>
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {steps.map(([I, h, p], i) => (
            <Reveal as="li" key={h} delay={i * 0.08} className="relative rounded-lg border border-line bg-surface p-6 shadow-card">
              <span className="num absolute end-5 top-4 text-5xl font-bold text-brand/15">{i + 1}</span>
              <span className="mb-4 grid size-12 place-items-center rounded-md bg-brand text-on-brand"><I className="size-6" /></span>
              <h3 className="mb-2 font-bold">{h}</h3><p className="text-sm leading-relaxed text-muted">{p}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- 6) أرقام (على طريقة أبشر) ---------- */
function Stats() {
  const { t } = usePrefs();
  const { data } = useApi<{ activeListings: number; completedDeals: number; members: number; districts: number }>('/stats');
  const items = [[data?.activeListings ?? 0, t('عقار نشط', 'Active listings')], [data?.districts ?? 0, t('حي في جدة', 'Jeddah districts')], [data?.members ?? 0, t('عضو', 'Members')], [data?.completedDeals ?? 0, t('صفقة مكتملة', 'Completed deals')]] as const;
  return (
    <section className="bg-deep px-5 py-20 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([n, l]) => (
          <div key={l} className="border-white/10 lg:border-s lg:first:border-s-0"><Counter to={n} className="num text-5xl font-bold text-brand md:text-6xl" /><p className="mt-2 text-sm text-white/65">{l}</p></div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 7) الثقة ---------- */
function Trust() {
  const { t } = usePrefs();
  const f = [
    [ShieldCheck, t('عقد مختوم', 'Sealed contract'), t('بصمة رقمية تمنع التلاعب بعد التوقيع.', 'A digital fingerprint prevents tampering after signing.')],
    [FileSignature, t('توقيع إلكتروني', 'E-signature'), t('يوقّع كل طرف باسمه المسجّل في حسابه.', 'Each party signs with their account name.')],
    [BadgeCheck, t('حسابات موثّقة', 'Verified accounts'), t('جوال وعنوان وطني مختصر لكل مستخدم.', 'Phone and short national address for every user.')],
    [Star, t('تقييمات حقيقية', 'Real reviews'), t('لا يقيّم إلا من أتمّ صفقة فعلية.', 'Only those who completed a deal can review.')],
  ] as const;
  return (
    <section id="trust" className="bg-surface-2 px-5 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <Reveal><SectionHead eyebrow={t('لماذا ضامن', 'Why Dhamin')} title={t('ثقة مبنية على تفاصيل، لا وعود.', 'Trust built on details, not promises.')} text={t('كل ما تحتاجه لإتمام صفقة بين فردين، في مكان واحد.', 'Everything to close a deal between two individuals, in one place.')} /></Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {f.map(([I, h, p], i) => <Reveal key={h} delay={i * 0.08} className="rounded-lg border border-line bg-surface p-6 shadow-card"><I className="mb-3 size-7 text-brand-text" /><h3 className="font-bold">{h}</h3><p className="mt-1 text-sm text-muted">{p}</p></Reveal>)}
        </div>
      </div>
    </section>
  );
}

/* ---------- 8) فرص استثمارية ---------- */
function InvestTeaser() {
  const { t, money, num } = usePrefs();
  const { data } = useApi<{ items: Property[] }>('/properties?listingType=invest&pageSize=3');
  return (
    <section className="bg-bg px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal><SectionHead eyebrow={t('استثمار', 'Investing')} title={t('ابدأ بمبلغ صغير وتابع عائدك.', 'Start small and track your return.')} text={t('محاكاة استثمارية — لا تُباع أسهم حقيقية.', 'Simulation only — no real shares are sold.')} /></Reveal>
          <LinkButton to="/invest" variant="dark">{t('كل الفرص', 'All opportunities')}</LinkButton>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {(data?.items ?? []).map((p, i) => p.investment && (
            <Reveal key={p.id} delay={i * 0.08}>
              <Link to={`/properties/${p.id}`} className="block rounded-lg border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:border-brand">
                <Badge>{t('فرصة استثمارية', 'Investment')}</Badge>
                <h3 className="mt-3 line-clamp-2 min-h-[3.2rem] text-lg font-bold">{p.title}</h3>
                <div className="mt-4 flex items-baseline justify-between"><span className="text-xs text-muted">{t('تم جمع', 'Raised')}</span><span className="num font-bold">{money(p.investment.raisedAmount)}</span></div>
                <Progress value={p.investment.progressPct} className="mt-2" />
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted">{t('عائد متوقع', 'Return')}</p><p className="num font-bold text-brand-text">{num(p.investment.expectedReturnPct)}%</p></div><div><p className="text-xs text-muted">{t('المدة', 'Term')}</p><p className="num font-bold">{num(p.investment.durationMonths)} {t('شهر', 'mo')}</p></div></div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 9) أسئلة شائعة ---------- */
function Faq() {
  const { t } = usePrefs();
  const [open, setOpen] = useState<number | null>(0);
  const q = [
    [t('هل أحتاج حساباً للتصفح؟', 'Do I need an account to browse?'), t('لا. التصفح مفتوح للجميع، وأي إجراء (رسالة، مفضلة، صفقة) يحوّلك للدخول ثم يعيدك لنفس المكان.', 'No. Browsing is open. Any action (message, favorite, deal) takes you to sign in and brings you back.')],
    [t('كم عقاراً وصفقة أستطيع؟', 'How many listings and deals can I have?'), t('حتى 5 إعلانات نشطة و3 صفقات نشطة لكل فرد.', 'Up to 5 active listings and 3 active deals per individual.')],
    [t('هل تنتقل الأموال عبر ضامن؟', 'Does money move through Dhamin?'), t('لا. التحويل يتم بينكما، وضامن يوثّق تأكيد الطرفين (تم التحويل / تم الاستلام).', 'No. You transfer directly; Dhamin records both confirmations (transferred / received).')],
    [t('ماذا لو حدثت مشكلة بعد التحويل؟', 'What if something goes wrong after the transfer?'), t('تفتح تذكرة دعم وتتابع حالتها من حسابك.', 'Open a support ticket and track its status from your account.')],
    [t('هل الاستثمار حقيقي؟', 'Is investing real?'), t('حالياً محاكاة لعرض الفكرة، بدون بيع أسهم حقيقية.', 'Currently a simulation to demonstrate the idea — no real shares.')],
  ];
  return (
    <section id="faq" className="bg-surface-2 px-5 py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal><SectionHead align="center" eyebrow={t('أسئلة شائعة', 'FAQ')} title={t('إجابات سريعة.', 'Quick answers.')} /></Reveal>
        <div className="mt-10 space-y-3">
          {q.map(([h, p], i) => (
            <div key={i} className="overflow-hidden rounded-md border border-line bg-surface">
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 p-5 text-start font-semibold">{h}<ChevronDown className={cn('size-5 shrink-0 transition-transform', open === i && 'rotate-180')} /></button>
              <AnimatePresence initial={false}>{open === i && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden"><p className="px-5 pb-5 text-sm leading-relaxed text-muted">{p}</p></motion.div>}</AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  const { t } = usePrefs();
  return (
    <section className="bg-bg px-5 py-24">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-lg bg-deep p-10 text-center text-white md:p-16">
        <div className="bg-grid absolute inset-0" />
        <div className="relative"><h2 className="mx-auto max-w-2xl text-3xl font-bold md:text-5xl">{t('جاهز لصفقتك الأولى؟', 'Ready for your first deal?')}</h2>
          <p className="mx-auto mt-4 max-w-md text-white/70">{t('أنشئ حسابك في دقيقة وابدأ.', 'Create your account in a minute and begin.')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><LinkButton to="/signup" size="lg">{t('إنشاء حساب', 'Create account')}</LinkButton><LinkButton to="/properties" variant="glass" size="lg">{t('تصفّح العقارات', 'Browse properties')}</LinkButton></div></div>
      </Reveal>
    </section>
  );
}

/* ---------- شريط إعلاني متحرك (مثل شريط الأخبار) — 4 تصاميم، الرقم يتحدد في TICKER_VARIANT ---------- */
const TICKER_VARIANT: 1 | 2 | 3 | 4 = 3;

function PromoTicker({ variant = TICKER_VARIANT }: { variant?: number }) {
  const { lang, t } = usePrefs();
  const items = [...PROMOS, ...PROMOS]; // مكرّر مرتين للحركة المتصلة
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const name = (p: (typeof PROMOS)[number]) => (lang === 'ar' ? p.kind.ar : p.kind.en);
  const offer = (p: (typeof PROMOS)[number]) => (lang === 'ar' ? p.offer.ar : p.offer.en);
  const tag = (p: (typeof PROMOS)[number]) => (lang === 'ar' ? p.tag.ar : p.tag.en);
  const track = (render: (p: (typeof PROMOS)[number], i: number) => React.ReactNode, cls = '') => (
    <div className={cn('ticker-track flex w-max items-center', cls)} data-dir={lang === 'ar' ? 'right' : 'left'}>{items.map(render)}</div>
  );
  const fade = (from: string) => (<>
    <div className={cn('pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r to-transparent', from)} />
    <div className={cn('pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l to-transparent', from)} />
  </>);
  const label = t('عروض ضامن', 'Dhamin offers');

  // 1) شريط أخضر ممتلئ بعرض الصفحة
  if (variant === 1) return (
    <div className="ticker relative overflow-hidden bg-brand text-deep" dir="ltr" role="region" aria-label={label}>
      {fade('from-brand')}
      {track((p, i) => (
        <Link key={i} to={p.to} dir={dir} className="flex shrink-0 items-center gap-2 px-6 py-2 text-[13px] hover:underline">
          <b className="font-bold">{name(p)}</b><span className="opacity-80">{offer(p)}</span>
          <span className="rounded-full bg-deep px-2 py-0.5 text-[11px] font-bold text-brand">{tag(p)}</span><span className="ms-3 opacity-40" aria-hidden>●</span>
        </Link>
      ))}
    </div>
  );

  // 2) كبسولة زجاجية بنفس عرض القائمة العلوية
  if (variant === 2) return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4">
      <div className="ticker relative overflow-hidden rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md" dir="ltr" role="region" aria-label={label}>
        {fade('from-[#1b4538]/80')}
        {track((p, i) => (
          <Link key={i} to={p.to} dir={dir} className="flex shrink-0 items-center gap-2.5 px-5 py-2 text-[13px] hover:text-brand">
            <span className="size-1.5 rounded-full bg-brand" /><b className="font-semibold">{name(p)}</b><span className="text-white/65">{offer(p)}</span>
            <span className="rounded-full border border-brand/60 px-2 py-0.5 text-[11px] font-semibold text-brand">{tag(p)}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  // 3) شريط "عاجل" بإخراج قنوات الأخبار: علامة ثابتة + نص يتحرك
  if (variant === 3) return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4">
      <div className="flex overflow-hidden rounded-xl border border-white/15 bg-deep/80 text-white backdrop-blur" dir="ltr" role="region" aria-label={label}>
        <div dir={dir} className="z-20 flex shrink-0 items-center gap-2 bg-brand px-4 text-[13px] font-extrabold text-on-brand">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-on-brand/60" /><span className="relative size-2 rounded-full bg-on-brand" /></span>{label}
        </div>
        <div className="ticker relative min-w-0 flex-1 overflow-hidden">
          {fade('from-deep')}
          {track((p, i) => (
            <Link key={i} to={p.to} dir={dir} className="flex shrink-0 items-center gap-2 px-5 py-2 text-[13px] hover:text-brand">
              <b className="text-brand">{name(p)}</b><span className="text-white/75">{offer(p)}</span><b>{tag(p)}</b><span className="ms-3 text-white/25" aria-hidden>|</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  // 4) بطاقات بيضاء صغيرة متحركة
  return (
    <div className="ticker relative overflow-hidden py-1" dir="ltr" role="region" aria-label={label}>
      {track((p, i) => (
        <Link key={i} to={p.to} dir={dir} className="mx-1.5 flex shrink-0 items-center gap-2.5 rounded-full bg-white py-1.5 ps-1.5 pe-4 text-[13px] text-deep shadow-md transition hover:-translate-y-0.5">
          <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold">{tag(p)}</span><b>{name(p)}</b><span className="text-deep/60">{offer(p)}</span>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  return (<><Hero /><Services /><Featured /><Scenes /><How /><Stats /><Trust /><InvestTeaser /><Faq /><Cta /></>);
}
