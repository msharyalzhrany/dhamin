// رسوم بيانية مكتوبة يدوياً بـ SVG (بدون أي مكتبة رسوم) — منحنى المشاهدات + خط مصغّر
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { usePrefs } from '@/providers/prefs';

export type DayPoint = { date: string; views: number };

/** مسار منحنى ناعم "رتيب" (Monotone cubic) — لا يتجاوز القيم فلا يظهر هبوط وهمي تحت الصفر */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [], sl: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    sl.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const tg: number[] = [sl[0]];
  for (let i = 1; i < n - 1; i++) tg.push(sl[i - 1] * sl[i] <= 0 ? 0 : (sl[i - 1] + sl[i]) / 2);
  tg.push(sl[n - 2]);
  // تصحيح الميول حتى لا يتجاوز المنحنى النقاط
  for (let i = 0; i < n - 1; i++) {
    if (sl[i] === 0) { tg[i] = 0; tg[i + 1] = 0; continue; }
    const a = tg[i] / sl[i], b = tg[i + 1] / sl[i], h = Math.hypot(a, b);
    if (h > 3) { const k = 3 / h; tg[i] = k * a * sl[i]; tg[i + 1] = k * b * sl[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const w = dx[i] / 3;
    d += ` C${pts[i][0] + w},${pts[i][1] + tg[i] * w} ${pts[i + 1][0] - w},${pts[i + 1][1] - tg[i + 1] * w} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/** خطوات محور Y "مدوّرة" (1، 2، 5 × 10^n) */
function niceScale(maxV: number) {
  const raw = Math.max(maxV, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  const step = Math.max(1, (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag);
  const top = step * Math.max(2, Math.ceil(maxV / step));
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

export function AreaChart({ series }: { series: DayPoint[] }) {
  const { t, num, date } = usePrefs();
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(300);
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  // نقيس العرض الحقيقي ونرسم بالـ viewBox نفسه فيبقى النص حاداً بحجمه الطبيعي
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  const h = w < 480 ? 230 : 290;
  const m = { l: 38, r: 12, t: 16, b: 28 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const maxV = Math.max(0, ...series.map((s) => s.views));
  const { top, ticks } = useMemo(() => niceScale(maxV), [maxV]);
  const X = useCallback((i: number) => m.l + (n > 1 ? (i * iw) / (n - 1) : iw / 2), [m.l, iw, n]);
  const Y = useCallback((v: number) => m.t + ih - (v / top) * ih, [m.t, ih, top]);
  const pts = useMemo(() => series.map((s, i) => [X(i), Y(s.views)] as [number, number]), [series, X, Y]);
  const line = useMemo(() => smoothPath(pts), [pts]);
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${m.t + ih} L${pts[0][0]},${m.t + ih} Z` : '';
  const total = series.reduce((s, p) => s + p.views, 0);
  const peak = series.reduce((b, p) => (p.views > b.views ? p : b), series[0] ?? { date: '', views: 0 });
  // calendar gregory: التقويم الميلادي دائماً (الافتراضي في ar-SA هجري)
  const fmtDay = (d: string, long = false) => date(`${d}T12:00:00`, long ? { weekday: 'long', month: 'long', day: 'numeric', calendar: 'gregory' } : { month: 'short', day: 'numeric', calendar: 'gregory' });
  const xStep = w < 420 ? 10 : 5;

  const setFromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * w;
    setActive(Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent) => {
    const cur = active ?? n - 1;
    const next = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? cur + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? cur - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (next === null) { if (e.key === 'Escape') setActive(null); return; }
    e.preventDefault();
    setActive(Math.max(0, Math.min(n - 1, next)));
  };

  if (!n) return null;
  const a = active !== null ? series[active] : null;
  const summary = t(
    `مشاهدات آخر ${num(n)} يوماً: المجموع ${num(total)}، الذروة ${num(peak.views)} بتاريخ ${fmtDay(peak.date)}.`,
    `Views over the last ${num(n)} days: total ${num(total)}, peak ${num(peak.views)} on ${fmtDay(peak.date)}.`,
  );
  const tipLeft = a ? Math.min(Math.max(X(active!), 64), w - 64) : 0;

  return (
    // المحور الزمني يُرسم دائماً من اليسار لليمين (الأقدم → الأحدث) حتى في العربي، والنصوص بأرقام لاتينية
    <div ref={box} dir="ltr" className="relative w-full select-none">
      <svg
        width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block max-w-full touch-pan-y overflow-visible outline-none"
        role="slider" tabIndex={0} aria-label={summary} aria-orientation="horizontal"
        aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={active ?? n - 1}
        aria-valuetext={a ? `${fmtDay(a.date, true)}: ${num(a.views)} ${t('مشاهدة', 'views')}` : t('اضغط الأسهم لاستعراض الأيام', 'Use arrow keys to browse days')}
        onPointerMove={setFromPointer} onPointerDown={setFromPointer}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !focused) setActive(null); }}
        onFocus={() => { setFocused(true); setActive((x) => x ?? n - 1); }}
        onBlur={() => { setFocused(false); setActive(null); }}
        onKeyDown={onKey}
      >
        <defs>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`c${uid}`}>
            <motion.rect x={m.l - 4} y={0} height={h} initial={{ width: reduce ? iw + 20 : 0 }} animate={{ width: iw + 20 }} transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }} />
          </clipPath>
        </defs>

        {/* شبكة أفقية + قيم المحور Y */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={w - m.r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeDasharray={v === 0 ? undefined : '3 5'} />
            <text x={m.l - 8} y={Y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)" className="num">{num(v)}</text>
          </g>
        ))}
        {/* قيم المحور X كل ~5 أيام */}
        {series.map((s, i) => ((n - 1 - i) % xStep === 0 ? (
          <text key={s.date} x={X(i)} y={h - 6} textAnchor={X(i) > w - 28 ? 'end' : X(i) < m.l + 14 ? 'start' : 'middle'} fontSize="11" fill="var(--muted)">{fmtDay(s.date)}</text>
        ) : null))}

        <g clipPath={`url(#c${uid})`}>
          <path d={area} fill={`url(#g${uid})`} />
          <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {a && active !== null && (
          <g pointerEvents="none">
            <line x1={X(active)} x2={X(active)} y1={m.t} y2={m.t + ih} stroke="var(--ink)" strokeOpacity="0.35" strokeDasharray="4 4" />
            <circle cx={X(active)} cy={Y(a.views)} r="9" fill="var(--brand)" fillOpacity="0.22" />
            <circle cx={X(active)} cy={Y(a.views)} r="4.5" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {a && (
        <div className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-card" style={{ left: tipLeft }}>
          <p className="whitespace-nowrap text-muted">{fmtDay(a.date, true)}</p>
          <p className="mt-0.5 whitespace-nowrap font-bold"><span className="num text-base">{num(a.views)}</span> {t('مشاهدة', 'views')}</p>
        </div>
      )}

      {/* بديل نصي لقارئات الشاشة */}
      <div className="sr-only"><table>
        <caption>{summary}</caption>
        <thead><tr><th>{t('التاريخ', 'Date')}</th><th>{t('المشاهدات', 'Views')}</th></tr></thead>
        <tbody>{series.map((s) => <tr key={s.date}><td>{fmtDay(s.date, true)}</td><td>{num(s.views)}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

/** خط مصغّر داخل بطاقة المؤشر */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const W = 100, H = 32;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i * W) / Math.max(1, values.length - 1), H - 3 - (v / max) * (H - 8)] as [number, number]);
  const line = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#s${uid})`} />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}
