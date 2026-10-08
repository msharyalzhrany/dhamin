// خطّافات مشتركة لصفحات التصفح: تأخير الكتابة (debounce) + تبديل المفضلة بتحديث فوري
import { useCallback, useEffect, useRef } from 'react';
import { api, errText } from '@/lib/api';
import { useLoginGuard } from '@/providers/auth';
import { useToast } from '@/providers/toast';
import { usePrefs } from '@/providers/prefs';
import type { Property } from '@/lib/types';

/** يرجع دالة تؤجّل التنفيذ ~350ms وتلغي ما قبلها؛ وتُلغى عند إغلاق المكوّن */
export function useDebouncedFn<A extends unknown[]>(fn: (...a: A) => void, delay = 350) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = useCallback((...a: A) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(...a), delay);
  }, [delay]);
  const cancel = useCallback(() => clearTimeout(timer.current), []);
  return Object.assign(run, { cancel });
}

/** قلب المفضلة: يطلب الدخول للزائر، ويحدّث الواجهة فوراً ثم يتراجع إن فشل الطلب */
export function useToggleFavorite(apply: (id: string, fav: boolean) => void) {
  const guard = useLoginGuard();
  const toast = useToast();
  const { t, lang } = usePrefs();
  return useCallback((p: Property) => guard(async () => {
    const next = !p.isFavorite;
    apply(p.id, next);
    try {
      await api(`/properties/${p.id}/favorite`, { method: next ? 'POST' : 'DELETE' });
      toast(next ? t('أُضيف للمفضلة', 'Saved to favorites') : t('أُزيل من المفضلة', 'Removed from favorites'));
    } catch (e) {
      apply(p.id, !next);
      toast(errText(e, lang), 'err');
    }
  }), [guard, apply, toast, t, lang]);
}
