// صفحة الهوية البصرية: الشعار، الألوان، الخطوط، الأفاتار
import { Logo, LogoMark } from '@/components/Logo';
import { Avatar, AssistantAvatar } from '@/components/Avatar';
import { Reveal } from '@/components/Reveal';
import { SectionHead } from '@/components/ui/misc';
import { usePrefs } from '@/providers/prefs';

const colors = [
  { n: 'Brand Green', ar: 'الأخضر الأساسي', hex: '#39AB79', bg: 'bg-[#39AB79]', fg: 'text-[#041C16]' },
  { n: 'Deep Forest', ar: 'الأخضر الداكن', hex: '#041C16', bg: 'bg-[#041C16]', fg: 'text-white' },
  { n: 'White', ar: 'أبيض', hex: '#FFFFFF', bg: 'bg-white', fg: 'text-[#041C16]' },
  { n: 'Mist', ar: 'رمادي فاتح', hex: '#F3F5F5', bg: 'bg-[#F3F5F5]', fg: 'text-[#041C16]' },
  { n: 'Black', ar: 'أسود', hex: '#000000', bg: 'bg-black', fg: 'text-white' },
];

export default function Brand() {
  const { t } = usePrefs();
  return (
    <div className="px-5 pb-24 pt-32">
      <div className="mx-auto max-w-6xl space-y-20">
        <Reveal><SectionHead eyebrow={t('الهوية البصرية', 'Brand identity')} title={t('ضامن: درع على شكل بيت، وعلامة صح.', 'Dhamin: a house-shaped shield with a check.')} text={t('الدرع = الحماية، السقف المدبّب = العقار، وعلامة الصح = الصفقة المضمونة.', 'Shield = protection, pointed roof = property, check = a guaranteed deal.')} /></Reveal>

        <section aria-label="logo" className="grid gap-4 md:grid-cols-3">
          {[['bg-white text-[#041C16]', 'logo-light'], ['bg-[#041C16] text-white', 'logo-dark'], ['bg-[#F3F5F5] text-[#041C16]', 'logo-mist']].map(([c, id]) => (
            <div key={id} id={id} className={`grid h-56 place-items-center rounded-3xl border border-line ${c}`}><Logo markClass="size-14" className="text-3xl" /></div>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
          <div id="mark-only" className="grid h-44 place-items-center rounded-3xl bg-[#041C16]"><LogoMark className="size-20" /></div>
          <div id="mark-tile" className="grid h-44 place-items-center rounded-3xl bg-white"><LogoMark tile className="size-20" /></div>
          <div id="stacked" className="grid h-44 place-items-center rounded-3xl bg-[#F3F5F5] text-[#041C16]"><Logo stacked markClass="size-14" className="text-2xl" /></div>
          <div className="grid h-44 place-items-center rounded-3xl bg-[#39AB79] text-[#041C16]"><Logo markClass="size-12" className="text-2xl" /></div>
        </section>

        <section>
          <h3 className="mb-6 text-2xl font-bold">{t('الألوان', 'Colors')}</h3>
          <div className="grid gap-3 sm:grid-cols-5">
            {colors.map((c) => (
              <div key={c.hex} className={`${c.bg} ${c.fg} flex h-40 flex-col justify-end rounded-3xl border border-line p-4`}><p className="text-sm font-semibold">{t(c.ar, c.n)}</p><p className="num text-xs opacity-80">{c.hex}</p></div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-8">
            <h3 className="mb-4 text-2xl font-bold">{t('الخطوط', 'Typography')}</h3>
            <p className="font-arabic text-5xl font-bold">أبجد هوّز</p><p className="mt-1 text-sm text-muted">IBM Plex Sans Arabic</p>
            <p className="mt-6 font-['Inter_Variable'] text-5xl font-bold tracking-tight">Aa Bb 123</p><p className="mt-1 text-sm text-muted">Inter Variable</p>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-8">
            <h3 className="mb-6 text-2xl font-bold">{t('الأفاتار', 'Avatars')}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name="مشاري الزهراني" className="size-16 text-xl" /><Avatar name="Sara Ghamdi" className="size-16 text-xl" /><Avatar name="خالد" className="size-12" /><AssistantAvatar className="size-16" />
            </div>
            <p className="mt-4 text-sm text-muted">{t('أفاتار المستخدم: أول حرفين من اسمه. أفاتار المساعد: شعار ضامن.', 'User avatar: initials. Assistant avatar: the Dhamin mark.')}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
