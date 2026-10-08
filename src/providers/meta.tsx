// قوائم المنصة (الأحياء، أنواع العقار، المرافق...) تأتي من GET /api/meta مرة واحدة
import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from '@/lib/useApi';
import type { Meta } from '@/lib/types';

const MetaCtx = createContext<Meta | null>(null);

export function MetaProvider({ children }: { children: ReactNode }) {
  const { data } = useApi<Meta>('/meta');
  return <MetaCtx.Provider value={data}>{children}</MetaCtx.Provider>;
}
const empty: Meta = { city: { id: 'jeddah', ar: 'جدة', en: 'Jeddah' }, districts: [], listingTypes: [], propertyTypes: [], usages: [], rentPeriods: [], amenities: [], dealStatuses: [], ticketStatuses: [], limits: { individual: { activeListings: 5, activeDeals: 3 } } };
export const useMeta = () => useContext(MetaCtx) ?? empty;
/** يرجع اسم عنصر (حي/نوع...) بلغة المستخدم من id */
export function nameOf(list: { id: string; ar: string; en: string }[], id: string | null | undefined, lang: 'ar' | 'en') {
  const x = list.find((i) => i.id === id);
  return x ? x[lang] : id ?? '';
}
