// بطاقة الإجراءات اللاصقة في صفحة العقار: السعر، تواصل، ابدأ صفقة، مفضلة، مشاركة
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Pencil, Share2, Handshake, TrendingUp, Timer, Wallet, Info } from 'lucide-react';
import { api, errText } from '@/lib/api';
import { Button, LinkButton } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { priceLabel } from '@/components/PropertyCard';
import { useAuth, useLoginGuard } from '@/providers/auth';
import { usePrefs } from '@/providers/prefs';
import { useToast } from '@/providers/toast';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

export function ActionCard({ p, onFavorite }: { p: Property; onFavorite: () => void }) {
  const { t, lang, money, num } = usePrefs();
  const { user } = useAuth();
  const guard = useLoginGuard();
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState<'msg' | 'deal' | null>(null);
  const inv = p.investment;
  const mine = !!user && user.id === p.ownerId;
  const open = p.status === 'active';
  const [amount, setAmount] = useState(inv?.minInvestment ?? 0);

  // نفتح محادثة (أو نرجع الموجودة) — الصفقة تُقترح من داخل المحادثة
  const contact = (kind: 'msg' | 'deal') => guard(async () => {
    setBusy(kind);
    try {
      const r = await api<{ id: string }>('/conversations', { method: 'POST', body: { propertyId: p.id } });
      nav(`/app/messages/${r.id}`);
    } catch (e) { toast(errText(e, lang), 'err'); setBusy(null); }
  });

  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); toast(t('تم نسخ الرابط', 'Link copied')); }
    catch { toast(t('تعذّر النسخ', 'Could not copy'), 'err'); }
  };

  const profit = inv ? (amount * inv.expectedReturnPct / 100) * (inv.durationMonths / 12) : 0;
  const remaining = inv ? Math.max(0, inv.targetAmount - inv.raisedAmount) : 0;

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <p className="text-xs font-medium text-muted">{inv ? t('المبلغ المستهدف', 'Funding target') : p.listingType === 'rent' ? t('الإيجار', 'Rent') : t('السعر', 'Price')}</p>
      <p className="num mt-1 text-3xl font-bold tracking-tight">{inv ? money(inv.targetAmount) : priceLabel(p, money, lang)}</p>

      {inv && (
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm"><span className="text-muted">{t('تم جمع', 'Raised')} <span className="num font-semibold text-ink">{money(inv.raisedAmount)}</span></span><span className="num font-bold">{inv.progressPct}%</span></div>
            <Progress value={inv.progressPct} />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[{ i: Wallet, v: money(inv.minInvestment), l: t('الحد الأدنى', 'Minimum') }, { i: Timer, v: `${num(inv.durationMonths)} ${t('شهر', 'mo')}`, l: t('المدة', 'Term') }, { i: TrendingUp, v: `${num(inv.expectedReturnPct)}%`, l: t('عائد متوقع', 'Return') }].map((x) => (
              <div key={x.l} className="rounded-2xl bg-surface-2 p-2.5">
                <x.i className="mx-auto size-4 text-brand-text" />
                <dd className="num mt-1 text-xs font-bold">{x.v}</dd>
                <dt className="text-[0.7rem] text-muted">{x.l}</dt>
              </div>
            ))}
          </dl>
          <div className="rounded-2xl border border-line p-3.5">
            <label htmlFor="sim-amt" className="text-sm font-semibold">{t('جرّب مبلغاً (محاكاة)', 'Try an amount (simulation)')}</label>
            <input id="sim-amt" type="number" inputMode="numeric" min={inv.minInvestment} max={remaining} step={500} value={amount || ''}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="num mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/20" />
            <p className="mt-2 flex items-center justify-between text-sm"><span className="text-muted">{t('الربح المتوقع', 'Projected profit')}</span><span className="num font-bold text-brand-text">{money(Math.round(profit))}</span></p>
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />{t('محاكاة استثمارية — لا تُباع أسهم حقيقية', 'Simulation only — no real shares are sold')}</p>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2.5">
        {mine ? (
          <LinkButton to={`/app/properties/${p.id}/edit`} size="lg" className="w-full"><Pencil className="size-4" />{t('تعديل الإعلان', 'Edit listing')}</LinkButton>
        ) : open ? (
          <>
            <Button size="lg" className="w-full" loading={busy === 'msg'} disabled={!!busy} onClick={() => contact('msg')}><MessageCircle className="size-5" />{t('تواصل مع المالك', 'Message owner')}</Button>
            <Button size="lg" variant="dark" className="w-full" loading={busy === 'deal'} disabled={!!busy} onClick={() => contact('deal')}><Handshake className="size-5" />{inv ? t('ابدأ صفقة استثمار', 'Start an investment deal') : t('ابدأ صفقة', 'Start a deal')}</Button>
          </>
        ) : (
          <p className="rounded-2xl bg-surface-2 p-3.5 text-center text-sm font-medium text-muted">{t('هذا العقار غير متاح حالياً للتواصل', 'This property is not open for contact right now')}</p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" onClick={onFavorite} aria-pressed={!!p.isFavorite}><Heart className={cn('size-4', p.isFavorite && 'fill-brand text-brand')} />{p.isFavorite ? t('في المفضلة', 'Saved') : t('أضف للمفضلة', 'Save')}</Button>
          <Button variant="outline" onClick={share}><Share2 className="size-4" />{t('مشاركة', 'Share')}</Button>
        </div>
      </div>
    </div>
  );
}
