// المساعد الذكي — زر عائم في كل الصفحات. يتصل بـ POST /api/assistant
// (Gemini إذا وُضع GEMINI_API_KEY في .env، وإلا إجابات جاهزة من server/lib/faq.js)
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Send, X } from 'lucide-react';
import { AssistantAvatar } from '@/components/Avatar';
import { usePrefs } from '@/providers/prefs';
import { api, errText } from '@/lib/api';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; text: string };

export function AssistantWidget() {
  const { t, lang } = usePrefs();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy, open]);

  const suggestions = [
    t('كيف أضيف عقاري؟', 'How do I list a property?'),
    t('ما خطوات الصفقة؟', 'What are the deal steps?'),
    t('كيف يعمل العقد والتوقيع؟', 'How do contract & e-signature work?'),
    t('كم عدد العقارات المسموح؟', 'How many listings can I have?'),
  ];

  async function send(m: string) {
    const msg = m.trim();
    if (!msg || busy) return;
    const history = msgs.slice(-8);
    setMsgs((x) => [...x, { role: 'user', text: msg }]);
    setText('');
    setBusy(true);
    try {
      const r = await api<{ reply: string }>('/assistant', { body: { message: msg, lang, page: loc.pathname, history } });
      setMsgs((x) => [...x, { role: 'assistant', text: r.reply }]);
    } catch (e) {
      setMsgs((x) => [...x, { role: 'assistant', text: errText(e, lang) }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section role="dialog" aria-label={t('مساعد ضامن', 'Dhamin assistant')}
            initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed bottom-24 end-4 z-[70] flex h-[min(34rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] sm:end-6">
            <header className="flex items-center gap-3 bg-deep p-4 text-white">
              <AssistantAvatar className="size-10" />
              <div className="flex-1"><p className="text-sm font-bold">{t('مساعد ضامن', 'Dhamin Assistant')}</p><p className="flex items-center gap-1.5 text-xs text-white/65"><span className="size-1.5 rounded-full bg-brand" />{t('متصل', 'Online')}</p></div>
              <button onClick={() => setOpen(false)} aria-label={t('إغلاق', 'Close')} className="grid size-9 place-items-center rounded-full hover:bg-white/10"><X className="size-5" /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="rounded-2xl rounded-ss-sm bg-surface-2 p-3 text-sm leading-relaxed">{t('أهلاً! أنا مساعد ضامن. اسألني عن التسجيل، إضافة العقار، خطوات الصفقة أو العقد.', "Hi! I'm Dhamin's assistant. Ask me about signing up, listing a property, deal steps or contracts.")}</div>
              {msgs.map((m, i) => (
                <div key={i} className={cn('max-w-[88%] whitespace-pre-wrap rounded-2xl p-3 text-sm leading-relaxed', m.role === 'user' ? 'ms-auto rounded-ee-sm bg-brand text-on-brand' : 'rounded-ss-sm bg-surface-2')}>{m.text}</div>
              ))}
              {busy && <div className="flex w-16 gap-1 rounded-2xl rounded-ss-sm bg-surface-2 p-3.5">{[0, 1, 2].map((i) => <motion.span key={i} className="size-2 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }} />)}</div>}
              {msgs.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-brand hover:bg-brand-soft">{s}</button>)}
                </div>
              )}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 border-t border-line p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={t('اكتب سؤالك...', 'Type your question...')} className="h-11 flex-1 rounded-full border border-line bg-bg px-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/20" />
              <button type="submit" disabled={!text.trim() || busy} aria-label={t('إرسال', 'Send')} className="grid size-11 place-items-center rounded-full bg-brand text-on-brand transition active:scale-95 disabled:opacity-50"><Send className="size-4 rtl:-scale-x-100" /></button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setOpen((o) => !o)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} aria-label={t('مساعد ضامن الذكي', 'Dhamin AI assistant')} aria-expanded={open}
        className="fixed bottom-5 end-4 z-[70] grid size-14 place-items-center rounded-full bg-deep shadow-[0_12px_32px_-6px_rgba(0,0,0,0.55)] ring-2 ring-brand sm:end-6" style={{ animation: open ? undefined : 'pulse-ring 2.2s infinite' }}>
        <AnimatePresence mode="wait" initial={false}>
          {open ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}><X className="size-6 text-white" /></motion.span>
            : <motion.span key="l" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}><AssistantAvatar className="size-14 bg-transparent ring-0" /></motion.span>}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
