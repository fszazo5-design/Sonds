import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Activity,
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
  Music2,
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
import JumpRopeActivity, { type JumpRopeStats } from './components/JumpRopeActivity';
import favoriteSongVideo from './assets/favorite-song-with-sundus.mp4';

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

type PersistedPlan = { day?: SavedDay; rewards?: Reward[]; meals?: Meal[]; jumpRope?: JumpRopeStats; achievementVersion?: number };

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
  { Icon: CalendarDays, id: 'calendar', label: 'أوقاتي' },
  { Icon: Trophy, id: 'trophy', label: 'إنجازاتي' },
  { Icon: Activity, id: 'jump-rope', label: 'نط الحبل' },
  { Icon: Info, id: 'info', label: 'معلومات' },
];

const ACHIEVEMENT_SYSTEM_VERSION = 2;
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
  const isCurrentAchievementSystem = bootData.achievementVersion === ACHIEVEMENT_SYSTEM_VERSION;
  const [meals, setMeals] = useState<Meal[]>(bootData.meals ?? defaultMeals);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => isCurrentAchievementSystem && bootData.day?.date === today ? (bootData.day.checked || {}) : {});
  const [streak, setStreak] = useState(() => isCurrentAchievementSystem ? (bootData.day?.streak ?? 0) : 0);
  const [rewards, setRewards] = useState<Reward[]>(() => isCurrentAchievementSystem ? (bootData.rewards ?? []) : []);
  const [now, setNow] = useState(() => new Date());
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showPermissionSettings, setShowPermissionSettings] = useState(false);
  const [showFavoriteSong, setShowFavoriteSong] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [celebrationMeal, setCelebrationMeal] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState('home');
  const [jumpRopeStats, setJumpRopeStats] = useState<JumpRopeStats>(() => bootData.jumpRope ?? { sessions: 0, totalJumps: 0, bestJumps: 0 });
  const changePage = (page: string): void => {
    if (page === activeNav) return;
    setActiveNav(page);
    window.history.pushState({ appPage: page }, '', `#${page}`);
    window.scrollTo(0, 0);
  };

  const recordJumpRopeSession = (jumps: number): void => {
    setJumpRopeStats((current) => ({
      sessions: current.sessions + 1,
      totalJumps: current.totalJumps + jumps,
      bestJumps: Math.max(current.bestJumps, jumps),
    }));
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const pageFromHash = window.location.hash.slice(1);
    const initialPage = navigation.some((item) => item.id === pageFromHash) ? pageFromHash : 'home';
    setActiveNav(initialPage);
    window.history.replaceState({ appPage: initialPage }, '', `#${initialPage}`);
    const onPopState = (): void => {
      const page = window.location.hash.slice(1);
      setActiveNav(navigation.some((item) => item.id === page) ? page : 'home');
      setShowPermissionSettings(false);
      setCelebrationMeal(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPopState);
    window.__sondsHandleBack = (): boolean => {
      if (showPermissionSettings) {
        setShowPermissionSettings(false);
        return true;
      }
      if (celebrationMeal) {
        setCelebrationMeal(null);
        return true;
      }
      if (showFavoriteSong) {
        setShowFavoriteSong(false);
        return true;
      }
      if (activeNav !== 'home') {
        window.history.back();
        return true;
      }
      return false;
    };
    return () => {
      window.removeEventListener('popstate', onPopState);
      delete window.__sondsHandleBack;
    };
  }, [activeNav, celebrationMeal, showFavoriteSong, showPermissionSettings]);

  useEffect(() => {
    if (!celebrationMeal) return;
    const timer = window.setTimeout(() => setCelebrationMeal(null), 2600);
    return () => window.clearTimeout(timer);
  }, [celebrationMeal]);

  const completedCount = meals.filter((meal) => checked[meal.id]).length;
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const missedCount = meals.filter((meal) => {
    if (checked[meal.id]) return false;
    const [hour, minute] = meal.time.split(':').map(Number);
    return hour * 60 + minute < currentMinute;
  }).length;
  const maxScore = meals.length * 2;
  const score = completedCount * 2 - missedCount;
  const calories = meals.reduce((sum, meal) => sum + (checked[meal.id] ? meal.calories : 0), 0);
  const progress = maxScore > 0 ? Math.min(100, Math.max(0, (score / maxScore) * 100)) : 0;
  const allComplete = completedCount === meals.length;
  const nextMeal = meals.find((meal) => !checked[meal.id]);

  useEffect(() => {
    const payload = {
      day: { date: today, checked, completedMeals: meals.filter((meal) => checked[meal.id]).map((meal) => meal.id), score, streak },
      rewards,
      meals,
      jumpRope: jumpRopeStats,
      achievementVersion: ACHIEVEMENT_SYSTEM_VERSION,
    };
    try {
      localStorage.setItem('sondos-totti-plan', JSON.stringify(payload));
    } catch {
      // SQLite through the Android bridge remains the durable source on file-based WebView origins.
    }
    window.AndroidBridge?.saveState(JSON.stringify(payload));
  }, [checked, meals, rewards, jumpRopeStats, score, streak, today]);

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
    if (!wasChecked) {
      setCelebrationMeal(meals.find((meal) => meal.id === id)?.title ?? 'الوجبة');
      if (completedCount === meals.length - 1) setStreak((current) => current + 1);
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
        <div className="brand-mark"><span className="brand-paw">✦</span><div><strong>سندس دي أنا</strong><small>خطتي الصحية</small></div></div>
        <div className="topbar-actions"><button className="icon-button" aria-label="طلب إذن الإشعارات" onClick={() => window.AndroidBridge?.requestNotificationPermission()}><Bell size={19} /><i /></button><button className="icon-button update-button" type="button" aria-label="تحديث الواجهة" title="تحديث الواجهة" onClick={() => window.AndroidBridge?.refreshWebApp()}><Download size={16} /></button><button className="icon-button" aria-label="إعدادات الأذونات" onClick={() => setShowPermissionSettings(true)}><ShieldCheck size={19} /></button><div className="profile-badge">س</div></div>
      </div>

      {activeNav !== 'home' && <section className="page-heading"><div><span className="section-kicker">سندس دي أنا</span><h1>{navigation.find((item) => item.id === activeNav)?.label}</h1><p>{activeNav === 'calendar' ? 'عدّلي مواعيد وجباتك واحفظي أوقاتك اليومية.' : activeNav === 'trophy' ? 'تابعي تقدمك والجوائز التي حققتها.' : activeNav === 'jump-rope' ? 'تحدّي حركة ممتع بعد الإفطار، في صفحة مستقلة.' : 'معلومات ونصائح وإعدادات التطبيق.'}</p></div></section>}

      <section hidden={activeNav !== 'home'} className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> خطوتك الحلوة تبدأ اليوم</div>
          <h1>أهلاً يا <span>آنسة سندس!</span></h1>
          <p>أنتِ وتوتي في رحلة صحية نابضة بالحياة</p>
          <div className="hero-meta"><div className="date-chip"><CalendarDays size={16} /> {new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</div><div className="clock-chip"><div className="analog-clock" aria-label="ساعة متحركة"><span className="clock-hand clock-hour" style={{ transform: `rotate(${(now.getHours() % 12) * 30 + now.getMinutes() / 2}deg)` }} /><span className="clock-hand clock-minute" style={{ transform: `rotate(${now.getMinutes() * 6 + now.getSeconds() / 10}deg)` }} /><span className="clock-hand clock-second" style={{ transform: `rotate(${now.getSeconds() * 6}deg)` }} /><i /></div><div><strong>{new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}</strong><small>{nextMeal ? `الوجبة التالية: ${nextMeal.title} — ${formatMealTime(nextMeal.time)}` : 'اكتملت وجبات اليوم'}</small></div></div></div>
        </div>
        <div className="hero-totti hero-characters"><div className="sparkle sparkle-one">✦</div><div className="sparkle sparkle-two">✧</div><Totti pose="wave" /><Chick /></div>
      </section>

      <section hidden={activeNav !== 'home'} className="jump-rope-promo">
        <div className="jump-rope-promo-icon"><Activity size={21} /></div>
        <div className="jump-rope-promo-copy"><span className="section-kicker">بعد الإفطار</span><h2>جولة حبل ونجوم؟</h2><p>{checked.breakfast ? 'سجّلتي الفطار! اختاري وقتًا تكونين فيه مرتاحة وابدئي التحدي.' : 'بعد تسجيل الفطار، ستجدين هنا تحدّي نط الحبل الممتع.'}</p></div>
        <button type="button" onClick={() => changePage('jump-rope')}>افتحي التحدّي <ChevronLeft size={17} /></button>
      </section>

      <section hidden={activeNav !== 'home'} className="favorite-song-card">
        <div className="favorite-song-icon"><Music2 size={23} /></div>
        <div className="favorite-song-copy"><span className="section-kicker">لحظتنا الموسيقية</span><h2>أغنيتي المفضلة مع سندس</h2><p>شغّلي الفيديو واستمتعي بالأغنية مع كلماتها.</p></div>
        <button type="button" onClick={() => setShowFavoriteSong(true)}><Music2 size={17} /> عرض الفيديو</button>
      </section>

      <section hidden={activeNav !== 'home' && activeNav !== 'trophy'} className="stats-grid">
        <div className="stat-card score-stat"><div className="stat-icon pink-icon"><Zap size={21} fill="currentColor" /></div><div><strong>{score}<small>/ {maxScore}</small></strong><span>نقاط اليوم</span></div><div className="mini-progress"><span style={{ width: `${progress}%` }} /></div></div>
        <div className="stat-card"><div className="stat-icon orange-icon"><Flame size={21} fill="currentColor" /></div><div><strong>{streak}<small> أيام</small></strong><span>إنجاز متتالي</span></div><span className="stat-arrow">↗</span></div>
        <div className="stat-card"><div className="stat-icon blue-icon"><Utensils size={21} /></div><div><strong>{calories}<small> / 1700</small></strong><span>سعرة مكتملة</span></div></div>
      </section>

      <section hidden={activeNav !== 'home' && activeNav !== 'trophy'} className="progress-panel">
        <div className="progress-heading"><div><span className="section-kicker">رحلة اليوم</span><h2>مؤشر إنجازك</h2><small className="score-rules">+2 للإتمام، و−1 بعد فوات الموعد دون إنجاز</small></div><div className="score-bubble">{score}<small>نقطة</small></div></div>
        <div className="big-progress"><div className="big-progress-fill" style={{ width: `${progress}%` }} /><div className="progress-star" style={{ right: `calc(${Math.max(progress, 8)}% - 18px)` }}><Star size={17} fill="currentColor" /></div></div>
        <div className="progress-footer"><span>بداية اليوم</span><strong>{allComplete ? 'اكتمل اليوم بنجاح!' : `${completedCount} من ${meals.length} وجبات مكتملة${missedCount ? ` — ${missedCount} فائتة` : ''}`}</strong><span>{maxScore}</span></div>
        <div className="totti-message"><Totti pose="wink" /><div><b>توتي يقول:</b><p>{tottiMessage}</p></div><Heart size={19} className="message-heart" fill="currentColor" /></div>
      </section>

      <section hidden={activeNav !== 'calendar'} className="meal-section">
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

      <JumpRopeActivity active={activeNav === 'jump-rope'} breakfastComplete={Boolean(checked.breakfast)} stats={jumpRopeStats} onSessionComplete={recordJumpRopeSession} />

      <section hidden={activeNav !== 'trophy' && activeNav !== 'info'} className="bottom-grid single-panel">
        <div hidden={activeNav !== 'trophy'} className="reward-card">
          <div className="card-heading"><div className="reward-heading-icon"><Gift size={21} /></div><div><span className="section-kicker">تحفيز خاص</span><h2>صندوق الإنجازات</h2></div><Award size={24} className="heading-award" /></div>
          <p className="card-description">إنجازاتك الجديدة ستظهر هنا بعد البدء بنظام النقاط المحدّث.</p>
          <div className="rewards-list">{rewards.length === 0 ? <div className="empty-rewards">صندوق الإنجازات فارغ الآن. ابدئي وجمّعي نقاطك!</div> : rewards.slice(0, 3).map((reward) => <div className={`reward-row ${reward.unlocked ? 'reward-unlocked' : ''}`} key={reward.id}><span className="reward-status">{reward.unlocked ? <Gift size={17} /> : <LockKeyhole size={16} />}</span><div><b>{reward.title}</b><small>{reward.note}</small></div><ChevronLeft size={17} /></div>)}</div>
          {showRewardForm ? <div className="reward-form"><input autoFocus value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} placeholder="اكتبي اسم المكافأة" onKeyDown={(event) => event.key === 'Enter' && addReward()} /><button onClick={addReward}>إضافة</button></div> : <button className="add-reward" onClick={() => setShowRewardForm(true)}><Plus size={17} /> إضافة مكافأة جديدة</button>}
        </div>
        <div hidden={activeNav !== 'info'} className="tip-card"><div className="tip-icon"><CircleHelp size={25} /></div><span className="section-kicker">نصيحة توتي</span><h2>الماء سر النشاط!</h2><p>حاولي تشربي من 6 إلى 8 أكواب مياه على مدار اليوم، جسمك هيشكرك.</p><div className="water-drops"><span>💧</span><span>💧</span><span>💧</span><span>💧</span><span>+</span></div></div>
      </section>

      {activeNav === 'info' && <section className="info-actions-card"><span className="section-kicker">حول التطبيق</span><h2>سندس دي أنا</h2><p>خطتك الغذائية ومواعيد الوجبات محفوظة على هذا الجهاز. يمكنك إدارة التنبيهات والأذونات من هنا.</p><button type="button" onClick={() => setShowPermissionSettings(true)}><ShieldCheck size={18} /> إعدادات الجهاز والتنبيهات</button></section>}

      <footer hidden={activeNav !== 'home'}><span>صُنع بحب لسندس وتوتي</span><span>تذكري: كل خطوة صغيرة انتصار كبير <Heart size={14} fill="currentColor" /></span></footer>

      {showPermissionSettings && <div className="celebration-overlay permission-overlay"><section className="permission-modal" role="dialog" aria-modal="true" aria-labelledby="permission-title"><button className="close-modal" onClick={() => setShowPermissionSettings(false)} aria-label="إغلاق"><X size={18} /></button><div className="permission-icon"><ShieldCheck size={27} /></div><span className="section-kicker">إعدادات الجهاز</span><h2 id="permission-title">الأذونات والتنبيهات</h2><p>يظهر طلب السماح تلقائيًا عند فتح التطبيق، ويمكنك إعادة طلبه من هنا.</p><div className="permission-actions"><button onClick={() => window.AndroidBridge?.checkForAppUpdate()}><Download size={19} /><span><b>تحديث نظام Android (APK)</b><small>للتغييرات الأصلية في Kotlin أو أذونات الجهاز فقط</small></span></button><button onClick={() => window.AndroidBridge?.requestNotificationPermission()}><Bell size={19} /><span><b>السماح بتنبيهات الوجبات</b><small>تذكير محلي في موعد كل وجبة</small></span></button><button onClick={() => window.AndroidBridge?.requestExactAlarmAccess()}><Clock size={19} /><span><b>ضبط دقة مواعيد التنبيه</b><small>يفتح إعدادات المنبهات الدقيقة في Android</small></span></button><button onClick={() => window.AndroidBridge?.requestCameraPermission()}><Camera size={19} /><span><b>إذن الكاميرا</b><small>السماح باستخدام الكاميرا عند الحاجة</small></span></button><button onClick={() => window.AndroidBridge?.requestMicrophonePermission()}><Mic size={19} /><span><b>إذن الميكروفون</b><small>السماح باستخدام الميكروفون عند الحاجة</small></span></button></div></section></div>}

      {showFavoriteSong && <div className="celebration-overlay favorite-song-overlay" onClick={() => setShowFavoriteSong(false)}><section className="favorite-song-modal" role="dialog" aria-modal="true" aria-labelledby="favorite-song-title" onClick={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setShowFavoriteSong(false)} aria-label="إغلاق الفيديو"><X size={18} /></button><div className="favorite-song-modal-heading"><div className="favorite-song-icon"><Music2 size={22} /></div><div><span className="section-kicker">أغنية سندس</span><h2 id="favorite-song-title">أغنيتي المفضلة مع سندس</h2></div></div><video className="favorite-song-video" controls playsInline preload="metadata" src={favoriteSongVideo} /><p className="favorite-song-caption">استمتعي بالمشاهدة والاستماع مع كلمات الأغنية.</p></section></div>}

      <nav className="bottom-nav" aria-label="التنقل بين صفحات التطبيق">{navigation.map(({ Icon, id, label }) => <button key={id} aria-current={activeNav === id ? 'page' : undefined} className={`nav-item-${id} ${activeNav === id ? 'nav-active' : ''}`} onClick={() => changePage(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>

      {celebrationMeal && <div className="celebration-overlay"><div className="star-sparks" aria-hidden="true"><span>✦</span><span>★</span><span>✧</span><span>✦</span><span>★</span><span>✧</span><span>✦</span><span>★</span><span>✧</span><span>✦</span><span>★</span><span>✧</span></div><div className="celebration-modal" role="dialog" aria-modal="true" aria-label="تهنئة إتمام الوجبة"><button className="close-modal" onClick={() => setCelebrationMeal(null)} aria-label="إغلاق التهنئة"><X size={18} /></button><div className="applause-emoji" aria-hidden="true">👏</div><Totti celebrate /><span className="section-kicker">تصفيق لكِ!</span><h2>أحسنتِ يا بطلة!</h2><p>أتممتِ {celebrationMeal} بنجاح. استمري في رحلتك!</p><div className="celebration-score"><Sparkles size={18} /> +2 نقطة إنجاز</div><button className="primary-button" onClick={() => setCelebrationMeal(null)}>رائع! <ChevronLeft size={18} /></button></div></div>}
    </main>
  );
}

export default App;
