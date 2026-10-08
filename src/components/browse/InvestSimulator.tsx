// محاكي الاستثمار: يحسب الربح المتوقع (ربح بسيط) ويرسم نمو القيمة شهراً بشهر بـ SVG مكتوب يدوياً
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import { Select } from '@/components/ui/field';
import { usePrefs } from '@/providers/prefs';
import type { Property } from '@/lib/types';

export function calcSim(amount: number, retPct: number, months: number) {
  const profit = amount * (retPct / 100) * (months / 12);
  return { profit, total: amount + profit, monthly: months ? profit / months : 0 };
}

export function InvestSimulator({ items, selectedId, onSelect }: { items: Property[]; selectedId: string; onSelect: (id: string) => void }) {
  const { t, money, num } = usePrefs();
  const p = items.find((x) => x.id === selectedId) ?? items[0];
  const inv = p?.investment;
  const remaining = inv ? Math.max(inv.minInvestment, inv.targetAmount - inv.raisedAmount) : 0;
  const [amount, setAmount] = useState(inv?.minInvestment ?? 0);
  useEffect(() => { if (inv) setAmount(inv.minInvestment); }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p || !inv) return null;

  const a = Math.min(remaining, Math.max(0, amount));
  const r = calcSim(a, inv.expectedReturnPct, inv.durationMonths);
  const share = (a / inv.targetAmount) * 100;
  const step = remaining > 500_000 ? 5000 : 500;

  const outs = [
    { l: t('الربح المتوقع', 'Projected profit'), v: money(Math.round(r.profit)), strong: true },
    { l: t('الإجمالي عند الاستحقاق', 'Total back'), v: money(Math.round(r.total)) },
    { l: t('نسبتك من المستهدف', 'Share of target'), v: `${num(Math.round(share * 100) / 100)}%` },
    { l: t('متوسط شهري', 'Monthly average'), v: money(Math.round(r.monthly)) },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="space-y-5 rounded-3xl border border-line bg-surface p-6 shadow-card">
        <label className="block space-y-2">
          <span className="text-sm font-semibold">{t('اختر الفرصة', 'Choose an opportunity')}</span>
          <Select value={p.id} onChange={(e) => onSelect(e.target.value)}>{items.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select>
        </label>
        <div className="space-y-2">
          <label htmlFor="sim-amount" className="text-sm font-semibold">{t('مبلغ الاستثمار (ريال)', 'Investment amount (SAR)')}</label>
          <input id="sim-amount" type="number" inputMode="numeric" min={inv.minInvestment} max={remaining} step={step} value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))} onBlur={() => setAmount(a < inv.minInvestment ? inv.minInvestment : a)}
            className="num h-12 w-full rounded-xl border border-line bg-surface px-4 outline-none focus:border-brand focus:ring-4 focus:ring-brand/20" />
          <input type="range" min={inv.minInvestment} max={remaining} step={step} value={Math.max(inv.minInvestment, a)} onChange={(e) => setAmount(Number(e.target.value))}
            aria-label={t('مبلغ الاستثمار', 'Investment amount')} className="h-8 w-full cursor-pointer accent-[var(--brand)]" />
          <div className="num flex justify-between text-xs text-muted"><span>{money(inv.minInvestment)}</span><span>{money(remaining)}</span></div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{t('العائد المتوقع', 'Expected return')}</dt><dd className="num font-bold">{num(inv.expectedReturnPct)}% / {t('سنة', 'yr')}</dd></div>
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{t('المدة', 'Term')}</dt><dd className="num font-bold">{num(inv.durationMonths)} {t('شهر', 'mo')}</dd></div>
        </dl>
      </div>

      <div className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-card">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {outs.map((o) => (
            <div key={o.l} className={o.strong ? 'rounded-2xl bg-brand p-3.5 text-on-brand' : 'rounded-2xl bg-surface-2 p-3.5'}>
              <dt className={o.strong ? 'text-xs font-medium opacity-80' : 'text-xs text-muted'}>{o.l}</dt>
              <dd className="num mt-1 text-base font-bold" data-testid={o.strong ? 'sim-profit' : undefined}>{o.v}</dd>
            </div>
          ))}
        </dl>
        <GrowthChart amount={a} profit={r.profit} months={inv.durationMonths} />
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted"><Info className="mt-0.5 size-4 shrink-0" />{t('أرقام تقديرية لأغراض المحاكاة فقط (ربح بسيط = المبلغ × العائد × المدة/١٢)، وليست وعداً بعائد ولا تُباع فيها أسهم حقيقية.', 'Estimates for simulation only (simple profit = amount × return × months/12). Not a promise of returns, and no real shares are sold.')}</p>
      </div>
    </div>
  );
}

// رسم بياني مساحي بسيط: قيمة الاستثمار (المبلغ + الربح المتراكم) على مدى الأشهر
function GrowthChart({ amount, profit, months }: { amount: number; profit: number; months: number }) {
  const { t, num, money } = usePrefs();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)));
    ro.observe(el); setW(Math.max(260, el.clientWidth));
    return () => ro.disconnect();
  }, []);
  const H = 280, m = { t: 14, b: 34, s: 62, e: 14 };
  const iw = w - m.s - m.e, ih = H - m.t - m.b;
  const top = Math.max(amount + profit, 1);
  const bottom = Math.max(0, amount - profit * 0.6); // نقطة بداية المحور قريبة من المبلغ ليظهر النمو
  const range = top - bottom || 1;
  const ticks = [0, 1, 2, 3, 4].map((i) => bottom + (range * i) / 4);
  const val = (mo: number) => amount + (profit * mo) / months;
  // الرسوم البيانية تبقى بترتيب الزمن من اليسار لليمين حتى في العربي
  const x = (mo: number) => m.s + (mo / months) * iw;
  const y = (v: number) => m.t + ih - ((v - bottom) / range) * ih;
  const pts = useMemo(() => Array.from({ length: months + 1 }, (_, k) => [x(k), y(val(k))] as const), [amount, profit, months, w]); // eslint-disable-line react-hooks/exhaustive-deps
  const line = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  const area = `${line} L${x(months)},${y(bottom)} L${x(0)},${y(bottom)} Z`;
  const xt = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(months * f)).filter((v, i, a) => a.indexOf(v) === i);
  const compact = (v: number) => (v < 1e5 ? num(Math.round(v)) : v >= 1e6 ? `${num(Math.round(v / 1e5) / 10)}M` : v >= 1e3 ? `${num(Math.round(v / 100) / 10)}K` : num(Math.round(v)));
  return (
    <div ref={box} className="w-full">
      <svg width={w} height={H} role="img" aria-label={t(`رسم بياني لنمو ${money(Math.round(amount))} إلى ${money(Math.round(amount + profit))} خلال ${months} شهراً`, `Growth chart: ${money(Math.round(amount))} grows to ${money(Math.round(amount + profit))} over ${months} months`)}>
        <title>{t('نمو الاستثمار شهرياً', 'Monthly investment growth')}</title>
        <defs><linearGradient id="gfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity="0.45" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0.02" /></linearGradient></defs>
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={m.s} x2={w - m.e} y1={y(tk)} y2={y(tk)} stroke="var(--line)" strokeDasharray={i ? '3 4' : undefined} />
            <text x={m.s - 8} y={y(tk) + 4} textAnchor="end" className="num fill-muted text-[0.7rem]">{compact(tk)}</text>
          </g>
        ))}
        {xt.map((mo) => <text key={mo} x={x(mo)} y={H - 10} textAnchor="middle" className="num fill-muted text-[0.7rem]">{mo === 0 ? '0' : `${num(mo)}${t('ش', 'm')}`}</text>)}
        <motion.path key={`${amount}-${profit}-${months}`} d={area} fill="url(#gfill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path key={`l${amount}-${profit}-${months}`} d={line} fill="none" stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
        <line x1={x(0)} x2={x(months)} y1={y(amount)} y2={y(amount)} stroke="var(--ink)" strokeOpacity={0.5} strokeDasharray="2 5" />
        <circle cx={x(months)} cy={y(amount + profit)} r={5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-brand" />{t('قيمة الاستثمار', 'Investment value')}</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-ink/50" />{t('المبلغ المستثمَر', 'Amount invested')}</span>
      </div>
      <table className="sr-only"><caption>{t('جدول نمو الاستثمار', 'Growth table')}</caption><thead><tr><th>{t('الشهر', 'Month')}</th><th>{t('القيمة', 'Value')}</th></tr></thead>
        <tbody>{xt.map((mo) => <tr key={mo}><td>{mo}</td><td>{money(Math.round(val(mo)))}</td></tr>)}</tbody></table>
    </div>
  );
}
