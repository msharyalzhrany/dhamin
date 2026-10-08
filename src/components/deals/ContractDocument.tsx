// المستند الرسمي للعقد: يُعرض كورقة بيضاء (مثل المستند المطبوع) بغض النظر عن الثيم
// الختم يظهر كاملاً فقط عند اكتمال التوقيعين (status === 'signed')
import { motion } from 'motion/react';
import { useState } from 'react';
import { Check, Copy, Printer } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useMeta, nameOf } from '@/providers/meta';
import { usePrefs } from '@/providers/prefs';
import { ACADEMIC_NOTE, TEMPLATE, clausesFor } from './contractText';
import type { Contract, SnapParty } from './types';

const SIG_FONT = "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', 'Lucida Handwriting', cursive";

// أنماط الطباعة: نُخفي كل شيء ما عدا المستند (نستخدم display:none لتجنب صفحات فارغة)
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body :not(.print-area):not(:has(.print-area)):not(.print-area *) { display: none !important; }
  body :has(.print-area) { padding: 0 !important; margin: 0 !important; display: block !important; max-width: none !important; width: auto !important; transform: none !important; position: static !important; height: auto !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; background: transparent !important; }
  .print-area { position: static !important; margin: 0 !important; max-width: none !important; width: 100% !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; color: #000 !important; background: #fff !important; }
  .print-area, .print-area * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-area .avoid-break { break-inside: avoid; }
  .no-print { display: none !important; }
}`;

export function PrintButton({ className }: { className?: string }) {
  const { t } = usePrefs();
  return <Button variant="outline" onClick={() => window.print()} className={className}><Printer className="size-4" />{t('طباعة / حفظ PDF', 'Print / Save as PDF')}</Button>;
}

/** الختم الرسمي: حلقتان + شعار الدرع + نص منحنٍ + رقم العقد + بصمة */
export function Seal({ contract, className }: { contract: Contract; className?: string }) {
  const { t } = usePrefs();
  const signed = contract.status === 'signed';
  const cancelled = contract.status === 'cancelled';
  const hash = contract.sealHash.slice(0, 12).toUpperCase();

  if (!signed) {
    return (
      <svg viewBox="0 0 200 200" className={className} role="img" aria-label={cancelled ? t('عقد ملغى', 'Cancelled contract') : t('الختم بانتظار التوقيعات', 'Seal pending signatures')}>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#041C16" strokeOpacity=".4" strokeWidth="2" strokeDasharray="6 6" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="#041C16" strokeOpacity=".25" strokeWidth="1" strokeDasharray="3 5" />
        {cancelled ? (
          <g transform="rotate(-14 100 100)">
            <rect x="34" y="78" width="132" height="44" rx="6" fill="none" stroke="#041C16" strokeWidth="3" />
            <text x="100" y="108" textAnchor="middle" fontSize="22" fontWeight="800" fill="#041C16" letterSpacing="2">{t('ملغى', 'CANCELLED')}</text>
          </g>
        ) : (
          <>
            <text x="100" y="94" textAnchor="middle" fontSize="12" fontWeight="700" fill="#041C16" fillOpacity=".7">{t('الختم الرسمي', 'OFFICIAL SEAL')}</text>
            <text x="100" y="112" textAnchor="middle" fontSize="10" fill="#041C16" fillOpacity=".6">{t('بانتظار التوقيعات', 'Pending signatures')}</text>
          </>
        )}
      </svg>
    );
  }
  return (
    <motion.svg viewBox="0 0 200 200" className={className} role="img" aria-label={t('ختم ضامن الرسمي — العقد مختوم', 'Official Dhamin seal — contract sealed')}
      initial={{ scale: 1.7, opacity: 0, rotate: -22 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ type: 'spring', damping: 11, stiffness: 120, delay: 0.25 }}>
      <defs>
        <path id={`top-${contract.id}`} d="M 25,100 A 75,75 0 0 1 175,100" />
        <path id={`bot-${contract.id}`} d="M 17,100 A 83,83 0 0 0 183,100" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="none" stroke="#39AB79" strokeWidth="4" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="#041C16" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#39AB79" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="57" fill="#39AB79" fillOpacity=".07" />
      <text fontSize="14" fontWeight="800" fill="#041C16" letterSpacing="1.5">
        <textPath href={`#top-${contract.id}`} startOffset="50%" textAnchor="middle">ضامن • DHAMIN • موثّق</textPath>
      </text>
      <text fontSize="11" fontWeight="700" fill="#041C16" letterSpacing="1.5" className="num">
        <textPath href={`#bot-${contract.id}`} startOffset="50%" textAnchor="middle">{contract.number}</textPath>
      </text>
      <circle cx="26" cy="108" r="2.6" fill="#39AB79" /><circle cx="174" cy="108" r="2.6" fill="#39AB79" />
      {/* شعار الدرع */}
      <g transform="translate(76 54) scale(0.95)">
        <path d="M24 7 L38.5 17 V29 C38.5 35.2 32 39.6 24 42 C16 39.6 9.5 35.2 9.5 29 V17 Z" fill="#39AB79" />
        <path d="M16.8 25.2 L22 30.4 L31.4 19.8" fill="none" stroke="#041C16" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="100" y="116" textAnchor="middle" fontSize="10" fontWeight="800" fill="#041C16" letterSpacing="1.2">{t('مختوم · SEALED', 'SEALED · مختوم')}</text>
      <text x="100" y="130" textAnchor="middle" fontSize="8.5" fill="#041C16" fillOpacity=".8" fontFamily="ui-monospace, Menlo, monospace" letterSpacing=".5">{hash}</text>
    </motion.svg>
  );
}

function CopyHash({ hash }: { hash: string }) {
  const { t } = usePrefs();
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(hash); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* المتصفح منع النسخ */ }
  };
  return (
    <button type="button" onClick={copy} className="no-print inline-flex min-h-11 items-center gap-1.5 rounded-full border border-deep/25 px-4 text-xs font-semibold text-deep hover:bg-deep/5">
      {ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{ok ? t('تم النسخ', 'Copied') : t('نسخ بصمة الختم', 'Copy seal hash')}
    </button>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/10 py-1.5 last:border-0">
      <dt className="shrink-0 text-xs text-deep/60">{k}</dt>
      <dd className="min-w-0 break-words text-end text-sm font-medium">{v}</dd>
    </div>
  );
}

export function ContractDocument({ contract, showPrint = true }: { contract: Contract; showPrint?: boolean }) {
  const { t, lang, date, money, num } = usePrefs();
  const meta = useMeta();
  const s = contract.snapshot;
  const tpl = TEMPLATE[s.templateType];
  const clauses = clausesFor(s.templateType)[lang];
  const dash = '—';
  const v = (x: string | null | undefined) => (x && x.trim() ? x : dash);

  const Party = ({ title, p }: { title: string; p: SnapParty }) => (
    <div className="avoid-break rounded-xl border border-black/15 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-deep/70">{title}</p>
      <dl>
        <Row k={t('الاسم', 'Name')} v={p.name} />
        <Row k={t('البريد', 'Email')} v={<span dir="ltr" className="break-all">{v(p.email)}</span>} />
        <Row k={t('الجوال', 'Phone')} v={p.phone ? <span dir="ltr" className="num">{p.phone}</span> : dash} />
        <Row k={t('العنوان الوطني', 'National address')} v={<span dir="ltr" className="num">{v(p.nationalAddress)}</span>} />
      </dl>
    </div>
  );

  const sigOf = (role: 'owner' | 'counterparty') => contract.signatures.find((x) => x.role === role);
  const SigBox = ({ role, title, name }: { role: 'owner' | 'counterparty'; title: string; name: string }) => {
    const sg = sigOf(role);
    return (
      <div className="avoid-break rounded-xl border border-black/15 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-deep/70">{title}</p>
        <p className="mt-0.5 text-sm font-medium">{name}</p>
        <div className="mt-3 flex min-h-16 items-end border-b-2 border-deep/70 pb-1">
          {sg ? <span className="break-words text-3xl leading-tight" style={{ fontFamily: SIG_FONT, fontStyle: 'italic' }} dir="auto">{sg.signedName}</span>
            : <span className="text-sm italic text-deep/50">{t('بانتظار التوقيع', 'Awaiting signature')}</span>}
        </div>
        <p className="num mt-1.5 text-xs text-deep/60">{sg ? date(sg.signedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', calendar: 'gregory' }) : dash}</p>
      </div>
    );
  };

  const periodLabel = s.rentPeriod ? nameOf(meta.rentPeriods, s.rentPeriod, lang) : null;
  const months = s.templateType === 'invest' ? s.investment?.durationMonths ?? s.durationMonths : s.durationMonths;

  return (
    <div>
      <style>{PRINT_CSS}</style>
      {showPrint && <div className="no-print mb-4 flex justify-end"><PrintButton /></div>}
      <article className="print-area mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-5 text-deep shadow-card sm:p-10" aria-label={tpl.title[lang]}>
        {/* الترويسة */}
        <header className="border-b-2 border-deep pb-5 text-center">
          <div className="mb-3 flex items-center justify-center gap-2.5">
            <LogoMark className="size-9" />
            <span className="flex items-baseline gap-2"><span className="font-arabic text-xl font-bold" lang="ar">ضامن</span><span className="text-xs font-semibold uppercase tracking-[0.3em] text-deep/60">Dhamin</span></span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{tpl.title[lang]}</h2>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-deep/70">
            <span>{t('رقم العقد', 'Contract no.')} <span className="num font-bold text-deep">{contract.number}</span></span>
            <span>{t('تاريخ الإنشاء', 'Issued')} <span className="num font-bold text-deep">{date(s.createdAt, { year: 'numeric', month: 'long', day: 'numeric', calendar: 'gregory' })}</span></span>
          </div>
          <p className="mt-1 text-xs text-deep/60">{t('مدينة جدة، المملكة العربية السعودية', 'Jeddah, Kingdom of Saudi Arabia')}</p>
        </header>

        <Section n={t('أولاً', '1')} title={t('أطراف العقد', 'Parties')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Party title={`${t('الطرف الأول', 'First party')} — ${tpl.a[lang]}`} p={s.owner} />
            <Party title={`${t('الطرف الثاني', 'Second party')} — ${tpl.b[lang]}`} p={s.counterparty} />
          </div>
        </Section>

        <Section n={t('ثانياً', '2')} title={t('وصف العقار', 'Property')}>
          <div className="avoid-break rounded-xl border border-black/15 p-4"><dl className="grid gap-x-8 sm:grid-cols-2">
            <Row k={t('العنوان', 'Title')} v={s.property.title} />
            <Row k={t('النوع', 'Type')} v={nameOf(meta.propertyTypes, s.property.propertyType, lang)} />
            <Row k={t('الاستخدام', 'Usage')} v={nameOf(meta.usages, s.property.usage, lang)} />
            <Row k={t('الحي', 'District')} v={`${nameOf(meta.districts, s.property.district, lang)}${t('، جدة', ', Jeddah')}`} />
            <Row k={t('المساحة', 'Area')} v={s.property.areaSqm ? <span className="num">{num(s.property.areaSqm)} {t('م²', 'm²')}</span> : dash} />
            <Row k={t('وصف الموقع', 'Address note')} v={v(s.property.addressNote)} />
          </dl></div>
        </Section>

        <Section n={t('ثالثاً', '3')} title={t('الشروط المالية', 'Financial terms')}>
          <div className="avoid-break rounded-xl border border-black/15 bg-deep/[0.03] p-4"><dl className="grid gap-x-8 sm:grid-cols-2">
            <Row k={s.templateType === 'sale' ? t('ثمن البيع', 'Sale price') : s.templateType === 'rent' ? t('قيمة الإيجار', 'Rent amount') : t('مبلغ الاستثمار', 'Investment amount')}
              v={<span className="num text-base font-bold">{money(s.price)}</span>} />
            {s.templateType === 'rent' && <Row k={t('دورة الأجرة', 'Rent period')} v={periodLabel ?? dash} />}
            {s.templateType !== 'sale' && <Row k={s.templateType === 'rent' ? t('مدة الإيجار', 'Lease term') : t('مدة الاستثمار', 'Investment term')} v={months ? <span className="num">{t(`${num(months)} شهراً`, `${num(months)} months`)}</span> : dash} />}
            {s.templateType === 'invest' && <Row k={t('العائد المتوقع (تقديري)', 'Expected return (estimate)')} v={s.investment ? <span className="num">{num(s.investment.expectedReturnPct)}%</span> : dash} />}
            <Row k={t('طريقة السداد', 'Payment method')} v={t('تحويل بنكي مباشر خارج المنصة', 'Direct bank transfer outside the platform')} />
          </dl></div>
        </Section>

        <Section n={t('رابعاً', '4')} title={t('البنود والأحكام', 'Terms and conditions')}>
          <ol className="space-y-3">
            {clauses.map((c, i) => (
              <li key={i} className="avoid-break flex gap-3">
                <span className="num mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-deep/40 text-xs font-bold">{num(i + 1)}</span>
                <p className="min-w-0 text-sm leading-7"><strong>{c.title}: </strong>{c.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section n={t('خامساً', '5')} title={t('التوقيعات والختم', 'Signatures and seal')}>
          <div className="grid items-start gap-3 sm:grid-cols-[1fr_1fr]">
            <SigBox role="owner" title={`${tpl.a[lang]}`} name={s.owner.name} />
            <SigBox role="counterparty" title={`${tpl.b[lang]}`} name={s.counterparty.name} />
          </div>
          <div className="avoid-break mt-5 flex flex-col items-center gap-2">
            <Seal contract={contract} className="size-40 sm:size-44" />
            {contract.signedAt && <p className="num text-xs text-deep/60">{t('تاريخ الختم', 'Sealed on')} {date(contract.signedAt, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', calendar: 'gregory' })}</p>}
            <p className="num max-w-full break-all text-center text-[0.65rem] text-deep/60" dir="ltr">SHA-256 {contract.sealHash}</p>
            <CopyHash hash={contract.sealHash} />
            <p className="max-w-md text-center text-xs leading-relaxed text-deep/60">{t('بصمة الختم (SHA-256) تُحسب من بيانات العقد وقت إنشائه؛ لو تغيّر أي حرف في العقد لاختلفت البصمة، فهي دليل على أن النص لم يُعدَّل.', 'The seal hash (SHA-256) is computed from the contract data when it was created. Changing any character would change the hash, so it proves the text has not been altered.')}</p>
          </div>
        </Section>

        <footer className="mt-6 border-t border-black/15 pt-4 text-center text-xs leading-relaxed text-deep/60">{ACADEMIC_NOTE[lang]}</footer>
      </article>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold"><span className="text-deep/50">{n}</span><span>{title}</span><span className="h-px flex-1 bg-black/15" /></h3>
      {children}
    </section>
  );
}
