// لوحة الأدمن /app/admin — عرض + تعديل + حذف (مستخدمون، عقارات، صفقات، تذاكر)
import { useState } from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import { usePrefs } from '@/providers/prefs';
import { useToast } from '@/providers/toast';
import { useApi } from '@/lib/useApi';
import { api, errText } from '@/lib/api';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

type Row = Record<string, any>;
type Data = { counts: Record<string, number>; users: Row[]; properties: Row[]; deals: Row[]; tickets: Row[] };
type TabId = 'users' | 'properties' | 'deals' | 'tickets';

const fmt = (v: any, k: string) => (k === 'createdAt' && v ? new Date(v).toLocaleString('en-GB') : v == null || v === '' ? '—' : String(v));

// الحقول القابلة للتعديل لكل تبويب
const FIELDS: Partial<Record<TabId, { key: string; label: string; type?: 'text' | 'number' | 'select'; options?: string[] }[]>> = {
  users: [
    { key: 'name', label: 'name' },
    { key: 'phone', label: 'phone' },
    { key: 'accountType', label: 'accountType', type: 'select', options: ['individual', 'company', 'staff'] },
  ],
  properties: [
    { key: 'title', label: 'title' },
    { key: 'price', label: 'price', type: 'number' },
    { key: 'status', label: 'status', type: 'select', options: ['active', 'reserved', 'closed', 'archived'] },
  ],
};

const TABS: { id: TabId; ar: string; en: string; cols: string[] }[] = [
  { id: 'users', ar: 'المستخدمون', en: 'Users', cols: ['name', 'email', 'phone', 'accountType', 'createdAt'] },
  { id: 'properties', ar: 'العقارات', en: 'Properties', cols: ['title', 'listingType', 'propertyType', 'district', 'price', 'status', 'createdAt'] },
  { id: 'deals', ar: 'الصفقات', en: 'Deals', cols: ['kind', 'status', 'agreedPrice', 'createdAt'] },
  { id: 'tickets', ar: 'التذاكر', en: 'Tickets', cols: ['subject', 'status', 'createdAt'] },
];

export default function Admin() {
  const { t, lang } = usePrefs();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<Data>('/admin/overview');
  const [tab, setTab] = useState<TabId>('users');
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = TABS.find((x) => x.id === tab)!;
  const fields = FIELDS[tab];
  const canDelete = tab !== 'tickets';

  if (loading && !data) return <div className="grid place-items-center py-20"><Spinner className="size-8" /></div>;
  if (error != null && !data) return <p className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center font-semibold" role="alert">{errText(error, lang)}</p>;
  if (!data) return null;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast(ok); setEditing(null); setConfirmId(null); reload(); }
    catch (e) { toast(errText(e, lang), 'err'); }
    finally { setBusy(false); }
  }
  const startEdit = (r: Row) => { setEditing(r); setConfirmId(null); setForm(Object.fromEntries((fields ?? []).map((f) => [f.key, r[f.key] ?? '']))); };
  const save = () => run(() => api(`/admin/${tab}/${editing!.id}`, { method: 'PATCH', body: form }), t('تم الحفظ', 'Saved'));
  const del = (r: Row) => run(() => api(`/admin/${tab}/${r.id}`, { method: 'DELETE' }), t('تم الحذف', 'Deleted'));

  const rows = data[tab];
  const hasActions = !!fields || canDelete;

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
          <button key={x.id} onClick={() => { setTab(x.id); setEditing(null); setConfirmId(null); }} className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', tab === x.id ? 'bg-brand text-on-brand' : 'border border-line hover:bg-surface-2')}>
            {t(x.ar, x.en)} <span className="num opacity-70">({data[x.id].length})</span>
          </button>
        ))}
      </div>

      {editing && fields && (
        <div className="space-y-3 rounded-2xl border border-brand bg-surface p-4" dir="ltr">
          <p className="text-sm font-semibold">{t('تعديل', 'Edit')}: {editing.name ?? editing.title}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {fields.map((f) => (
              <label key={f.key} className="space-y-1 text-xs font-semibold text-muted">{f.label}
                {f.type === 'select' ? (
                  <select value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink">
                    {f.options!.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type ?? 'text'} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink" />
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button disabled={busy} onClick={save} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand disabled:opacity-50"><Check className="size-4" />{t('حفظ', 'Save')}</button>
            <button onClick={() => setEditing(null)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line px-4 text-sm font-semibold"><X className="size-4" />{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      {!rows.length ? <p className="p-6 text-center text-muted">—</p> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm" dir="ltr">
            <thead className="bg-surface-2 text-xs uppercase text-muted">
              <tr>{cur.cols.map((c) => <th key={c} className="px-3 py-2.5 text-left font-semibold">{c}</th>)}{hasActions && <th />}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  {cur.cols.map((c) => <td key={c} className="max-w-[240px] truncate px-3 py-2.5 text-left">{fmt(r[c], c)}</td>)}
                  {hasActions && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {confirmId === r.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button disabled={busy} onClick={() => del(r)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{t('تأكيد الحذف', 'Confirm delete')}</button>
                          <button onClick={() => setConfirmId(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">{t('إلغاء', 'Cancel')}</button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {fields && <button onClick={() => startEdit(r)} aria-label="edit" className="grid size-8 place-items-center rounded-lg hover:bg-surface-2"><Pencil className="size-4" /></button>}
                          {canDelete && <button onClick={() => { setConfirmId(r.id); setEditing(null); }} aria-label="delete" className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-surface-2"><Trash2 className="size-4" /></button>}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">{t('حذف مستخدم يحذف معه عقاراته وصفقاته ومحادثاته نهائياً.', 'Deleting a user permanently deletes their listings, deals and chats.')}</p>
    </div>
  );
}
