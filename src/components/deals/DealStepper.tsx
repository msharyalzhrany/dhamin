// شريط مراحل الصفقة المتحرك: أفقي على الشاشات الكبيرة، عمودي على الجوال
// المراحل: الاتفاق ← العقد والتوقيع ← التحويل ← الاستلام ← الإكمال والتقييم
import { motion } from 'motion/react';
import { AlertTriangle, Ban, Check, FileSignature, Handshake, Landmark, PackageCheck, Star } from 'lucide-react';
import { usePrefs } from '@/providers/prefs';
import { cn } from '@/lib/utils';
import type { DealDetail } from './types';

type StepState = 'done' | 'current' | 'upcoming' | 'stopped' | 'disputed';

export function DealStepper({ deal }: { deal: DealDetail }) {
  const { t } = usePrefs();
  const steps = [
    { icon: Handshake, title: t('الاتفاق', 'Agreement'), sub: t('اقتراح السعر وقبوله', 'Price proposed and accepted') },
    { icon: FileSignature, title: t('العقد والتوقيع', 'Contract & signatures'), sub: t('يوقّع الطرفان العقد', 'Both parties sign') },
    { icon: Landmark, title: t('التحويل', 'Transfer'), sub: t('الدافع يحوّل ويؤكد', 'Payer transfers and confirms') },
    { icon: PackageCheck, title: t('الاستلام', 'Receipt'), sub: t('المستلم يؤكد الاستلام', 'Receiver confirms') },
    { icon: Star, title: t('الإكمال والتقييم', 'Completed & review'), sub: t('تقييم متبادل', 'Mutual reviews') },
  ];

  // أين وصلت الصفقة؟ (index المرحلة الحالية) وهل توقفت
  const s = deal.status;
  let cur = 0;
  let halted: 'cancelled' | 'disputed' | null = null;
  if (s === 'negotiating') cur = 0;
  else if (s === 'agreed' || s === 'awaiting_signatures') cur = 1;
  else if (s === 'awaiting_transfer') cur = 2;
  else if (s === 'awaiting_receipt') cur = 3;
  else if (s === 'completed') cur = deal.nextAction === 'review' ? 4 : 5; // 5 = كل المراحل منتهية
  else if (s === 'cancelled') { halted = 'cancelled'; cur = deal.payerConfirmedAt ? 3 : deal.contract?.status === 'signed' || deal.contract?.signatures.length === 2 ? 2 : deal.contract ? 1 : 0; }
  else if (s === 'disputed') { halted = 'disputed'; cur = deal.payerConfirmedAt ? 3 : 2; }

  const stateOf = (i: number): StepState => {
    if (halted && i === cur) return halted === 'cancelled' ? 'stopped' : 'disputed';
    if (i < cur) return 'done';
    if (i === cur && !halted) return 'current';
    return 'upcoming';
  };

  return (
    <ol className="flex flex-col md:flex-row" aria-label={t('مراحل الصفقة', 'Deal progress')}>
      {steps.map((st, i) => {
        const state = stateOf(i);
        const last = i === steps.length - 1;
        const Icon = state === 'done' ? Check : state === 'stopped' ? Ban : state === 'disputed' ? AlertTriangle : st.icon;
        return (
          <li key={i} className={cn('relative flex gap-4 md:flex-1 md:flex-col md:items-center md:gap-3 md:text-center', !last && 'pb-7 md:pb-0')} aria-current={state === 'current' ? 'step' : undefined}>
            {/* الخط الواصل للمرحلة التالية */}
            {!last && (
              <span aria-hidden className="absolute start-[1.2rem] top-11 h-[calc(100%-2.75rem)] w-0.5 bg-line md:start-1/2 md:top-5 md:h-0.5 md:w-full">
                <motion.span className="absolute inset-0 origin-top bg-brand md:origin-left md:rtl:origin-right"
                  initial={{ scaleY: 0, scaleX: 0 }} animate={{ scaleY: i < cur ? 1 : 0, scaleX: i < cur ? 1 : 0 }} transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: 'easeOut' }} />
              </span>
            )}
            <div className="relative z-10 shrink-0">
              {state === 'current' && (
                <motion.span layoutId="stepper-ring" className="absolute -inset-1.5 rounded-full border-2 border-brand" transition={{ type: 'spring', damping: 24, stiffness: 260 }} />
              )}
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08, type: 'spring', damping: 16 }}
                className={cn('grid size-10 place-items-center rounded-full border-2 transition-colors',
                  state === 'done' && 'border-brand bg-brand text-on-brand',
                  state === 'current' && 'border-brand bg-brand-soft text-brand-text',
                  state === 'upcoming' && 'border-line bg-surface text-muted',
                  state === 'stopped' && 'border-ink bg-surface text-ink',
                  state === 'disputed' && 'border-ink bg-deep text-white dark:bg-mist dark:text-deep')}>
                <Icon className="size-[1.1rem]" />
              </motion.span>
            </div>
            <div className="min-w-0 pt-1 md:pt-0">
              <p className={cn('text-sm font-bold leading-tight', state === 'upcoming' && 'text-muted')}>{st.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted md:px-2">
                {state === 'stopped' ? t('توقفت هنا (ملغاة)', 'Stopped here (cancelled)') : state === 'disputed' ? t('توقفت هنا (نزاع)', 'Stopped here (disputed)') : st.sub}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
