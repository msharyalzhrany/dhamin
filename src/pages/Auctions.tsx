// المزادات: بطاقة "قريباً" فقط (مؤجَّلة حسب الخطة)
import { motion } from 'motion/react';
import { Bell, Gavel, ShieldCheck, Timer } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { usePrefs } from '@/providers/prefs';

export default function Auctions() {
  const { t } = usePrefs();
  const feats = [
    { i: Timer, ar: 'مزادات بمدد محددة وعدّاد حي', en: 'Timed auctions with a live countdown' },
    { i: ShieldCheck, ar: 'عقد وتوقيع وختم لكل مزاد', en: 'Sealed contract for every auction' },
    { i: Bell, ar: 'تنبيهات بالبريد والرسائل', en: 'Email & SMS alerts' },
  ];
  return (
    <section className="relative min-h-[88vh] overflow-hidden bg-deep px-5 pb-20 pt-36 text-white">
      <img src="/img/riyadh-night.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-b from-deep/60 via-deep/80 to-deep" />
      <div className="bg-grid absolute inset-0" />
      <motion.div initial={{ opacity: 0, y: 30, rotateX: 12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200 }} className="glass relative mx-auto max-w-2xl rounded-[2rem] p-8 text-center sm:p-12">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brand text-on-brand animate-float"><Gavel className="size-8" /></div>
        <Badge tone="solid">{t('قريباً', 'Coming soon')}</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{t('مزادات ضامن', 'Dhamin Auctions')}</h1>
        <p className="mx-auto mt-4 max-w-md text-white/70">{t('نجهّز تجربة مزادات عقارية شفافة وآمنة. ابقَ قريباً — وفي هذه الأثناء تصفّح العقارات والفرص.', 'We are preparing a transparent, secure real-estate auction experience. Meanwhile, browse properties and opportunities.')}</p>
        <ul className="mx-auto mt-8 grid gap-3 text-start sm:grid-cols-3">
          {feats.map(({ i: I, ar, en }) => (
            <li key={en} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"><I className="mb-2 size-5 text-brand" />{t(ar, en)}</li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton to="/properties" variant="primary" size="lg">{t('تصفّح العقارات', 'Browse properties')}</LinkButton>
          <LinkButton to="/invest" variant="glass" size="lg">{t('الفرص الاستثمارية', 'Investments')}</LinkButton>
        </div>
      </motion.div>
    </section>
  );
}
