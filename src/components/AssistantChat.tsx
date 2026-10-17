import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import sundusAssistantImage from '../assets/sundus-water.webp';
import { sendAssistantMessage, type AssistantSource } from '../lib/assistantApi';
import type { LocalSyncIdentity } from '../lib/neonSync';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; sources?: AssistantSource[] };

type Props = { apiBaseUrl: string | null; identity: LocalSyncIdentity | null };

const openingNames = ['آنسة سندس', 'العبقرية سندس', 'الدكتورة سندس', 'العالمة سندس', 'المثقفة سندس'];
const openingPattern = new RegExp(`^(?:${openingNames.map((name) => name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('|')})\\b`, 'u');

function makeOpening(text: string): string {
  const clean = text.trim();
  if (!clean || openingPattern.test(clean)) return clean;
  return `${openingNames[Math.floor(Math.random() * openingNames.length)]}: ${clean}`;
}

export default function AssistantChat({ apiBaseUrl, identity }: Props) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: 'آنسة سندس: أهلاً بكِ! اسأليني عن خطتك الصحية أو أي معلومة أضفناها إلى مكتبتي.' },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!apiBaseUrl || !identity) {
      setError('المساعد يحتاج إلى تفعيل عنوان خادم Neon أولاً.');
      return;
    }
    setDraft('');
    setError('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: text }]);
    setSending(true);
    try {
      const result = await sendAssistantMessage(apiBaseUrl, identity, text, conversationId);
      setConversationId(result.conversationId);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: makeOpening(result.reply), sources: result.sources }]);
    } catch {
      setError('تعذر الوصول إلى المساعد الآن. جرّبي مرة أخرى بعد قليل.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-label="مساعد الآنسة سندس الذكي">
        <header className="assistant-header">
          <img src={sundusAssistantImage} alt="سندس" />
          <div><span>مساعد الآنسة سندس الذكي</span><small><Sparkles size={12} /> معرفة من Neon وذكاء متصل</small></div>
          <button type="button" className="assistant-close" onClick={() => setOpen(false)} aria-label="إغلاق المساعد"><X size={18} /></button>
        </header>
        <div className="assistant-messages" aria-live="polite">
          {messages.map((message) => <div className={`assistant-message assistant-message-${message.role}`} key={message.id}>
            {message.role === 'assistant' && <img src={sundusAssistantImage} alt="" />}
            <div><p>{message.content}</p>{message.sources && message.sources.length > 0 && <small className="assistant-sources">المصدر: {message.sources.map((source) => source.title).join('، ')}</small>}</div>
          </div>)}
          {sending && <div className="assistant-typing"><Bot size={15} /> آنسة سندس تكتب الآن...</div>}
          <div ref={endRef} />
        </div>
        {error && <p className="assistant-error" role="alert">{error}</p>}
        <form className="assistant-form" onSubmit={submit}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="اكتبي سؤالك هنا..." maxLength={4000} aria-label="رسالة للمساعد" />
          <button type="submit" aria-label="إرسال الرسالة" disabled={sending || !draft.trim()}><Send size={17} /></button>
        </form>
      </section>}
      <button type="button" className="assistant-fab" onClick={() => setOpen((current) => !current)} aria-label="فتح مساعد الآنسة سندس الذكي" aria-expanded={open}>
        <span className="assistant-fab-image"><img src={sundusAssistantImage} alt="" /></span><span>مساعد الآنسة سندس الذكي</span><Sparkles size={17} />
      </button>
    </>
  );
}
