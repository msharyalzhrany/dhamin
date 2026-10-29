import { Link } from 'react-router-dom';
import { FaInstagram, FaLinkedin, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { Logo } from '@/components/Logo';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';

export function SiteFooter() {
  const { t } = usePrefs();
  const { user } = useAuth();
  const cols = [
    { h: t('العقارات', 'Properties'), l: [[t('للبيع', 'For sale'), '/properties?listingType=sale'], [t('للإيجار', 'For rent'), '/properties?listingType=rent'], [t('الاستثمار', 'Investing'), '/invest'], [t('المزادات', 'Auctions'), '/auctions']] },
    { h: t('ضامن', 'Dhamin'), l: [[t('كيف تعمل', 'How it works'), '/#how'], [t('الأسئلة الشائعة', 'FAQ'), '/#faq']] },
    { h: t('حسابك', 'Account'), l: user ? [[t('لوحتي', 'Dashboard'), '/app'], [t('عقاراتي', 'My properties'), '/app/properties'], [t('الرسائل', 'Messages'), '/app/messages'], [t('الدعم', 'Support'), '/app/support']] : [[t('دخول', 'Sign in'), '/login'], [t('إنشاء حساب', 'Sign up'), '/signup']] },
  ];
  return (
    <footer className="relative overflow-hidden border-t border-line bg-hero text-ink">
      <div className="relative mx-auto max-w-7xl px-5 pb-6 pt-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-5">
            <Logo markClass="size-11" />
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {t('منصة عقارية في جدة للأفراد: عقد موثّق، توقيع إلكتروني، وتأكيد للتحويل والاستلام في كل صفقة.', 'A Jeddah real-estate platform for individuals: a sealed contract, e-signature and confirmed transfer & receipt on every deal.')}
            </p>
            <div className="flex gap-3">
              {[FaXTwitter, FaInstagram, FaLinkedin, FaYoutube, FaWhatsapp].map((I, i) => (
                <a key={i} href="#" aria-label="social" className="grid size-10 place-items-center rounded-full border border-line text-muted transition hover:border-brand hover:text-brand"><I className="size-4" /></a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">{c.h}</h4>
              <ul className="space-y-3 text-sm">
                {c.l.map(([label, to]) => <li key={to}><Link to={to} className="text-muted transition hover:text-brand-text">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted">
          <span>© {new Date().getFullYear()} {t('ضامن. جميع الحقوق محفوظة.', 'Dhamin. All rights reserved.')}</span>
        </div>
      </div>
    </footer>
  );
}
