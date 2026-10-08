// لوحة التحكم /app — مؤشرات، منحنى المشاهدات، المهام، مسار الصفقات، العملاء، التقويم
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Eye, Handshake, Heart, Home, MessageSquare, Plus, Search, ShieldCheck, Trophy } from 'lucide-react';
import { LinkButton, Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { AreaChart } from '@/components/dashboard/charts';
import { ActionsList, BigNum, CalendarCard, DealsPipeline, KpiCard, LeadsTable, MiniMeter, TopPropertyCard, ViewsKpi, card, type DashboardData } from '@/components/dashboard/widgets';
import { usePrefs } from '@/providers/prefs';
import { useAuth } from '@/providers/auth';
import { useApi } from '@/lib/useApi';
import { errText } from '@/lib/api';
import { cn } from '@/lib/utils';

function DashSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0"><Skeleton className="h-96 rounded-3xl lg:col-span-2" /><Skeleton className="h-96 rounded-3xl" /></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0"><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-80 rounded-3xl lg:col-span-2" /></div>
    </div>
  );
}

export default function Dashboard() {
  const { t, lang, num, date } = usePrefs();
  const { me } = useAuth();
  const { data, error, loading, reload } = useApi<DashboardData>('/dashboard');
  const k = data?.kpis;
  const series = data?.viewsSeries.map((s) => s.views) ?? [];
  const missing = me && (!me.user.phone || !me.profile.nationalAddress);
  const lim = me?.limits;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* الترحيب + إجراءان سريعان */}
      <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text rtl:tracking-normal">{date(new Date(), { weekday: 'long', day: 'numeric', month: 'long', calendar: 'gregory' })}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{me ? t(me.welcome.ar, me.welcome.en) : t('مرحباً', 'Welcome')}</h1>
          <p className="mt-2 text-muted">{t('هذه نظرة سريعة على أداء عقاراتك وصفقاتك.', 'A quick look at how your listings and deals are doing.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to="/app/properties/new"><Plus className="size-4" />{t('إضافة عقار', 'Add property')}</LinkButton>
          <LinkButton to="/properties" variant="outline"><Search className="size-4" />{t('تصفّح العقارات', 'Browse')}</LinkButton>
        </div>
      </motion.header>

      {missing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 rounded-3xl border border-brand/40 bg-brand-soft p-4 sm:flex-row sm:items-center sm:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-on-brand"><ShieldCheck className="size-5" /></span>
          <div className="flex-1">
            <p className="font-bold">{t('أكمل ملفك الشخصي لتوثيق حسابك', 'Complete your profile to get verified')}</p>
            <p className="text-sm text-muted">
              {t('ينقصك: ', 'Missing: ')}
              {[!me.user.phone && t('رقم الجوال', 'phone number'), !me.profile.nationalAddress && t('العنوان الوطني', 'national address')].filter(Boolean).join(t('، ', ', '))}
              {t('. الحسابات الموثّقة تكسب ثقة أكبر في الصفقات.', '. Verified accounts earn more trust in deals.')}
            </p>
          </div>
          <LinkButton to="/app/profile" variant="dark" size="sm">{t('إكمال الملف', 'Complete profile')}<ArrowRight className="size-4 rtl:rotate-180" /></LinkButton>
        </motion.div>
      )}

      {loading && !data && <DashSkeleton />}
      {error != null && !data && (
        <div className={cn(card, 'flex flex-col items-center gap-3 p-10 text-center')} role="alert">
          <AlertCircle className="size-8 text-ink" />
          <p className="font-semibold">{errText(error, lang)}</p>
          <Button variant="outline" onClick={reload}>{t('إعادة المحاولة', 'Try again')}</Button>
        </div>
      )}

      {data && k && (
        <>
          {/* المؤشرات */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
            <KpiCard delay={0} to="/app/properties" icon={<Home className="size-5" />} label={t('إعلانات نشطة', 'Active listings')}>
              <BigNum to={k.activeListings} suffix={<span className="num">/ {num(lim?.activeListings ?? 5)}</span>} />
              <MiniMeter value={k.activeListings} max={lim?.activeListings ?? 5} />
            </KpiCard>
            <KpiCard delay={0.05} icon={<Eye className="size-5" />} label={t('مشاهدات (30 يوماً)', 'Views (30 days)')}>
              <ViewsKpi series={series} total={k.views30d} />
            </KpiCard>
            <KpiCard delay={0.1} to="/app/favorites" icon={<Heart className="size-5" />} label={t('إعجابات مستلمة', 'Favorites received')}>
              <BigNum to={k.favoritesReceived} />
              <p className="mt-2 text-xs text-muted">{t('أضافوا عقاراتك لمفضلتهم', 'saved your listings')}</p>
            </KpiCard>
            <KpiCard delay={0.15} to="/app/deals" icon={<Handshake className="size-5" />} label={t('صفقات نشطة', 'Active deals')}>
              <BigNum to={k.activeDeals} suffix={<span className="num">/ {num(lim?.activeDeals ?? 3)}</span>} />
              <MiniMeter value={k.activeDeals} max={lim?.activeDeals ?? 3} />
            </KpiCard>
            <KpiCard delay={0.2} to="/app/deals" icon={<Trophy className="size-5" />} label={t('صفقات مكتملة', 'Completed deals')}>
              <BigNum to={k.completedDeals} />
              <p className="mt-2 text-xs text-muted">{k.ratingCount ? <>{t('التقييم', 'Rating')} <span className="num font-semibold text-ink">{(k.ratingAvg ?? 0).toFixed(1)}</span> ({num(k.ratingCount)})</> : t('لا تقييمات بعد', 'No reviews yet')}</p>
            </KpiCard>
            <KpiCard delay={0.25} to="/app/messages" icon={<MessageSquare className="size-5" />} label={t('رسائل غير مقروءة', 'Unread messages')}>
              <BigNum to={k.unreadMessages} />
              <p className="mt-2 text-xs text-muted">{k.unreadMessages ? t('بانتظار ردّك', 'waiting for your reply') : t('لا جديد', 'all read')}</p>
            </KpiCard>
          </div>

          {/* الأداء + أفضل عقار */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className={cn(card, 'p-5 sm:p-6 lg:col-span-2')} aria-labelledby="perf-h">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="perf-h" className="text-lg font-bold">{t('أداء إعلاناتك', 'Listing performance')}</h2>
                  <p className="text-sm text-muted">{t('المشاهدات اليومية لآخر 30 يوماً', 'Daily views over the last 30 days')}</p>
                </div>
                <p className="text-end"><span className="num text-2xl font-bold">{num(k.views30d)}</span> <span className="text-sm text-muted">{t('مشاهدة', 'views')}</span></p>
              </div>
              <AreaChart series={data.viewsSeries} />
            </motion.section>
            <div className="flex flex-col gap-6">
              {data.topProperty ? <TopPropertyCard p={data.topProperty} /> : (
                <section className={cn(card, 'flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center')}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-text"><Home className="size-6" /></span>
                  <p className="font-bold">{t('لا يوجد عقار بارز بعد', 'No top listing yet')}</p>
                  <p className="text-sm text-muted">{t('أضف أول عقار لتتابع أداءه هنا.', 'Add your first property to track its performance here.')}</p>
                  <LinkButton to="/app/properties/new" size="sm"><Plus className="size-4" />{t('إضافة عقار', 'Add property')}</LinkButton>
                </section>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
            <ActionsList items={data.actions} />
            <div className="lg:col-span-2"><DealsPipeline by={data.dealsByStatus} recent={data.recentDeals} /></div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
            <div className="lg:col-span-2"><LeadsTable items={data.leads} /></div>
            <CalendarCard deals={data.recentDeals} />
          </div>
        </>
      )}
    </div>
  );
}
