import { useEffect, useState } from 'react';
import { Activity, Bell, Check, Clock3, Flame, Heart, ImagePlus, Pause, Play, Plus, RotateCcw, Save, Sparkles, Star, Timer, Trophy, X } from 'lucide-react';
import wallPushupsArt from '../assets/game-wall-pushups.webp';
import plankArt from '../assets/game-plank.webp';
import squatsArt from '../assets/game-squats.webp';
import danceArt from '../assets/game-dance.webp';
import stretchArt from '../assets/game-stretch.webp';

export type CustomActivity = {
  id: string;
  title: string;
  description: string;
  instruction: string;
  mode: 'reps' | 'hold';
  duration: number;
  unit: string;
  image?: string;
};

export type ActivityGameStats = { sessions: number; totalReps: number; bestReps: number };
export type GameReminderSettings = Record<string, { enabled: boolean; time: string }>;

export type ActivityGame = {
  id: string;
  title: string;
  description: string;
  instruction: string;
  mode: 'reps' | 'hold';
  duration: number;
  unit: string;
  level: string;
  color: string;
  art?: string;
  icon: string;
  image?: string;
};

const illustrations: Record<string, string> = {
  pushups: wallPushupsArt,
  plank: plankArt,
  squats: squatsArt,
  dance: danceArt,
  stretch: stretchArt,
};

const starterGames: ActivityGame[] = [
  { id: 'pushups', title: 'ضغط على الحائط', description: 'بداية سهلة للذراعين والكتفين', instruction: 'قفي أمام الحائط، ضعي كفّيك عليه وابتعدي خطوة. اثني مرفقيك بهدوء ثم ادفعي برفق.', mode: 'reps', duration: 40, unit: 'ضغطة', level: 'سهل', color: 'rose', icon: '💪' },
  { id: 'plank', title: 'تحدّي البلانك', description: 'ثبات لطيف على قدّ استطاعتك', instruction: 'استندي إلى الساعدين والركبتين أو أصابع القدمين، وحافظي على جسم مرتاح ومستقيم. توقفي إذا شعرتِ بألم.', mode: 'hold', duration: 20, unit: 'ثانية ثبات', level: 'متوسط', color: 'mint', icon: '🌿' },
  { id: 'squats', title: 'قرفصاء الكرسي', description: 'اجلسي وقفي بحركة متزنة', instruction: 'قفي أمام كرسي ثابت، أرجعي الوركين للخلف كأنك ستجلسين، ثم قفي براحة. استخدمي الكرسي للتوازن إذا احتجتِ.', mode: 'reps', duration: 40, unit: 'تكرار', level: 'سهل', color: 'peach', icon: '⭐' },
  { id: 'dance', title: 'رقصة النجوم', description: 'خطوات خفيفة ومزاج أحلى', instruction: 'امشي في مكانك أو تحركي بخطوات جانبية صغيرة على إيقاعك. اختاري حركة تناسب راحتك.', mode: 'reps', duration: 45, unit: 'خطوة', level: 'مرح', color: 'lilac', icon: '🎵' },
  { id: 'stretch', title: 'تمدد وراحة', description: 'تمدد جانبي هادئ بعد الجلوس', instruction: 'قفي براحة، ارفعي ذراعًا ومدّي جانبك بلطف ثم بدّلي الجهة. لا تضغطي على جسمك ولا تكملي عند الألم.', mode: 'hold', duration: 20, unit: 'ثانية تمدد', level: 'هادئ', color: 'sky', icon: '🌷' },
];

const fmt = (n: number) => new Intl.NumberFormat('ar-EG').format(n);
const clock = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

type Props = {
  active: boolean;
  customGames: CustomActivity[];
  reminders: GameReminderSettings;
  onRemindersChange: (reminders: GameReminderSettings) => void;
  stats: ActivityGameStats;
  onCustomGamesChange: (games: CustomActivity[]) => void;
  onComplete: (reps: number) => void;
  onCountdownSound?: () => void;
};

export default function ActivityGames({ active, customGames, reminders, onRemindersChange, stats, onCustomGamesChange, onComplete, onCountdownSound }: Props) {
  const games: ActivityGame[] = [
    ...starterGames.map((game) => ({ ...game, art: illustrations[game.id] })),
    ...customGames.map((game, index) => ({ ...game, level: 'لعبتك', color: ['rose', 'mint', 'peach', 'lilac', 'sky'][index % 5], icon: '✨' })),
  ];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', instruction: '', mode: 'reps' as 'reps' | 'hold', duration: '30', unit: 'تكرار' });
  const [imagePreview, setImagePreview] = useState('');
  const [formError, setFormError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [reps, setReps] = useState(0);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [completeNotice, setCompleteNotice] = useState('');
  const selected = games.find((game) => game.id === selectedId) ?? null;

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || secondsLeft !== 0) return;
    setRunning(false);
    setCompleteNotice(`انتهت الجولة! أحسنتِ، سجلتِ ${fmt(reps)} ${selected?.unit ?? 'تكرار'}.`);
    onComplete(reps);
  }, [running, secondsLeft, reps, onComplete, selected?.unit]);

  useEffect(() => {
    if (!running || secondsLeft !== 0 || !selected) return;
    try {
      if (window.AndroidBridge?.playGameEndSound) {
        window.AndroidBridge.playGameEndSound();
      } else {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(660, context.currentTime);
          oscillator.frequency.setValueAtTime(880, context.currentTime + 0.16);
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.45);
          oscillator.addEventListener('ended', () => { void context.close(); }, { once: true });
        }
      }
    } catch {
      // تظهر الرسالة داخل صفحة اللعب حتى لو منع المتصفح تشغيل الصوت.
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`انتهت جولة ${selected.title}`, { body: `أحسنتِ! سجلتِ ${fmt(reps)} ${selected.unit}.` });
    }
  }, [running, secondsLeft, selected, reps]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    onCountdownSound?.();
    const timer = window.setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        setRunning(true);
      } else {
        setCountdown((current) => current - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, onCountdownSound]);

  const start = () => {
    if (!selected || countdown > 0) return;
    if (running) {
      setRunning(false);
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    if (secondsLeft <= 0) { setSecondsLeft(selected.duration); setReps(0); setCompleteNotice(''); }
    setCountdown(3);
  };
  const reset = () => { setCountdown(0); setRunning(false); setSecondsLeft(selected?.duration ?? 0); setReps(0); setCompleteNotice(''); };
  const openGame = (game: ActivityGame) => { setSelectedId(game.id); setCountdown(0); setRunning(false); setSecondsLeft(game.duration); setReps(0); setCompleteNotice(''); };
  const saveCustom = () => {
    const title = form.title.trim();
    const duration = Number(form.duration);
    if (!title) { setFormError('اكتبي اسم اللعبة.'); return; }
    if (title.length > 100) { setFormError('اسم اللعبة يجب ألا يتجاوز 100 حرف.'); return; }
    if (!Number.isFinite(duration) || duration < 5 || duration > 300) { setFormError('اختاري مدة بين 5 و300 ثانية.'); return; }
    const item: CustomActivity = {
      id: `custom-game-${Date.now()}`,
      title,
      description: form.description.trim() || 'لعبة حركة من اختيارك',
      instruction: form.instruction.trim() || 'تحركي بالوتيرة التي تناسبك وخذي استراحة عند الحاجة.',
      mode: form.mode,
      duration,
      unit: form.mode === 'hold' ? 'ثانية ثبات' : (form.unit.trim() || 'تكرار'),
      image: imagePreview || undefined,
    };
    onCustomGamesChange([...customGames, item]);
    setShowAddForm(false);
    setForm({ title: '', description: '', instruction: '', mode: 'reps', duration: '30', unit: 'تكرار' });
    setImagePreview('');
    setFormError('');
  };
  const chooseImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('اختاري ملف صورة فقط.'); return; }
    if (file.size > 2 * 1024 * 1024) { setFormError('حجم الصورة يجب ألا يتجاوز 2 ميجابايت.'); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => setFormError('تعذّر قراءة الصورة، جرّبي صورة أخرى.');
    reader.readAsDataURL(file);
  };

  return (
    <section hidden={!active} className="activity-games-page">
      <div className="games-hero">
        <div className="games-hero-copy"><span className="games-kicker"><Sparkles size={15} /> وقت الحركة والمرح</span><h2>اختاري لعبتك!</h2><p>حركات بسيطة، تحديات قصيرة، وراحة وقت ما تحتاجين.</p><div className="games-safety"><Heart size={15} /> اختاري مستوى مريحًا لكِ، وتوقفي عند أي ألم أو دوخة.</div></div>
        <div className="games-hero-art" aria-hidden="true"><span>✦</span><span>★</span><span>✧</span></div>
      </div>

      <div className="games-summary"><div><Trophy size={20} /><strong>{fmt(stats.sessions)}</strong><span>جولات مكتملة</span></div><div><Flame size={20} /><strong>{fmt(stats.totalReps)}</strong><span>حركات مسجّلة</span></div><div><Star size={20} /><strong>{fmt(stats.bestReps)}</strong><span>أفضل جولة</span></div></div>

      <div className="games-section-heading"><div><span className="section-kicker">اختاري ما يناسبك</span><h3>ألعاب الحركة</h3></div><span className="games-count">{fmt(games.length)} ألعاب</span></div>
      <div className="games-grid">
        {games.map((game) => (
          <article className={`activity-game-card game-${game.color}`} key={game.id}>
            <button className="activity-game-art" type="button" onClick={() => openGame(game)} aria-label={`ابدئي ${game.title}`}>
              {game.art || game.image ? <img src={game.art ?? game.image} alt={`رسمة ${game.title}`} /> : <span className="custom-game-art">{game.icon}</span>}
              <span className="game-level">{game.level}</span>
            </button>
            <div className="activity-game-copy"><h4>{game.title}</h4><p>{game.description}</p><div className="game-meta"><span><Clock3 size={13} /> {fmt(game.duration)} ث</span><span>{game.mode === 'hold' ? 'ثبات' : 'عدّاد'}</span></div>
              {(() => {
                const reminder = reminders[game.id] ?? { enabled: false, time: '18:00' };
                return <div className="game-reminder-row"><label className="game-reminder-toggle"><input type="checkbox" checked={reminder.enabled} onChange={(event) => onRemindersChange({ ...reminders, [game.id]: { ...reminder, enabled: event.target.checked } })} /><Bell size={14} /><span>تنبيه يومي</span></label><input className="game-reminder-time" type="time" aria-label={`موعد التنبيه اليومي للعبة ${game.title}`} value={reminder.time} disabled={!reminder.enabled} onChange={(event) => onRemindersChange({ ...reminders, [game.id]: { ...reminder, time: event.target.value } })} /></div>;
              })()}
              <button type="button" className="game-play-button" onClick={() => openGame(game)}><Play size={15} fill="currentColor" /> ابدئي اللعب</button>
            </div>
          </article>
        ))}
        <button type="button" className="add-game-card" onClick={() => { setShowAddForm(true); setFormError(''); }}><span className="add-game-icon"><Plus size={25} /></span><strong>أضيفي لعبة بنفسك</strong><span>اختاري الاسم والمدة والصورة وطريقة اللعب</span></button>
      </div>

      <p className="games-note"><Activity size={15} /> الألعاب للتشجيع على الحركة وليست نصيحة طبية. يمكنك تعديل أي حركة بما يناسبك.</p>

      {showAddForm && <div className="game-modal-backdrop" role="presentation" onClick={() => setShowAddForm(false)}><section className="game-dialog" role="dialog" aria-modal="true" aria-labelledby="add-game-title" onClick={(event) => event.stopPropagation()}><button className="game-dialog-close" type="button" onClick={() => setShowAddForm(false)} aria-label="إغلاق"><X size={18} /></button><div className="game-dialog-heading"><span><Plus size={22} /></span><div><small>مساحة خاصة لكِ</small><h3 id="add-game-title">إضافة لعبة يدوية</h3></div></div><div className="game-form"><label>اسم اللعبة<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: مشي في المكان" /></label><label>وصف قصير<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="حركة خفيفة وممتعة" /></label><label className="game-image-field"><span>صورة اللعبة <small>(اختياري، حتى 2 ميجابايت)</small></span><input type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0])} />{imagePreview && <img className="game-image-preview" src={imagePreview} alt="معاينة صورة اللعبة" />}<ImagePlus size={18} /></label><label>طريقة اللعب<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as 'reps' | 'hold' })}><option value="reps">عدّ الحركات بالضغط</option><option value="hold">تحدي ثبات بالوقت</option></select></label><label>مدة الجولة بالثواني<input type="number" min="5" max="300" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label>{form.mode === 'reps' && <label>اسم الحركة في العداد<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="تكرار" /></label>}<label className="game-form-wide">تعليمات اللعبة<textarea rows={3} value={form.instruction} onChange={(event) => setForm({ ...form, instruction: event.target.value })} placeholder="اكتبي طريقة اللعب أو اتركيها فارغة للتعليمات الافتراضية" /></label></div>{formError && <p className="game-form-error" role="alert">{formError}</p>}<div className="game-dialog-actions"><button type="button" className="game-save-button" onClick={saveCustom}><Save size={16} /> حفظ اللعبة</button><button type="button" className="game-cancel-button" onClick={() => setShowAddForm(false)}>إلغاء</button></div></section></div>}

      {selected && <div className="game-modal-backdrop" role="presentation" onClick={() => { setCountdown(0); setRunning(false); setSelectedId(null); }}><section className="game-dialog game-play-dialog" role="dialog" aria-modal="true" aria-labelledby="selected-game-title" onClick={(event) => event.stopPropagation()}><button className="game-dialog-close" type="button" onClick={() => { setCountdown(0); setRunning(false); setSelectedId(null); }} aria-label="إغلاق اللعبة"><X size={18} /></button><div className="game-dialog-heading"><span className="selected-game-emoji">{selected.icon}</span><div><small>{selected.level} · {selected.mode === 'hold' ? 'تحدي ثبات' : 'تحدي حركة'}</small><h3 id="selected-game-title">{selected.title}</h3></div></div><p className="game-instruction">{selected.instruction}</p>{countdown > 0 && <div className="game-start-countdown" role="status" aria-live="assertive"><span>استعدّي يا سندس</span><strong>{fmt(countdown)}</strong><small>تبدأ الجولة مع آخر نغمة</small></div>}<div className={`game-clock-panel ${countdown > 0 ? 'game-clock-waiting' : ''}`}><Timer size={19} /><strong role="timer">{clock(secondsLeft)}</strong>{selected.mode === 'reps' && <span className="game-rep-count">{fmt(reps)} <small>{selected.unit}</small></span>}</div><div className="game-timer-progress"><span style={{ width: `${selected.duration ? ((selected.duration - secondsLeft) / selected.duration) * 100 : 0}%` }} /></div>{selected.mode === 'reps' && <button type="button" className="game-rep-button" disabled={!running} onClick={() => setReps((count) => count + 1)}><Check size={20} /> سجّلي {selected.unit === 'ضغطة' ? 'ضغطة' : selected.unit === 'خطوة' ? 'خطوة' : 'تكرارًا'}</button>}{completeNotice && <p className="game-complete-message" role="status"><Sparkles size={17} /> {completeNotice}</p>}<div className="game-dialog-actions"><button type="button" className="game-save-button" disabled={countdown > 0} onClick={start}>{running ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}{running ? 'إيقاف مؤقت' : countdown > 0 ? 'استعدّي...' : secondsLeft > 0 && secondsLeft < selected.duration ? 'استئناف' : 'ابدئي الجولة'}</button><button type="button" className="game-cancel-button" onClick={reset}><RotateCcw size={16} /> إعادة</button></div></section></div>}
    </section>
  );
}
