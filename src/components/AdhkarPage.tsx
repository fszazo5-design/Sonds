import { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, Check, ChevronRight, Moon, Play, RotateCcw, Sun, Volume2, VolumeX } from 'lucide-react';

export type AdhkarSettings = {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
};

type AdhkarProgress = { morning: string[]; evening: string[] };
type Props = { active: boolean; settings: AdhkarSettings; progress: AdhkarProgress; onSettingsChange: (settings: AdhkarSettings) => void; onProgressChange: (progress: AdhkarProgress) => void; onBack: () => void };
type AdhkarItem = { id: string; text: string; count: number };

const morning: AdhkarItem[] = [
  { id: 'morning-1', text: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له.', count: 1 },
  { id: 'morning-2', text: 'اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.', count: 1 },
  { id: 'morning-3', text: 'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد صلى الله عليه وسلم نبيًا.', count: 3 },
  { id: 'morning-4', text: 'سبحان الله وبحمده.', count: 100 },
];
const evening: AdhkarItem[] = [
  { id: 'evening-1', text: 'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له.', count: 1 },
  { id: 'evening-2', text: 'اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.', count: 1 },
  { id: 'evening-3', text: 'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد صلى الله عليه وسلم نبيًا.', count: 3 },
  { id: 'evening-4', text: 'أعوذ بكلمات الله التامات من شر ما خلق.', count: 3 },
];
const speak = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA'; utterance.rate = 0.85; utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
};

export default function AdhkarPage({ active, settings, progress, onSettingsChange, onProgressChange, onBack }: Props) {
  const [tab, setTab] = useState<'morning' | 'evening'>('morning');
  const [speaking, setSpeaking] = useState(false);
  const list = tab === 'morning' ? morning : evening;
  const done = progress[tab];
  const completed = list.filter((item) => done.includes(item.id)).length;
  const title = tab === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
  const reminder = tab === 'morning' ? { enabled: settings.morningEnabled, time: settings.morningTime } : { enabled: settings.eveningEnabled, time: settings.eveningTime };
  const setReminder = (patch: Partial<typeof reminder>) => onSettingsChange(tab === 'morning' ? { ...settings, ...({ morningEnabled: patch.enabled ?? reminder.enabled, morningTime: patch.time ?? reminder.time }) } : { ...settings, ...({ eveningEnabled: patch.enabled ?? reminder.enabled, eveningTime: patch.time ?? reminder.time }) });
  const currentText = useMemo(() => list.map((item) => item.text).join(' ') , [list]);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  const toggleItem = (id: string) => onProgressChange({ ...progress, [tab]: done.includes(id) ? done.filter((item) => item !== id) : [...done, id] });
  const readAll = () => { setSpeaking(true); speak(currentText); window.setTimeout(() => setSpeaking(false), Math.max(2000, currentText.length * 65)); };
  return <section hidden={!active} className="adhkar-page">
    <button type="button" className="adhkar-back-button" onClick={onBack}><ChevronRight size={18} /> العودة إلى معلوماتي</button>
    <header className="adhkar-hero"><div><span className="adhkar-eyebrow"><BookOpen size={15} /> نور يومك وطمأنينة قلبك</span><h2>أذكار الصباح والمساء</h2><p>اقرئي أذكارك بهدوء، واستمعي إليها بصوت الجهاز، واجعليها عادة لطيفة كل يوم.</p></div><div className="adhkar-hero-symbol">{tab === 'morning' ? <Sun size={55} /> : <Moon size={55} />}</div></header>
    <div className="adhkar-tabs" role="tablist"><button type="button" className={tab === 'morning' ? 'active' : ''} onClick={() => setTab('morning')}><Sun size={18} /> أذكار الصباح</button><button type="button" className={tab === 'evening' ? 'active' : ''} onClick={() => setTab('evening')}><Moon size={18} /> أذكار المساء</button></div>
    <section className="adhkar-toolbar"><div><span className="section-kicker">{title}</span><h3>{completed} من {list.length} أذكار مكتملة</h3></div><div className="adhkar-actions"><button type="button" onClick={readAll}>{speaking ? <VolumeX size={16} /> : <Volume2 size={16} />} {speaking ? 'إيقاف القراءة' : 'قراءة صوتية'}</button><button type="button" onClick={() => onProgressChange({ ...progress, [tab]: [] })}><RotateCcw size={15} /> إعادة</button></div></section>
    <div className="adhkar-progress"><span style={{ width: `${list.length ? completed / list.length * 100 : 0}%` }} /></div>
    <div className="adhkar-list">{list.map((item) => <article className={`adhkar-card ${done.includes(item.id) ? 'adhkar-done' : ''}`} key={item.id}><button type="button" className="adhkar-check" onClick={() => toggleItem(item.id)} aria-label={`تحديد ${item.text}`}>{done.includes(item.id) ? <Check size={20} /> : <span />}</button><p>{item.text}</p><span className="adhkar-count">{item.count} مرات</span><button type="button" className="adhkar-read-one" aria-label="قراءة الذكر" onClick={() => { setSpeaking(true); speak(item.text); }}><Play size={15} fill="currentColor" /></button></article>)}</div>
    <section className="adhkar-reminder"><div className="adhkar-reminder-icon"><Bell size={20} /></div><div className="adhkar-reminder-copy"><span className="section-kicker">تنبيه لطيف</span><h3>تذكير {title}</h3><p>اختاري موعدًا ليظهر التذكير في الهاتف عند توفر إشعارات Android.</p></div><label className="adhkar-switch"><input type="checkbox" checked={reminder.enabled} onChange={(event) => setReminder({ enabled: event.target.checked })} /><span /></label><input className="adhkar-time" type="time" value={reminder.time} disabled={!reminder.enabled} onChange={(event) => setReminder({ time: event.target.value })} /></section>
    <p className="adhkar-note">الأذكار المعروضة للتذكير والقراءة داخل التطبيق، ويُفضّل مراجعة النصوص مع مصدر موثوق.</p>
  </section>;
}
