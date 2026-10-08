import { LinkButton } from '@/components/ui/button';
import { LogoMark } from '@/components/Logo';
import { usePrefs } from '@/providers/prefs';

export default function NotFound() {
  const { t } = usePrefs();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-5 px-6 pt-28 text-center">
      <LogoMark className="size-16" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted">{t('هذه الصفحة غير موجودة. ربما تغيّر الرابط.', 'This page does not exist. The link may have changed.')}</p>
      <LinkButton to="/" variant="primary">{t('العودة للرئيسية', 'Back home')}</LinkButton>
    </div>
  );
}
