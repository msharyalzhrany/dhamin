// لوحة الأدمن /app/admin — عرض للقراءة فقط (مستخدمون، عقارات، صفقات، تذاكر)
import { useState } from 'react';
import { usePrefs } from '@/providers/prefs';
import { useApi } from '@/lib/useApi';
import { errText } from '@/lib/api';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

type Row = Record<string, any>;
type Data = { counts: Record<string, number>; users: Row[]; properties: Row[]; deals: Row[]; tickets: Row[] };

const fmt = (v: any, k: string) => (k === 'createdAt' && v ? new Date(v).toLocaleString('en-GB') : v == null || v === '' ? '—' : String(v));

function Table({ rows, cols }: { rows: Row[]; cols: string[] }) {
  if (!rows.length) return <p className="p-6 text-center text-muted">—</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-start text-sm" dir="ltr">
        <thead className="bg-surface-2 text-xs uppercase text-muted"><tr>{cols.map((c) => <th key={c} className="px-3 py-2.5 text-left font-semibold">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id ?? i} className="border-t border-line">{cols.map((c) => <td key={c} className="max-w-[260px] truncate px-3 py-2.5 text-left">{fmt(r[c], c)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const TABS: { id: keyof Omit<Data, 'counts'>; ar: string; en: string; cols: string[] }[] = [
  { id: 'users', ar: 'المستخدمون', en: 'Users', cols: ['name', 'email', 'phone', 'accountType', 'createdAt'] },
  { id: 'properties', ar: 'العقارات', en: 'Properties', cols: ['title', 'listingType', 'propertyType', 'district', 'price', 'status', 'createdAt'] },
  { id: 'deals', ar: 'الصفقات', en: 'Deals', cols: ['kind', 'status', 'agreedPrice', 'createdAt'] },
  { id: 'tickets', ar: 'التذاكر', en: 'Tickets', cols: ['subject', 'status', 'createdAt'] },
];

export default function Admin() {
  const { t, lang } = usePrefs();
  const { data, error, loading } = useApi<Data>('/admin/overview');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('users');
  const cur = TABS.find((x) => x.id === tab)!;

  if (loading && !data) return <div className="grid place-items-center py-20"><Spinner className="size-8" /></div>;
  if (error != null && !data) return <p className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center font-semibold" role="alert">{errText(error, lang)}</p>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{t('للمشرفين فقط', 'Admins only')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{t('لوحة الأدمن', 'Admin')}</h1>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {Object.entries(data.counts).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-4"><p className="num text-2xl font-bold">{v}</p><p className="text-xs text-muted">{k}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', tab === x.id ? 'bg-brand text-on-brand' : 'border border-line hover:bg-surface-2')}>
            {t(x.ar, x.en)} <span className="num opacity-70">({data[x.id].length})</span>
          </button>
        ))}
      </div>
      <Table rows={data[tab]} cols={cur.cols} />
    </div>
  );
}
