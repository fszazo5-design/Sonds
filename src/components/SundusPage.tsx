import { FormEvent, useState } from 'react';
import { Heart, MessageCircle, Send, Sparkles, Sun, UserRound } from 'lucide-react';
import sundusImage from '../assets/sundus-water.webp';
import { sendAssistantMessage } from '../lib/assistantApi';
import type { LocalSyncIdentity } from '../lib/neonSync';

type Props = { active: boolean; apiBaseUrl: string | null; identity: LocalSyncIdentity | null };
type Card = { title: string; message: string; prompt: string };
type Message = { role: 'user' | 'assistant'; text: string };

const cards: Card[] = [
  { title: 'نور صغير وسط الزحام', message: 'مش لازم اليوم يكون مثالي عشان يكون فيه حاجة حلوة. خدي نفسًا هادئًا ولاحظي شيئًا واحدًا ساعدك أو فرّحك، حتى لو كان بسيطًا جدًا.', prompt: 'إيه الحاجة الصغيرة اللي تستحقي تشكري نفسك عليها النهارده؟' },
  { title: 'قوة الهدوء', message: 'أحيانًا أقوى خطوة هي إنك تهدي وتدي لنفسك فرصة تفهمي شعورك بدل ما تحكمي عليه. مشاعرك رسائل، وليست أحكامًا عليكِ.', prompt: 'اكتبي كلمة واحدة تصف إحساسك الآن.' },
  { title: 'خطوة واحدة تكفي', message: 'لو كل شيء باين كبير، اختاري خطوة صغيرة فقط. التقدم الهادئ ما زال تقدمًا، ومشوارك لا يحتاج أن يشبه مشوار أي شخص آخر.', prompt: 'ما أصغر خطوة لطيفة تقدري تعمليها خلال عشر دقائق؟' },
  { title: 'أنتِ تتعلمين', message: 'الغلط لا يلغي شطارتك، واليوم الصعب لا يلغي الأيام التي حاولتِ فيها. كل تجربة تضيف لكِ فهمًا جديدًا لنفسك.', prompt: 'ما الشيء الذي تعلمتِه عن نفسك مؤخرًا؟' },
  { title: 'امتنان بلا ضغط', message: 'مش مطلوب منكِ تكوني مبسوطة طوال الوقت. يكفي أن تتركي مساحة صغيرة لشيء مريح: كوب ماء، كلمة حلوة، أو لحظة أمان.', prompt: 'اختاري شيئًا واحدًا مريحًا وامنحيه انتباهك دقيقة.' },
  { title: 'قلبك يستحق الرفق', message: 'كلمي نفسك بالطريقة التي تكلمين بها صديقتك المفضلة. أنتِ إنسانة بتكبر وبتتعلم، وتستحقي الصبر أثناء الطريق.', prompt: 'قولي لنفسك جملة تشجيع صادقة.' },
  { title: 'مساحتك الخاصة', message: 'من حقك ترتاحي، تقولي لا، وتطلبي مساعدة من شخص موثوق عندما تحتاجين. الاهتمام بنفسك ليس أنانية؛ هو طريقة تحافظين بها على طاقتك.', prompt: 'ما الحد اللطيف الذي تحتاجينه اليوم؟' },
];

function dayIndex() { const now = new Date(); const start = new Date(now.getFullYear(), 0, 0); return Math.floor((now.getTime() - start.getTime()) / 86400000); }

export default function SundusPage({ active, apiBaseUrl, identity }: Props) {
  const card = cards[dayIndex() % cards.length];
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: 'أنا سندس، إنتي مين؟ احكيلي براحتك، أنا هنا أسمعك وأشجعك.' }]);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault(); const text = draft.trim(); if (!text || sending) return;
    setDraft(''); setError(''); setMessages((items) => [...items, { role: 'user', text }]);
    if (!apiBaseUrl || !identity) { setError('المساعد يحتاج إلى اتصال الخادم الآن، لكن بطاقة اليوم متاحة لكِ.'); return; }
    setSending(true);
    try { const result = await sendAssistantMessage(apiBaseUrl, identity, `أنتِ داخل صفحة أنا سندس. ردي بلطف ودفء وبأسلوب مناسب لفتاة عمرها 15 سنة. ${text}`); setMessages((items) => [...items, { role: 'assistant', text: result.reply }]); }
    catch { setError('لم أستطع الوصول للمساعد الآن. جرّبي بعد قليل.'); }
    finally { setSending(false); }
  };

  return <section hidden={!active} className="sundus-page">
    <header className="sundus-page-hero"><div className="sundus-avatar"><img src={sundusImage} alt="سندس" /></div><div><span className="sundus-kicker"><Sparkles size={15} /> مساحتك الآمنة</span><h2>أنا سندس</h2><p>رفيقة صغيرة للامتنان والهدوء والنمو كل يوم.</p></div><Heart size={26} fill="currentColor" /></header>
    <article className="daily-optimism-card"><div className="daily-card-heading"><span><Sun size={16} /> بطاقة التفاؤل اليومية</span><small>تتجدد كل يوم</small></div><h3>{card.title}</h3><p>{card.message}</p><div className="daily-card-prompt"><Sparkles size={15} /><span>{card.prompt}</span></div></article>
    <article className="sundus-chat-card"><div className="sundus-chat-title"><MessageCircle size={19} /><div><strong>أنا سندس، إنتي مين؟</strong><small>احكي، اسألي، أو اكتبي شعورك اليوم</small></div></div><div className="sundus-messages" aria-live="polite">{messages.map((message, index) => <div className={`sundus-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? <Sparkles size={13} /> : <UserRound size={13} />}</span><p>{message.text}</p></div>)}{sending && <div className="sundus-typing">سندس تكتب لكِ الآن...</div>}</div>{error && <p className="sundus-error">{error}</p>}<form className="sundus-chat-form" onSubmit={submit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="أنا سندس، إنتي مين؟" aria-label="اكتبي لسندس" maxLength={4000} /><button type="submit" disabled={sending || !draft.trim()} aria-label="إرسال"><Send size={17} /></button></form></article>
  </section>;
}
