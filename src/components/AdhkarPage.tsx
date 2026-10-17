import { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Check, LoaderCircle, Moon, RotateCcw, Sunrise, WifiOff } from 'lucide-react';
import { afterPrayerAdhkar, eveningAdhkar, morningAdhkar, type Dhikr, type DhikrCategory } from '../data/azcarAdhkar';

export type AdhkarSettings = {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
};

type AdhkarCounts = { morning: Record<string, number>; evening: Record<string, number>; afterPrayer: Record<string, number>; ruqyah: Record<string, number> };
type Props = { active: boolean; settings: AdhkarSettings; progress: AdhkarCounts; onSettingsChange: (settings: AdhkarSettings) => void; onProgressChange: (progress: AdhkarCounts) => void; onBack: () => void };
type Filter = DhikrCategory;

const filters: { key: Filter; label: string; icon: typeof Sunrise }[] = [
  { key: 'morning', label: 'الصباح', icon: Sunrise },
  { key: 'evening', label: 'المساء', icon: Moon },
  { key: 'after_prayer', label: 'بعد الصلاة', icon: AlarmClock },
];

const speak = (text: string) => {
  if (window.AndroidBridge?.speakArabic) { window.AndroidBridge.speakArabic(text); return; }
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA'; utterance.rate = 0.66;
  window.speechSynthesis.speak(utterance);
};

function AzcarDhikrCard({ dhikr, index, counts, onChange }: { dhikr: Dhikr; index: number; counts: Record<string, number>; onChange: (id: string, value: number) => void }) {
  const current = counts[dhikr.id] ?? 0;
  const isComplete = current >= dhikr.count;
  const percent = Math.min((current / dhikr.count) * 100, 100);
  const increment = () => { if (!isComplete) onChange(dhikr.id, current + 1); };
  const reset = () => onChange(dhikr.id, 0);
  return <article className={`azcar-dhikr-card ${isComplete ? 'azcar-dhikr-complete' : ''}`} style={{ animationDelay: `${index * 60}ms` }}>
    <div className="azcar-dhikr-top"><span className="azcar-dhikr-index">{index + 1}</span>{isComplete && <span className="azcar-dhikr-done"><Check size={14} strokeWidth={3} /> تم</span>}</div>
    <div className="azcar-dhikr-progress"><span style={{ width: `${percent}%` }} /></div>
    <p className="azcar-dhikr-text">{dhikr.text}</p>
    {dhikr.virtue && <p className="azcar-dhikr-virtue">✦ {dhikr.virtue}</p>}
    <div className="azcar-dhikr-footer">
      <button type="button" className={`azcar-counter ${isComplete ? 'complete' : ''}`} onClick={increment} disabled={isComplete} aria-label={`تكرار الذكر ${current} من ${dhikr.count}`}>
        {isComplete ? <Check size={26} strokeWidth={3} /> : <><strong>{current}</strong><small>/ {dhikr.count}</small></>}
      </button>
      <div className="azcar-dhikr-info"><p>التكرار: {dhikr.count} مرة</p>{dhikr.source && <p>المصدر: {dhikr.source}</p>}{dhikr.count >= 33 && !isComplete && <div className="azcar-mini-progress"><span style={{ width: `${percent}%` }} /></div>}</div>
      {current > 0 && <button type="button" className="azcar-reset" onClick={reset} aria-label="إعادة"><RotateCcw size={18} /></button>}
      <button type="button" className="azcar-speak" onClick={() => speak(dhikr.text)} aria-label="قراءة الذكر">▶</button>
    </div>
  </article>;
}

export default function AdhkarPage({ active, progress, onProgressChange, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('morning');
  const [loading] = useState(false);
  const [offline] = useState(false);
  const list = filter === 'morning' ? morningAdhkar : filter === 'evening' ? eveningAdhkar : afterPrayerAdhkar;
  const key = filter === 'after_prayer' ? 'afterPrayer' : filter;
  const counts = progress[key] ?? {};
  const total = list.length;
  const done = list.filter((item) => (counts[item.id] ?? 0) >= item.count).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const currentText = useMemo(() => list.map((item) => item.text).join(' '), [list]);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); window.AndroidBridge?.stopSpeech(); }, []);

  const updateCount = (id: string, value: number) => onProgressChange({ ...progress, [key]: value <= 0 ? Object.fromEntries(Object.entries(counts).filter(([itemId]) => itemId !== id)) : { ...counts, [id]: value } });
  const readAll = () => speak(currentText);
  const resetAll = () => onProgressChange({ ...progress, [key]: {} });

  return <section hidden={!active} className="adhkar-page azcar-page">
    <button type="button" className="adhkar-back-button" onClick={onBack}>العودة إلى قائمة سندس</button>
    <div className="azcar-progress-card"><div><p>تقدّمك اليوم</p><strong>{percent}%</strong></div><div><p>المكتمل</p><strong>{done} <small>/ {total}</small></strong></div><div className="azcar-progress-track"><span style={{ width: `${percent}%` }} /></div></div>
    <div className="azcar-filters" role="tablist">{filters.map(({ key: itemKey, label, icon: Icon }) => <button type="button" key={itemKey} className={filter === itemKey ? 'active' : ''} onClick={() => setFilter(itemKey)}><Icon size={18} />{label}</button>)}</div>
    {loading && <div className="azcar-status"><LoaderCircle size={15} /> جارٍ تحديث الأذكار من المصدر...</div>}
    {offline && <div className="azcar-offline"><WifiOff size={15} /> تعمل الآن بالبيانات المحفوظة محلياً.</div>}
    <div className="azcar-list">{list.map((dhikr, index) => <AzcarDhikrCard key={dhikr.id} dhikr={dhikr} index={index} counts={counts} onChange={updateCount} />)}</div>
    <div className="azcar-actions"><button type="button" onClick={readAll}>▶ قراءة القائمة كاملة</button><button type="button" onClick={resetAll}><RotateCcw size={15} /> إعادة العدادات</button></div>
  </section>;
}
