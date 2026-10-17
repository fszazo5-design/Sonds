import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Heart, LoaderCircle, Plus, Sparkles, Sun } from 'lucide-react';
import sundusImage from '../assets/sundus-water.webp';
import type { LocalSyncIdentity } from '../lib/neonSync';
import { loadSundusWellbeing, saveSundusGratitude, saveSundusMood, type SundusGratitude, type SundusMood } from '../lib/sundusWellbeingApi';

type Props = { active: boolean; apiBaseUrl: string | null; identity: LocalSyncIdentity | null };
type Card = { title: string; message: string; prompt: string };

const cards: Card[] = [
  { title: 'نور صغير وسط الزحام', message: 'مش لازم اليوم يكون مثالي عشان يكون فيه حاجة حلوة. خدي نفسًا هادئًا ولاحظي شيئًا واحدًا ساعدك أو فرّحك، حتى لو كان بسيطًا جدًا.', prompt: 'إيه الحاجة الصغيرة اللي تستحقي تشكري نفسك عليها النهارده؟' },
  { title: 'قوة الهدوء', message: 'أحيانًا أقوى خطوة هي إنك تهدي وتدي لنفسك فرصة تفهمي شعورك بدل ما تحكمي عليه. مشاعرك رسائل، وليست أحكامًا عليكِ.', prompt: 'اكتبي كلمة واحدة تصف إحساسك الآن.' },
  { title: 'خطوة واحدة تكفي', message: 'لو كل شيء باين كبير، اختاري خطوة صغيرة فقط. التقدم الهادئ ما زال تقدمًا، ومشوارك لا يحتاج أن يشبه مشوار أي شخص آخر.', prompt: 'ما أصغر خطوة لطيفة تقدري تعمليها خلال عشر دقائق؟' },
  { title: 'أنتِ تتعلمين', message: 'الغلط لا يلغي شطارتك، واليوم الصعب لا يلغي الأيام التي حاولتِ فيها. كل تجربة تضيف لكِ فهمًا جديدًا لنفسك.', prompt: 'ما الشيء الذي تعلمتِه عن نفسك مؤخرًا؟' },
  { title: 'امتنان بلا ضغط', message: 'مش مطلوب منكِ تكوني مبسوطة طوال الوقت. يكفي أن تتركي مساحة صغيرة لشيء مريح: كوب ماء، كلمة حلوة، أو لحظة أمان.', prompt: 'اختاري شيئًا واحدًا مريحًا وامنحيه انتباهك دقيقة.' },
  { title: 'قلبك يستحق الرفق', message: 'كلمي نفسك بالطريقة التي تكلمين بها صديقتك المفضلة. أنتِ إنسانة بتكبر وبتتعلم، وتستحقي الصبر أثناء الطريق.', prompt: 'قولي لنفسك جملة تشجيع صادقة.' },
  { title: 'مساحتك الخاصة', message: 'من حقك ترتاحي، تقولي لا، وتطلبي مساعدة من شخص موثوق عندما تحتاجين. الاهتمام بنفسك ليس أنانية؛ هو طريقة تحافظين بها على طاقتك.', prompt: 'ما الحد اللطيف الذي تحتاجينه اليوم؟' },
];
const moods = [{ key: 'great', label: 'رائعة', emoji: '😊', score: 5 }, { key: 'good', label: 'كويسة', emoji: '🙂', score: 4 }, { key: 'okay', label: 'عادية', emoji: '😐', score: 3 }, { key: 'tired', label: 'متعبة', emoji: '😔', score: 2 }, { key: 'hard', label: 'صعبة', emoji: '😣', score: 1 }];
function dayIndex() { const now = new Date(); const start = new Date(now.getFullYear(), 0, 0); return Math.floor((now.getTime() - start.getTime()) / 86400000); }

export default function SundusPage({ active, apiBaseUrl, identity }: Props) {
  const card = cards[dayIndex() % cards.length];
  const [moodEntries, setMoodEntries] = useState<SundusMood[]>([]);
  const [gratitudes, setGratitudes] = useState<SundusGratitude[]>([]);
  const [selectedMood, setSelectedMood] = useState('');
  const [gratitudeText, setGratitudeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!active || !apiBaseUrl || !identity) return;
    setLoading(true); setMessage('');
    loadSundusWellbeing(apiBaseUrl, identity).then((result) => { setMoodEntries(result.moods); setGratitudes(result.gratitudes); }).catch(() => setMessage('تعذر تحميل سجلك الآن. يمكنك المحاولة مرة أخرى لاحقًا.')).finally(() => setLoading(false));
  }, [active, apiBaseUrl, identity]);

  const moodAverage = useMemo(() => moodEntries.length ? (moodEntries.reduce((sum, item) => sum + item.moodScore, 0) / moodEntries.length).toFixed(1) : '—', [moodEntries]);
  const latestMood = moodEntries[0];
  const saveMood = async (mood: typeof moods[number]) => {
    setSelectedMood(mood.key); setMessage('');
    if (!apiBaseUrl || !identity) { setMessage('الحفظ يحتاج اتصال Neon بالخادم.'); return; }
    setSaving(true);
    try { const entry = await saveSundusMood(apiBaseUrl, identity, mood.key, mood.score, mood.label); setMoodEntries((items) => [entry, ...items]); setMessage('تم حفظ شعورك في سجلك الخاص.'); }
    catch { setMessage('لم يتم حفظ الشعور الآن. جرّبي مرة أخرى.'); } finally { setSaving(false); }
  };
  const addGratitude = async () => {
    const content = gratitudeText.trim(); if (!content || saving) return;
    if (!apiBaseUrl || !identity) { setMessage('الحفظ يحتاج اتصال Neon بالخادم.'); return; }
    setSaving(true); setMessage('');
    try { const entry = await saveSundusGratitude(apiBaseUrl, identity, content); setGratitudes((items) => [entry, ...items]); setGratitudeText(''); setMessage('أضيفت إلى بنك امتنانك.'); }
    catch { setMessage('لم تتم إضافة الامتنان الآن. جرّبي مرة أخرى.'); } finally { setSaving(false); }
  };

  return <section hidden={!active} className="sundus-page">
    <header className="sundus-page-hero"><div className="sundus-avatar"><img src={sundusImage} alt="سندس" /></div><div><span className="sundus-kicker"><Sparkles size={15} /> مساحتك الآمنة</span><h2>أنا سندس</h2><p>بطاقة تفاؤل، متابعة مشاعر، وبنك امتنان خاص بكِ.</p></div><Heart size={26} fill="currentColor" /></header>
    <article className="daily-optimism-card"><div className="daily-card-heading"><span><Sun size={16} /> بطاقة التفاؤل اليومية</span><small>تتجدد كل يوم</small></div><h3>{card.title}</h3><p>{card.message}</p><div className="daily-card-prompt"><Sparkles size={15} /><span>{card.prompt}</span></div></article>
    <section className="sundus-wellbeing-grid"><article className="mood-tracker-card"><div className="wellbeing-heading"><BarChart3 size={18} /><div><strong>متابعة مشاعري</strong><small>اختاري شعورك الآن، وسنحفظه في مؤشراتك</small></div></div><div className="mood-options">{moods.map((mood) => <button type="button" key={mood.key} className={selectedMood === mood.key ? 'selected' : ''} onClick={() => void saveMood(mood)} disabled={saving}><span>{mood.emoji}</span><small>{mood.label}</small></button>)}</div><div className="mood-indicators"><div><strong>{moodEntries.length}</strong><small>تسجيلات</small></div><div><strong>{moodAverage}</strong><small>متوسط المزاج</small></div><div><strong>{latestMood ? moods.find((mood) => mood.key === latestMood.moodKey)?.emoji ?? '•' : '—'}</strong><small>آخر شعور</small></div></div></article>
      <article className="gratitude-card"><div className="wellbeing-heading"><Heart size={18} /><div><strong>بنك الامتنان</strong><small>اكتبي أشياء تحبين الاحتفاظ بها</small></div></div><div className="gratitude-form"><textarea value={gratitudeText} onChange={(event) => setGratitudeText(event.target.value)} placeholder="أنا ممتنة اليوم لـ..." maxLength={2000} /><button type="button" onClick={() => void addGratitude()} disabled={saving || !gratitudeText.trim()}><Plus size={16} /> إضافة</button></div><div className="gratitude-list">{gratitudes.slice(0, 5).map((entry) => <div key={entry.id}><Check size={14} /><span>{entry.content}</span></div>)}{!gratitudes.length && <p>لسه البنك فاضي. اكتبي أول حاجة ممتنة لها.</p>}</div><small className="gratitude-count">{gratitudes.length} شيء محفوظ في بنكك</small></article></section>
    {(loading || message) && <div className="sundus-save-status">{loading && <LoaderCircle size={15} />} {message}</div>}
  </section>;
}
