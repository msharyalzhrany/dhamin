// المفضلة /app/favorites — شبكة بطاقات العقار مع إزالة فورية (تفاؤلية)
import { AlertCircle, Heart, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, LinkButton } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { PropertyFlipCard } from '@/components/PropertyCard';
import { usePrefs } from '@/providers/prefs';
import { useToast } from '@/providers/toast';
import { useAuth } from '@/providers/auth';
import { useApi } from '@/lib/useApi';
import { api, errText } from '@/lib/api';
import type { Property } from '@/lib/types';

export default function Favorites() {
  const { t, lang, num } = usePrefs();
  const toast = useToast();
  const { refresh } = useAuth();
  const { data, error, loading, reload, setData } = useApi<{ items: Property[] }>('/properties/favorites');
  const items = data?.items ?? [];

  // نحذفها من الواجهة فوراً، وإذا فشل الطلب نرجعها
  async function remove(p: Property) {
    const before = data;
    setData({ items: items.filter((x) => x.id !== p.id) });
    try {
      await api(`/properties/${p.id}/favorite`, { method: 'DELETE' });
      toast(t('أُزيل من المفضلة', 'Removed from favorites'));
      refresh();
    } catch (e) {
      setData(before);
      toast(errText(e, lang), 'err');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{t('محفوظاتي', 'Saved')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{t('المفضلة', 'Favorites')} {data && <span className="num text-muted">({num(items.length)})</span>}</h1>
      </header>
      {loading && !data && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[500px] rounded-3xl" />)}</div>}
      {error != null && !data && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-10 text-center" role="alert">
          <AlertCircle className="size-8" /><p className="font-semibold">{errText(error, lang)}</p>
          <Button variant="outline" onClick={reload}>{t('إعادة المحاولة', 'Try again')}</Button>
        </div>
      )}
      {data && items.length === 0 && (
        <EmptyState icon={<Heart className="size-6" />} title={t('لا توجد عقارات في مفضلتك', 'No favorites yet')} text={t('اضغط على القلب في أي عقار لحفظه هنا.', 'Tap the heart on any listing to save it here.')}
          action={<LinkButton to="/properties"><Search className="size-4" />{t('تصفّح العقارات', 'Browse properties')}</LinkButton>} />
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {items.map((p) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
              <PropertyFlipCard p={{ ...p, isFavorite: true }} onFavorite={remove} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
