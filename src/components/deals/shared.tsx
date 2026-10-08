// أدوات مشتركة لصفحات الصفقات: شارة الحالة، نوع الصفقة، وصف "خطوتك التالية"
import { Building2, Coins, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/misc';
import { useMeta, nameOf } from '@/providers/meta';
import { usePrefs } from '@/providers/prefs';
import type { DealStatus, NextAction } from '@/lib/types';

/** مجموعات الحالات لتبويبات الصفقات */
export const ACTIVE_STATUSES: DealStatus[] = ['negotiating', 'agreed', 'awaiting_signatures', 'awaiting_transfer', 'awaiting_receipt'];
export const isFinal = (s: DealStatus) => s === 'completed' || s === 'cancelled' || s === 'disputed';

/** إجراءات تحتاج منّي تحركاً (وليست انتظاراً) */
export const MY_TURN: NextAction[] = ['accept', 'sign', 'confirm_transfer', 'confirm_receipt', 'review'];

/** شارة الحالة بلون يناسب المعنى ضمن الهوية (الأخضر = تقدّم، الداكن = تنبيه، الإطار = ملغاة) */
export function StatusChip({ status, className }: { status: DealStatus; className?: string }) {
  const { dealStatuses } = useMeta();
  const { lang, t } = usePrefs();
  const fallback: Record<DealStatus, [string, string]> = {
    negotiating: ['قيد التفاوض', 'Negotiating'], agreed: ['تم الاتفاق', 'Agreed'], awaiting_signatures: ['بانتظار التوقيع', 'Awaiting signatures'],
    awaiting_transfer: ['بانتظار التحويل', 'Awaiting transfer'], awaiting_receipt: ['بانتظار الاستلام', 'Awaiting receipt'],
    completed: ['مكتملة', 'Completed'], cancelled: ['ملغاة', 'Cancelled'], disputed: ['متنازع عليها', 'Disputed'],
  };
  const label = nameOf(dealStatuses, status, lang) !== status ? nameOf(dealStatuses, status, lang) : t(...fallback[status]);
  const tone = status === 'completed' ? 'solid' : status === 'cancelled' ? 'outline' : status === 'disputed' ? 'dark' : 'soft';
  return <Badge tone={tone} className={className}>{label}</Badge>;
}

export function KindChip({ kind, className }: { kind: 'sale' | 'rent' | 'invest'; className?: string }) {
  const { t } = usePrefs();
  const map = {
    sale: { icon: Building2, label: t('بيع', 'Sale') },
    rent: { icon: KeyRound, label: t('إيجار', 'Rent') },
    invest: { icon: Coins, label: t('استثمار', 'Invest') },
  } as const;
  const I = map[kind].icon;
  return <Badge tone="outline" className={className}><I className="size-3.5" />{map[kind].label}</Badge>;
}

/** نص الخطوة التالية القصير (لبطاقات القائمة) */
export function useNextLabel() {
  const { t } = usePrefs();
  return (a: NextAction, other: string): string => {
    switch (a) {
      case 'accept': return t('راجع الاقتراح ووافق', 'Review and accept the proposal');
      case 'wait': return t(`بانتظار رد ${other}`, `Waiting for ${other} to respond`);
      case 'sign': return t('وقّع العقد', 'Sign the contract');
      case 'wait_signature': return t(`بانتظار توقيع ${other}`, `Waiting for ${other} to sign`);
      case 'confirm_transfer': return t('أكّد التحويل بعد إتمامه', 'Confirm once you have transferred');
      case 'wait_transfer': return t(`بانتظار تحويل ${other}`, `Waiting for ${other} to transfer`);
      case 'confirm_receipt': return t('أكّد استلام المبلغ', 'Confirm you received the money');
      case 'wait_receipt': return t(`بانتظار تأكيد استلام ${other}`, `Waiting for ${other} to confirm receipt`);
      case 'review': return t('قيّم تجربتك', 'Rate your experience');
      default: return '';
    }
  };
}

/** السعر مع الوحدة حسب نوع الصفقة (إيجار: لكل مدة) */
export function usePriceLine() {
  const { t, money, num } = usePrefs();
  return (kind: 'sale' | 'rent' | 'invest', price: number, months: number | null) => {
    if (kind === 'rent' && months) return `${money(price)} · ${t(`${num(months)} شهراً`, `${num(months)} months`)}`;
    if (kind === 'invest' && months) return `${money(price)} · ${t(`${num(months)} شهراً`, `${num(months)} months`)}`;
    return money(price);
  };
}
