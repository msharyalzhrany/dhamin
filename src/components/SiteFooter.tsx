import { Link } from 'react-router-dom';
import { FaInstagram, FaLinkedin, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { Logo } from '@/components/Logo';
import { usePrefs } from '@/providers/prefs';

export function SiteFooter() {
  const { t } = usePrefs();
  const cols = [
    { h: t('العقارات', 'Properties'), l: [[t('للبيع', 'For sale'), '/properties?listingType=sale'], [t('للإيجار', 'For rent'), '/properties?listingType=rent'], [t('الاستثمار', 'Investing'), '/invest'], [t('المزادات', 'Auctions'), '/auctions']] },
    { h: t('ضامن', 'Dhamin'), l: [[t('كيف تعمل', 'How it works'), '/#how'], [t('الأسئلة الشائعة', 'FAQ'), '/#faq']] },
    { h: t('حسابك', 'Account'), l: [[t('دخول', 'Sign in'), '/login'], [t('إنشاء حساب', 'Sign up'), '/signup'], [t('لوحتي', 'Dashboard'), '/app']] },
  ];
  return (
    <footer className="relative overflow-hidden bg-deep text-white">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-5 pb-6 pt-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-5">
            <Logo className="text-white" markClass="size-11" />
            <p className="max-w-xs text-sm leading-relaxed text-white/65">
              {t('منصة عقارية في جدة للأفراد: عقد موثّق، توقيع إلكتروني، وتأكيد للتحويل والاستلام في كل صفقة.', 'A Jeddah real-estate platform for individuals: a sealed contract, e-signature and confirmed transfer & receipt on every deal.')}
            </p>
            <div className="flex gap-3">
              {[FaXTwitter, FaInstagram, FaLinkedin, FaYoutube, FaWhatsapp].map((I, i) => (
                <a key={i} href="#" aria-label="social" className="grid size-10 place-items-center rounded-full border border-white/15 text-white/75 transition hover:border-brand hover:text-brand"><I className="size-4" /></a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand">{c.h}</h4>
              <ul className="space-y-3 text-sm">
                {c.l.map(([label, to]) => <li key={to}><Link to={to} className="text-white/70 transition hover:text-white">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50">
          <span>© {new Date().getFullYear()} {t('ضامن. جميع الحقوق محفوظة.', 'Dhamin. All rights reserved.')}</span>
        </div>
      </div>
    </footer>
  );
}
