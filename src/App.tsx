import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Award,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleHelp,
  Flame,
  Gift,
  Heart,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Sparkles,
  Star,
  Trophy,
  Utensils,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react';

type Meal = {
  id: string;
  title: string;
  label: string;
  time: string;
  calories: number;
  accent: string;
  icon: string;
  items: string[];
};

type SavedDay = {
  date: string;
  checked: Record<string, boolean>;
  completedMeals: string[];
  score: number;
  streak: number;
};

type Reward = {
  id: number;
  title: string;
  note: string;
  unlocked: boolean;
};

const meals: Meal[] = [
  {
    id: 'breakfast',
    title: 'الفطار',
    label: 'البداية القوية',
    time: '08:00 ص',
    calories: 420,
    accent: 'pink',
    icon: '☀',
    items: ['بيضة واحدة', '100 جم جبنة قريش', '40 جم عيش بلدي', 'خيار وطماطم وخس', 'ملعقة صغيرة زيت زيتون'],
  },
  {
    id: 'snack-1',
    title: 'سناك 1',
    label: 'وقت الطاقة',
    time: '11:00 ص',
    calories: 175,
    accent: 'yellow',
    icon: '◒',
    items: ['150 جم زبادي طبيعي غير محلى', 'ثمرة فاكهة متوسطة (مثل تفاحة)'],
  },
  {
    id: 'lunch',
    title: 'الغداء',
    label: 'وجبة الأبطال',
    time: '02:30 م',
    calories: 530,
    accent: 'blue',
    icon: '✦',
    items: ['120 جم فراخ مشوية أو مطهية', 'سلطة بروتين (تونة / بيض / جبنة قريش)', '100–120 جم رز مطبوخ أو 120–150 جم مكرونة', 'طبق سلطة كبير + ملعقة صغيرة زيت زيتون'],
  },
  {
    id: 'snack-2',
    title: 'سناك 2',
    label: 'استراحة لذيذة',
    time: '05:30 م',
    calories: 100,
    accent: 'green',
    icon: '●',
    items: ['150 جم زبادي طبيعي غير محلى'],
  },
  {
    id: 'dinner',
    title: 'العشاء',
    label: 'نهاية مريحة',
    time: '08:00 م',
    calories: 435,
    accent: 'orange',
    icon: '☾',
    items: ['بيضة واحدة', '150 جم جبنة قريش', 'خيار وطماطم وخس', '40 جم عيش بلدي', 'ملعقة صغيرة زيت زيتون'],
  },
];

const getToday = (): string => new Date().toISOString().slice(0, 10);
const navigation: Array<{ Icon: ComponentType<LucideProps>; id: string; label: string }> = [
  { Icon: LayoutDashboard, id: 'home', label: 'الرئيسية' },
  { Icon: CalendarDays, id: 'calendar', label: 'تقويمي' },
  { Icon: Trophy, id: 'trophy', label: 'إنجازاتي' },
  { Icon: Info, id: 'info', label: 'معلومات' },
];

const defaultRewards: Reward[] = [
  { id: 1, title: 'اختاري فيلمك المفضل', note: 'مكافأة أول 7 أيام', unlocked: true },
  { id: 2, title: 'نزهة ممتعة مع بابا', note: 'مكافأة 14 يوماً', unlocked: false },
  { id: 3, title: 'مفاجأة كبيرة من بابا', note: 'عند الوصول إلى 100 يوم', unlocked: false },
];

const Totti = ({ celebrate = false, pose = 'happy' }: { celebrate?: boolean; pose?: string }) => (
  <div className={`totti-wrap totti-${pose} ${celebrate ? 'totti-celebrate' : ''}`} aria-label="توتي الكلب اللطيف">
    <div className="totti-ear totti-ear-left" />
    <div className="totti-ear totti-ear-right" />
    <div className="totti-face">
      <span className="totti-eye totti-eye-left" />
      <span className="totti-eye totti-eye-right" />
      <span className="totti-patch" />
      <span className="totti-muzzle"><span className="totti-nose" /><span className="totti-smile" /></span>
      <span className="totti-tongue" />
    </div>
    <div className="totti-paw totti-paw-left">♥</div>
    <div className="totti-paw totti-paw-right">✦</div>
  </div>
);

const Chick = () => (
  <div className="chick-illustration" aria-label="صورة الكتكوت اللطيف">
    <svg viewBox="0 0 180 180" role="img" aria-hidden="true">
      <path d="M50 75C30 65 26 42 42 30c7 17 20 22 34 25" fill="#ffea00" stroke="#6b3d19" strokeWidth="5" strokeLinecap="round" />
      <path d="M128 70c24-10 30-34 13-48-5 16-16 24-31 29" fill="#ffea00" stroke="#6b3d19" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="90" cy="96" rx="57" ry="55" fill="#ffbd00" stroke="#6b3d19" strokeWidth="6" />
      <path d="M40 104c-23 6-28 28-9 40 9-15 19-19 34-18" fill="#ffcf00" stroke="#6b3d19" strokeWidth="5" />
      <circle cx="70" cy="87" r="8" fill="#332237" /><circle cx="111" cy="87" r="8" fill="#332237" />
      <circle cx="73" cy="84" r="2.5" fill="#fff" /><circle cx="114" cy="84" r="2.5" fill="#fff" />
      <path d="M82 99h17l-8 12z" fill="#ff6b00" stroke="#6b3d19" strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 122c8 7 17 7 25 0" fill="none" stroke="#6b3d19" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 150c-4 13-14 17-22 10M121 150c4 13 14 17 22 10" fill="none" stroke="#6b3d19" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 43c10-12 23-16 36-10" fill="none" stroke="#fff48b" strokeWidth="7" strokeLinecap="round" />
    </svg>
  </div>
);

function App() {
  const today = getToday();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(6);
  const [rewards, setRewards] = useState<Reward[]>(defaultRewards);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeNav, setActiveNav] = useState('home');

  useEffect(() => {
    const saved = localStorage.getItem('sondos-totti-plan');
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as { day?: SavedDay; rewards?: Reward[] };
      if (data.day?.date === today) {
        setChecked(data.day.checked || {});
        setStreak(data.day.streak || 6);
      }
      if (data.rewards?.length) setRewards(data.rewards);
    } catch {
      localStorage.removeItem('sondos-totti-plan');
    }
  }, [today]);

  const completedCount = meals.filter((meal) => checked[meal.id]).length;
  const score = completedCount * 20;
  const calories = meals.reduce((sum, meal) => sum + (checked[meal.id] ? meal.calories : 0), 0);
  const progress = score;
  const allComplete = completedCount === meals.length;
  const nextMeal = meals.find((meal) => !checked[meal.id]);

  useEffect(() => {
    const payload = {
      day: { date: today, checked, completedMeals: meals.filter((meal) => checked[meal.id]).map((meal) => meal.id), score, streak },
      rewards,
    };
    localStorage.setItem('sondos-totti-plan', JSON.stringify(payload));
  }, [checked, rewards, score, streak, today]);

  const tottiMessage = useMemo(() => {
    if (allComplete) return 'واو! يوم كامل من الإنجاز! أنتِ بطلة حقيقية';
    if (completedCount === 0) return 'يلا يا سندس، نبدأ أول خطوة مع بعض؟';
    if (completedCount === 1) return 'أحسنتِ! أول خطوة هي الأهم يا بطلة';
    if (completedCount === 2) return 'شغل ممتاز! توتي فخور بيكي';
    return 'ممتاز جداً! توتي بيشجعك، فاضل القليل';
  }, [allComplete, completedCount]);

  const toggleMeal = (id: string): void => {
    const wasChecked = checked[id];
    setChecked((current) => ({ ...current, [id]: !current[id] }));
    if (!wasChecked && completedCount === meals.length - 1) {
      setStreak((current) => current + 1);
      setShowCelebration(true);
    }
  };

  const addReward = (): void => {
    if (!rewardTitle.trim()) return;
    setRewards((current) => [...current, { id: Date.now(), title: rewardTitle.trim(), note: 'مكافأة من صندوق بابا', unlocked: false }]);
    setRewardTitle('');
    setShowRewardForm(false);
  };

  return (
    <main dir="rtl" className="app-shell">
      <div className="topbar">
        <div className="brand-mark"><span className="brand-paw">✦</span><div><strong>توتي</strong><small>صديقك الصحي</small></div></div>
        <div className="topbar-actions"><button className="icon-button" aria-label="الإشعارات"><Bell size={19} /><i /></button><div className="profile-badge">س</div></div>
      </div>

      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> خطوتك الحلوة تبدأ اليوم</div>
          <h1>أهلاً يا <span>آنسة سندس!</span></h1>
          <p>أنتِ وتوتي في رحلة صحية نابضة بالحياة</p>
          <div className="date-chip"><CalendarDays size={16} /> {new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</div>
        </div>
        <div className="hero-totti hero-characters"><div className="sparkle sparkle-one">✦</div><div className="sparkle sparkle-two">✧</div><Totti pose="wave" /><Chick /></div>
      </section>

      <section className="stats-grid">
        <div className="stat-card score-stat"><div className="stat-icon pink-icon"><Zap size={21} fill="currentColor" /></div><div><strong>{score}<small>/ 100</small></strong><span>نقاط اليوم</span></div><div className="mini-progress"><span style={{ width: `${progress}%` }} /></div></div>
        <div className="stat-card"><div className="stat-icon orange-icon"><Flame size={21} fill="currentColor" /></div><div><strong>{streak}<small> أيام</small></strong><span>إنجاز متتالي</span></div><span className="stat-arrow">↗</span></div>
        <div className="stat-card"><div className="stat-icon blue-icon"><Utensils size={21} /></div><div><strong>{calories}<small> / 1700</small></strong><span>سعرة مكتملة</span></div></div>
      </section>

      <section className="progress-panel">
        <div className="progress-heading"><div><span className="section-kicker">رحلة اليوم</span><h2>مؤشر إنجازك</h2></div><div className="score-bubble">{score}<small>نقطة</small></div></div>
        <div className="big-progress"><div className="big-progress-fill" style={{ width: `${progress}%` }} /><div className="progress-star" style={{ right: `calc(${Math.max(progress, 8)}% - 18px)` }}><Star size={17} fill="currentColor" /></div></div>
        <div className="progress-footer"><span>بداية اليوم</span><strong>{allComplete ? 'اكتمل اليوم بنجاح!' : `${completedCount} من ${meals.length} وجبات مكتملة`}</strong><span>100</span></div>
        <div className="totti-message"><Totti pose="wink" /><div><b>توتي يقول:</b><p>{tottiMessage}</p></div><Heart size={19} className="message-heart" fill="currentColor" /></div>
      </section>

      <section className="meal-section">
        <div className="section-title-row"><div><span className="section-kicker">خطة التغذية</span><h2>وجباتك اليوم</h2></div><span className="target-pill"><span /> الهدف 1700 سعرة</span></div>
        <div className="meal-list">
          {meals.map((meal, index) => {
            const isDone = Boolean(checked[meal.id]);
            return <article className={`meal-card meal-card-${meal.accent} ${isDone ? 'meal-done' : ''}`} key={meal.id}>
              <div className={`meal-icon meal-${meal.accent}`}>{meal.icon}</div><div className="meal-totti"><Totti pose={index === 0 ? 'wave' : index === 2 ? 'wink' : 'happy'} /></div>
              <div className="meal-main"><div className="meal-topline"><div><span className="meal-label">{meal.label}</span><h3>{meal.title}</h3></div><div className="meal-time"><CalendarDays size={14} /> {meal.time}</div></div><ul>{meal.items.map((item) => <li key={item}><span />{item}</li>)}</ul></div>
              <div className="meal-side"><strong>{meal.calories}</strong><small>سعرة</small><button className={`check-button ${isDone ? 'checked' : ''}`} onClick={() => toggleMeal(meal.id)} aria-label={`تحديد ${meal.title}`}><Check size={22} strokeWidth={3} /></button></div>
              {isDone && <div className="done-ribbon">تمت <Check size={12} /></div>}
            </article>;
          })}
        </div>
      </section>

      <section className="bottom-grid">
        <div className="reward-card">
          <div className="card-heading"><div className="reward-heading-icon"><Gift size={21} /></div><div><span className="section-kicker">تحفيز خاص</span><h2>صندوق جوائز الأب السعيد</h2></div><Award size={24} className="heading-award" /></div>
          <p className="card-description">كل إنجاز يقربك من مفاجأة حلوة! بابا يجهز لك الجوائز.</p>
          <div className="rewards-list">{rewards.slice(0, 3).map((reward) => <div className={`reward-row ${reward.unlocked ? 'reward-unlocked' : ''}`} key={reward.id}><span className="reward-status">{reward.unlocked ? <Gift size={17} /> : <LockKeyhole size={16} />}</span><div><b>{reward.title}</b><small>{reward.note}</small></div><ChevronLeft size={17} /></div>)}</div>
          {showRewardForm ? <div className="reward-form"><input autoFocus value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} placeholder="اكتبي اسم المكافأة" onKeyDown={(event) => event.key === 'Enter' && addReward()} /><button onClick={addReward}>إضافة</button></div> : <button className="add-reward" onClick={() => setShowRewardForm(true)}><Plus size={17} /> إضافة مكافأة جديدة</button>}
        </div>
        <div className="tip-card"><div className="tip-icon"><CircleHelp size={25} /></div><span className="section-kicker">نصيحة توتي</span><h2>الماء سر النشاط!</h2><p>حاولي تشربي من 6 إلى 8 أكواب مياه على مدار اليوم، جسمك هيشكرك.</p><div className="water-drops"><span>💧</span><span>💧</span><span>💧</span><span>💧</span><span>+</span></div></div>
      </section>

      <footer><span>صُنع بحب لسندس وتوتي</span><span>تذكري: كل خطوة صغيرة انتصار كبير <Heart size={14} fill="currentColor" /></span></footer>

      <nav className="bottom-nav">{navigation.map(({ Icon, id, label }) => <button key={id} className={activeNav === id ? 'nav-active' : ''} onClick={() => setActiveNav(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>

      {showCelebration && <div className="celebration-overlay"><div className="confetti confetti-a" /><div className="confetti confetti-b" /><div className="celebration-modal"><button className="close-modal" onClick={() => setShowCelebration(false)}><X size={18} /></button><div className="celebration-badge"><Trophy size={39} /></div><Totti celebrate /><span className="section-kicker">إنجاز رائع!</span><h2>مبروك يا بطلة!</h2><p>خلصتي كل وجباتك اليوم. توتي بيحتفل بيكي وبيشجعك تكملي.</p><div className="celebration-score"><Sparkles size={18} /> +100 نقطة اليوم</div><button className="primary-button" onClick={() => setShowCelebration(false)}>نكمل الرحلة <ChevronLeft size={18} /></button></div></div>}
    </main>
  );
}

export default App;
