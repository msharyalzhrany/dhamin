// الرسائل: قائمة المحادثات + لوحة الدردشة. على الجوال تظهر واحدة منهما فقط.
import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { PropertyImage } from '@/components/PropertyImage';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { ChatPane } from '@/components/deals/ChatPane';
import { StatusChip } from '@/components/deals/shared';
import { errText } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePrefs } from '@/providers/prefs';
import { cn } from '@/lib/utils';
import type { ConversationItem } from '@/lib/types';

export default function Messages() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, lang, ago } = usePrefs();
  const { data, error, loading, reload } = useApi<{ items: ConversationItem[] }>('/conversations', { poll: 10000 });
  const [q, setQ] = useState('');
  const items = (data?.items ?? []).filter((c) => !q.trim() || (c.property.title + c.other.name).toLowerCase().includes(q.trim().toLowerCase()));
  const onActivity = useCallback(() => { reload(); }, [reload]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 hidden sm:block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">{t('التواصل', 'Inbox')}</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{t('الرسائل', 'Messages')}</h1>
      </div>
      <div className="flex h-[calc(100dvh-12rem)] min-h-[26rem] sm:h-[calc(100dvh-16rem)] overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        {/* قائمة المحادثات */}
        <aside className={cn('flex w-full min-w-0 flex-col border-line lg:w-80 lg:shrink-0 lg:border-e xl:w-96', id ? 'hidden lg:flex' : 'flex')}>
          <div className="border-b border-line p-3">
            <h2 className="mb-2 px-1 text-lg font-bold sm:hidden">{t('الرسائل', 'Messages')}</h2>
            <label className="relative block">
              <span className="sr-only">{t('بحث في المحادثات', 'Search conversations')}</span>
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث بالعقار أو الاسم', 'Search by property or name')}
                className="h-11 w-full rounded-full border border-line bg-surface-2 ps-10 pe-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/20" />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && <div className="space-y-3 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
            {!!error && !data && <div className="p-6 text-center"><p className="mb-3 text-sm">{errText(error, lang)}</p><Button variant="outline" size="sm" onClick={() => reload()}>{t('إعادة المحاولة', 'Retry')}</Button></div>}
            {data && !items.length && (
              <div className="p-4">
                <EmptyState icon={<MessageSquare className="size-6" />} title={q ? t('لا نتائج', 'No results') : t('لا محادثات بعد', 'No conversations yet')}
                  text={q ? undefined : t('ابدأ محادثة من صفحة أي عقار بالضغط على "تواصل مع المالك".', 'Open any property and press "Contact owner" to start chatting.')}
                  action={!q && <Link to="/properties" className="text-sm font-semibold text-brand-text underline underline-offset-4">{t('تصفّح العقارات', 'Browse properties')}</Link>} />
              </div>
            )}
            <ul>
              {items.map((c) => {
                const active = c.id === id;
                return (
                  <li key={c.id}>
                    <Link to={`/app/messages/${c.id}`} aria-current={active ? 'page' : undefined}
                      className={cn('flex gap-3 border-b border-line/60 px-3 py-3.5 transition-colors hover:bg-surface-2', active && 'bg-brand-soft hover:bg-brand-soft')}>
                      <div className="relative shrink-0">
                        <div className="size-14 overflow-hidden rounded-2xl"><PropertyImage src={c.property.cover} alt="" /></div>
                        <Avatar name={c.other.name} src={c.other.avatarUrl} className="absolute -bottom-1 -end-1 size-7 text-[0.6rem] ring-2 ring-surface" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cn('truncate text-sm', c.unread ? 'font-bold' : 'font-semibold')}>{c.other.name}</p>
                          {c.lastMessage && <span className="shrink-0 text-[0.7rem] text-muted">{ago(c.lastMessage.createdAt)}</span>}
                        </div>
                        <p className="truncate text-xs text-muted">{c.property.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className={cn('min-w-0 flex-1 truncate text-xs', c.lastMessage?.kind === 'system' && 'italic', c.unread ? 'font-semibold text-ink' : 'text-muted')}>
                            {c.lastMessage?.body ?? t('لا رسائل بعد', 'No messages yet')}
                          </p>
                          {c.unread > 0 && <span className="num grid min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 py-0.5 text-[0.7rem] font-bold text-on-brand" aria-label={t(`${c.unread} غير مقروءة`, `${c.unread} unread`)}>{c.unread}</span>}
                        </div>
                        {c.deal && <div className="mt-1.5"><StatusChip status={c.deal.status} className="!px-2 !py-0.5 !text-[0.65rem]" /></div>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* لوحة الدردشة */}
        <section className={cn('min-w-0 flex-1 flex-col', id ? 'flex' : 'hidden lg:flex')}>
          {id ? <ChatPane key={id} id={id} onBack={() => nav('/app/messages')} onActivity={onActivity} /> : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div className="max-w-xs">
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-brand-soft text-brand-text"><MessageSquare className="size-8" /></div>
                <h2 className="text-xl font-bold">{t('اختر محادثة', 'Select a conversation')}</h2>
                <p className="mt-2 text-sm text-muted">{t('تواصل مع الملّاك داخل المنصة، ثم حوّل الاتفاق إلى صفقة موثّقة بضغطة زر.', 'Talk to owners on the platform, then turn your agreement into a documented deal.')}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
