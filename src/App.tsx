import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Award,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  Camera,
  Clock,
  CircleHelp,
  Download,
  Flame,
  Gift,
  Heart,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Mic,
  Plus,
  Sparkles,
  Star,
  ShieldCheck,
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

const defaultMeals: Meal[] = [
  {
    id: 'breakfast',
    title: 'الفطار',
    label: 'البداية القوية',
    time: '08:00',
    calories: 420,
    accent: 'pink',
    icon: '☀',
    items: ['بيضة واحدة', '100 جم جبنة قريش', '40 جم عيش بلدي', 'خيار وطماطم وخس', 'ملعقة صغيرة زيت زيتون'],
  },
  {
    id: 'snack-1',
    title: 'سناك 1',
    label: 'وقت الطاقة',
    time: '11:00',
    calories: 175,
    accent: 'yellow',
    icon: '◒',
    items: ['150 جم زبادي طبيعي غير محلى', 'ثمرة فاكهة متوسطة (مثل تفاحة)'],
  },
  {
    id: 'lunch',
    title: 'الغداء',
    label: 'وجبة الأبطال',
    time: '14:30',
    calories: 530,
    accent: 'blue',
    icon: '✦',
    items: ['120 جم فراخ مشوية أو مطهية', 'سلطة بروتين (تونة / بيض / جبنة قريش)', '100–120 جم رز مطبوخ أو 120–150 جم مكرونة', 'طبق سلطة كبير + ملعقة صغيرة زيت زيتون'],
  },
  {
    id: 'snack-2',
    title: 'سناك 2',
    label: 'استراحة لذيذة',
    time: '17:30',
    calories: 100,
    accent: 'green',
    icon: '●',
    items: ['150 جم زبادي طبيعي غير محلى'],
  },
  {
    id: 'dinner',
    title: 'العشاء',
    label: 'نهاية مريحة',
    time: '20:00',
    calories: 435,
    accent: 'orange',
    icon: '☾',
    items: ['بيضة واحدة', '150 جم جبنة قريش', 'خيار وطماطم وخس', '40 جم عيش بلدي', 'ملعقة صغيرة زيت زيتون'],
  },
];

const getToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const formatMealTime = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(value);
};
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

type PersistedPlan = { day?: SavedDay; rewards?: Reward[]; meals?: Meal[] };
const readSavedPlan = (): PersistedPlan => {
  try {
    const nativeData = typeof window !== 'undefined' ? window.AndroidBridge?.loadState() : '';
    const saved = nativeData || (typeof localStorage !== 'undefined' ? localStorage.getItem('sondos-totti-plan') : null);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as PersistedPlan;
    return {
      ...parsed,
      meals: Array.isArray(parsed.meals) && parsed.meals.length ? parsed.meals : undefined,
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : undefined,
    };
  } catch {
    return {};
  }
};

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
  const [bootData] = useState(readSavedPlan);
  const [meals, setMeals] = useState<Meal[]>(bootData.meals ?? defaultMeals);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => bootData.day?.date === today ? (bootData.day.checked || {}) : {});
  const [streak, setStreak] = useState(bootData.day?.streak || 6);
  const [rewards, setRewards] = useState<Reward[]>(bootData.rewards?.length ? bootData.rewards : defaultRewards);
  const [now, setNow] = useState(() => new Date());
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showPermissionSettings, setShowPermissionSettings] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeNav, setActiveNav] = useState('home');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
      meals,
    };
    try {
      localStorage.setItem('sondos-totti-plan', JSON.stringify(payload));
    } catch {
      // SQLite through the Android bridge remains the durable source on file-based WebView origins.
    }
    window.AndroidBridge?.saveState(JSON.stringify(payload));
  }, [checked, meals, rewards, score, streak, today]);

  useEffect(() => {
    window.AndroidBridge?.saveSchedule(JSON.stringify(meals.map(({ id, title, time }) => ({ id, title, time }))));
  }, [meals]);

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
        <div className="topbar-actions"><button className="icon-button" aria-label="طلب إذن الإشعارات" onClick={() => window.AndroidBridge?.requestNotificationPermission()}><Bell size={19} /><i /></button><button className="icon-button" aria-label="إعدادات الأذونات" onClick={() => setShowPermissionSettings(true)}><ShieldCheck size={19} /></button><div className="profile-badge">س</div></div>
      </div>

      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> خطوتك الحلوة تبدأ اليوم</div>
          <h1>أهلاً يا <span>آنسة سندس!</span></h1>
          <p>أنتِ وتوتي في رحلة صحية نابضة بالحياة</p>
          <div className="hero-meta"><div className="date-chip"><CalendarDays size={16} /> {new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</div><div className="clock-chip"><div className="analog-clock" aria-label="ساعة متحركة"><span className="clock-hand clock-hour" style={{ transform: `rotate(${(now.getHours() % 12) * 30 + now.getMinutes() / 2}deg)` }} /><span className="clock-hand clock-minute" style={{ transform: `rotate(${now.getMinutes() * 6 + now.getSeconds() / 10}deg)` }} /><span className="clock-hand clock-second" style={{ transform: `rotate(${now.getSeconds() * 6}deg)` }} /><i /></div><div><strong>{new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}</strong><small>{nextMeal ? `الوجبة التالية: ${nextMeal.title} — ${formatMealTime(nextMeal.time)}` : 'اكتملت وجبات اليوم'}</small></div></div></div>
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
              <div className="meal-main"><div className="meal-topline"><div><span className="meal-label">{meal.label}</span><h3>{meal.title}</h3></div><label className="meal-time"><Clock size={15} /><input className="meal-time-input" type="time" value={meal.time} aria-label={`موعد ${meal.title}`} onChange={(event) => setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, time: event.target.value } : item))} /><span className="meal-time-readable">{formatMealTime(meal.time)}</span></label></div><ul>{meal.items.map((item) => <li key={item}><span />{item}</li>)}</ul></div>
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

      {showPermissionSettings && <div className="celebration-overlay permission-overlay"><section className="permission-modal" role="dialog" aria-modal="true" aria-labelledby="permission-title"><button className="close-modal" onClick={() => setShowPermissionSettings(false)} aria-label="إغلاق"><X size={18} /></button><div className="permission-icon"><ShieldCheck size={27} /></div><span className="section-kicker">إعدادات الجهاز</span><h2 id="permission-title">الأذونات والتنبيهات</h2><p>نطلب كل إذن عند اختيارك له. الكاميرا والميكروفون غير مستخدمين حاليًا داخل الخطة.</p><div className="permission-actions"><button onClick={() => window.AndroidBridge?.checkForAppUpdate()}><Download size={19} /><span><b>فحص تحديث التطبيق من GitHub</b><small>تنزيل الإصدار الأحدث ثم تأكيد تثبيته من Android</small></span></button><button onClick={() => window.AndroidBridge?.requestNotificationPermission()}><Bell size={19} /><span><b>السماح بتنبيهات الوجبات</b><small>تذكير محلي في موعد كل وجبة</small></span></button><button onClick={() => window.AndroidBridge?.requestExactAlarmAccess()}><Clock size={19} /><span><b>ضبط دقة مواعيد التنبيه</b><small>يفتح إعدادات المنبهات الدقيقة في Android</small></span></button><button onClick={() => window.AndroidBridge?.requestCameraPermission()}><Camera size={19} /><span><b>إذن الكاميرا</b><small>لا يُطلب إلا عند ضغط هذا الخيار</small></span></button><button onClick={() => window.AndroidBridge?.requestMicrophonePermission()}><Mic size={19} /><span><b>إذن الميكروفون</b><small>لا يُطلب إلا عند ضغط هذا الخيار</small></span></button></div></section></div>}

      <nav className="bottom-nav">{navigation.map(({ Icon, id, label }) => <button key={id} className={activeNav === id ? 'nav-active' : ''} onClick={() => setActiveNav(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>

      {showCelebration && <div className="celebration-overlay"><div className="confetti confetti-a" /><div className="confetti confetti-b" /><div className="celebration-modal"><button className="close-modal" onClick={() => setShowCelebration(false)}><X size={18} /></button><div className="celebration-badge"><Trophy size={39} /></div><Totti celebrate /><span className="section-kicker">إنجاز رائع!</span><h2>مبروك يا بطلة!</h2><p>خلصتي كل وجباتك اليوم. توتي بيحتفل بيكي وبيشجعك تكملي.</p><div className="celebration-score"><Sparkles size={18} /> +100 نقطة اليوم</div><button className="primary-button" onClick={() => setShowCelebration(false)}>نكمل الرحلة <ChevronLeft size={18} /></button></div></div>}
    </main>
  );
}

export default App;
