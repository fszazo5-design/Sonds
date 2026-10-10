import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  Camera,
  Clock,
  Download,
  Droplets,
  Flame,
  Gift,
  Heart,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Mic,
  Music2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Star,
  ShieldCheck,
  Trophy,
  Utensils,
  Volume2,
  VolumeX,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react';
import ActivityGames, { type ActivityGameStats, type CustomActivity, type GameReminderSettings } from './components/ActivityGames';
import WaterTrackerPage, { type WaterTrackingData } from './components/WaterTrackerPage';
import { chooseMealMessage, getMealMessageCategory } from './components/mealMessages';
import favoriteSongVideo from './assets/favorite-song-with-sundus.mp4';
import startupVideo from './assets/startup-video.mp4';
import startupIntroPoster from './assets/startup-intro-poster.jpg';

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

type MealDraft = { title: string; label: string; time: string; calories: string; items: string };

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

type PersistedPlan = { day?: SavedDay; rewards?: Reward[]; meals?: Meal[]; jumpRope?: { sessions: number; totalJumps: number; bestJumps: number }; activityGames?: ActivityGameStats; customActivities?: CustomActivity[]; gameReminders?: GameReminderSettings; water?: WaterTrackingData; mealMessages?: Record<string, string>; achievementVersion?: number };

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
  { Icon: Activity, id: 'games', label: 'ألعابي' },
  { Icon: Info, id: 'info', label: 'معلومات' },
];
const isKnownPage = (page: string): boolean => page === 'water' || navigation.some((item) => item.id === page);

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

function App() {
  const today = getToday();
  const [bootData] = useState(readSavedPlan);
  const isCurrentAchievementSystem = bootData.achievementVersion === ACHIEVEMENT_SYSTEM_VERSION;
  const [meals, setMeals] = useState<Meal[]>(bootData.meals ?? defaultMeals);
  const [mealEditor, setMealEditor] = useState<{ mealId: string | null; draft: MealDraft } | null>(null);
  const [mealEditorError, setMealEditorError] = useState('');
  const [mealSaveNotice, setMealSaveNotice] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>(() => isCurrentAchievementSystem && bootData.day?.date === today ? (bootData.day.checked || {}) : {});
  const [streak, setStreak] = useState(() => isCurrentAchievementSystem ? (bootData.day?.streak ?? 0) : 0);
  const [rewards, setRewards] = useState<Reward[]>(() => isCurrentAchievementSystem ? (bootData.rewards ?? []) : []);
  const [now, setNow] = useState(() => new Date());
  const startupVideoRef = useRef<HTMLVideoElement>(null);
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const [startupAudioEnabled, setStartupAudioEnabled] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showPermissionSettings, setShowPermissionSettings] = useState(false);
  const [showFavoriteSong, setShowFavoriteSong] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [celebrationMeal, setCelebrationMeal] = useState<{ title: string; message: string } | null>(null);
  const [activeNav, setActiveNav] = useState('home');
  const [activityGameStats, setActivityGameStats] = useState<ActivityGameStats>(() => bootData.activityGames ?? { sessions: bootData.jumpRope?.sessions ?? 0, totalReps: bootData.jumpRope?.totalJumps ?? 0, bestReps: bootData.jumpRope?.bestJumps ?? 0 });
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>(() => bootData.customActivities ?? []);
  const [gameReminders, setGameReminders] = useState<GameReminderSettings>(() => bootData.gameReminders ?? {});
  const [mealMessages, setMealMessages] = useState<Record<string, string>>(() => bootData.mealMessages ?? {});
  const [waterData, setWaterData] = useState<WaterTrackingData>(() => ({
    dailyGoal: Math.min(16, Math.max(4, bootData.water?.dailyGoal ?? 8)),
    cupsByDate: bootData.water?.cupsByDate ?? {},
    weightByDate: bootData.water?.weightByDate ?? {},
    remindersEnabled: bootData.water?.remindersEnabled ?? true,
    reminderTimes: Array.isArray(bootData.water?.reminderTimes) ? bootData.water.reminderTimes : ['10:00', '13:00', '16:00', '19:00'],
  }));
  const changePage = (page: string, replace = false): void => {
    if (page === activeNav) return;
    setActiveNav(page);
    window.history[replace ? 'replaceState' : 'pushState']({ appPage: page }, '', `#${page}`);
    window.scrollTo(0, 0);
  };

  const recordActivityGame = (reps: number): void => {
    setActivityGameStats((current) => ({
      sessions: current.sessions + 1,
      totalReps: current.totalReps + reps,
      bestReps: Math.max(current.bestReps, reps),
    }));
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const pageFromHash = window.location.hash.slice(1);
    const initialPage = isKnownPage(pageFromHash) ? pageFromHash : 'home';
    setActiveNav(initialPage);
    window.history.replaceState({ appPage: initialPage }, '', `#${initialPage}`);
    const onPopState = (): void => {
      const page = window.location.hash.slice(1);
      setActiveNav(isKnownPage(page) ? page : 'home');
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
    const timer = window.setTimeout(() => setCelebrationMeal(null), 6000);
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
      jumpRope: bootData.jumpRope,
      activityGames: activityGameStats,
      customActivities,
      gameReminders,
      water: waterData,
      mealMessages,
      achievementVersion: ACHIEVEMENT_SYSTEM_VERSION,
    };
    try {
      localStorage.setItem('sondos-totti-plan', JSON.stringify(payload));
    } catch {
      // SQLite through the Android bridge remains the durable source on file-based WebView origins.
    }
    window.AndroidBridge?.saveState(JSON.stringify(payload));
  }, [checked, meals, rewards, activityGameStats, customActivities, gameReminders, bootData.jumpRope, waterData, mealMessages, score, streak, today]);

  useEffect(() => {
    const waterReminders = waterData.remindersEnabled
      ? waterData.reminderTimes.map((time) => ({ id: `water-reminder-${time.replace(':', '-')}`, title: 'شرب الماء', time }))
      : [];
    const gameSchedule = Object.entries(gameReminders)
      .filter(([, reminder]) => reminder.enabled && /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time))
      .map(([gameId, reminder]) => ({ id: `game-${gameId}`, title: customActivities.find((game) => game.id === gameId)?.title ?? ({ pushups: 'ضغط على الحائط', plank: 'تحدّي البلانك', squats: 'قرفصاء الكرسي', dance: 'رقصة النجوم', stretch: 'تمدد وراحة' }[gameId] ?? 'لعبتك اليومية'), time: reminder.time }));
    window.AndroidBridge?.saveSchedule(JSON.stringify([...meals.map(({ id, title, time }) => ({ id, title, time })), ...waterReminders, ...gameSchedule]));
  }, [meals, waterData.remindersEnabled, waterData.reminderTimes, gameReminders, customActivities]);



  const startMealEdit = (meal: Meal): void => {
    setMealEditor({ mealId: meal.id, draft: { title: meal.title, label: meal.label, time: meal.time, calories: String(meal.calories), items: meal.items.join('\n') } });
    setMealEditorError('');
  };

  const startMealAdd = (): void => {
    setMealEditor({ mealId: null, draft: { title: '', label: 'وجبة جديدة', time: '12:00', calories: '0', items: '' } });
    setMealEditorError('');
  };

  const saveMealEdit = (): void => {
    if (!mealEditor) return;
    const title = mealEditor.draft.title.trim();
    const caloriesValue = Number(mealEditor.draft.calories);
    if (!title) { setMealEditorError('اكتبي اسم الوجبة أولاً.'); return; }
    if (!Number.isFinite(caloriesValue) || caloriesValue < 0) { setMealEditorError('أدخلي سعرات صحيحة (صفر أو أكثر).'); return; }
    const updated = {
      title,
      label: mealEditor.draft.label.trim() || 'وجبة',
      time: mealEditor.draft.time,
      calories: Math.round(caloriesValue),
      items: mealEditor.draft.items.split('\n').map((item) => item.trim()).filter(Boolean),
    };
    if (mealEditor.mealId) {
      setMeals((current) => current.map((meal) => meal.id === mealEditor.mealId ? { ...meal, ...updated } : meal));
    } else {
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setMeals((current) => [...current, { id, ...updated, accent: 'pink', icon: '✦' }]);
    }
    setMealEditor(null);
    setMealEditorError('');
    setMealSaveNotice('تم حفظ الوجبة على هذا الجهاز.');
    window.setTimeout(() => setMealSaveNotice(''), 3000);
  };

  const moveMeal = (mealId: string, offset: -1 | 1): void => {
    setMeals((current) => {
      const from = current.findIndex((meal) => meal.id === mealId);
      const to = from + offset;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const reordered = [...current];
      [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
      return reordered;
    });
    setMealSaveNotice('تم تحديث ترتيب الوجبات وحفظه على هذا الجهاز.');
    window.setTimeout(() => setMealSaveNotice(''), 3000);
  };

  const renderMealEditor = () => mealEditor && (
    <div className="meal-editor-card" role="group" aria-label={mealEditor.mealId ? 'تعديل بيانات الوجبة' : 'إضافة وجبة جديدة'}>
      <div className="meal-editor-heading"><div><span className="section-kicker">بيانات الوجبة</span><h3>{mealEditor.mealId ? 'تعديل الوجبة' : 'إضافة وجبة جديدة'}</h3></div></div>
      <div className="meal-editor-fields">
        <label>اسم الوجبة<input autoFocus value={mealEditor.draft.title} onChange={(event) => setMealEditor((current) => current ? { ...current, draft: { ...current.draft, title: event.target.value } } : current)} placeholder="مثال: وجبة خفيفة" /></label>
        <label>وصف قصير<input value={mealEditor.draft.label} onChange={(event) => setMealEditor((current) => current ? { ...current, draft: { ...current.draft, label: event.target.value } } : current)} placeholder="مثال: وجبة بعد التمرين" /></label>
        <label>الموعد<input type="time" value={mealEditor.draft.time} onChange={(event) => setMealEditor((current) => current ? { ...current, draft: { ...current.draft, time: event.target.value } } : current)} /></label>
        <label>السعرات الحرارية<input type="number" min="0" step="1" inputMode="numeric" value={mealEditor.draft.calories} onChange={(event) => setMealEditor((current) => current ? { ...current, draft: { ...current.draft, calories: event.target.value } } : current)} /></label>
        <label className="meal-items-field">مكونات الوجبة <small>اكتبي كل مكوّن في سطر منفصل</small><textarea rows={5} value={mealEditor.draft.items} onChange={(event) => setMealEditor((current) => current ? { ...current, draft: { ...current.draft, items: event.target.value } } : current)} placeholder={'مكوّن أول\nمكوّن ثانٍ'} /></label>
      </div>
      {mealEditorError && <p className="meal-editor-error" role="alert">{mealEditorError}</p>}
      <div className="meal-editor-actions"><button type="button" className="meal-save-button" onClick={saveMealEdit}><Save size={16} /> حفظ على الجهاز</button><button type="button" className="meal-cancel-button" onClick={() => { setMealEditor(null); setMealEditorError(''); }}>إلغاء</button></div>
    </div>
  );

  const toggleMeal = (id: string): void => {
    const wasChecked = checked[id];
    setChecked((current) => ({ ...current, [id]: !current[id] }));
    if (!wasChecked) {
      const meal = meals.find((item) => item.id === id);
      const messageKey = `${today}:${id}`;
      const alreadyShown = Object.entries(mealMessages)
        .filter(([key]) => key.startsWith(`${today}:`) && key !== messageKey)
        .map(([, message]) => message);
      const message = chooseMealMessage(getMealMessageCategory(id), alreadyShown);
      setMealMessages((current) => ({ ...current, [messageKey]: message }));
      setCelebrationMeal({ title: meal?.title ?? 'الوجبة', message });
      if (completedCount === meals.length - 1) setStreak((current) => current + 1);
    } else {
      setMealMessages((current) => {
        const next = { ...current };
        delete next[`${today}:${id}`];
        return next;
      });
      setCelebrationMeal(null);
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
      {showStartupSplash && (
        <section className="startup-splash" role="dialog" aria-modal="true" aria-label="شاشة بدء سندس">
          <video
            ref={startupVideoRef}
            className="startup-splash-video"
            autoPlay
            muted={!startupAudioEnabled}
            playsInline
            preload="auto"
            poster={startupIntroPoster}
            onEnded={() => setShowStartupSplash(false)}
            onError={() => setShowStartupSplash(false)}
            aria-hidden="true"
          >
            <source src={startupVideo} type="video/mp4" />
          </video>
          <div className="startup-splash-controls">
            <button
              type="button"
              className="startup-splash-control"
              aria-label={startupAudioEnabled ? 'كتم صوت الفيديو' : 'تشغيل صوت الفيديو'}
              aria-pressed={startupAudioEnabled}
              onClick={() => {
                const enableAudio = !startupAudioEnabled;
                if (startupVideoRef.current) startupVideoRef.current.muted = !enableAudio;
                setStartupAudioEnabled(enableAudio);
              }}
            >
              {startupAudioEnabled ? <Volume2 size={21} /> : <VolumeX size={21} />}
            </button>
            <button
              type="button"
              className="startup-splash-control"
              aria-label="تخطي والدخول إلى التطبيق"
              onClick={() => setShowStartupSplash(false)}
            >
              <X size={21} />
            </button>
          </div>
        </section>
      )}
      <div className="topbar">
        <div className="brand-mark"><span className="brand-paw">✦</span><div><strong>سندس دي أنا</strong><small>خطتي الصحية</small></div></div>
        <div className="topbar-actions"><button className="icon-button" aria-label="طلب إذن الإشعارات" onClick={() => window.AndroidBridge?.requestNotificationPermission()}><Bell size={19} /><i /></button><button className="icon-button update-button" type="button" aria-label="تحديث الواجهة" title="تحديث الواجهة" onClick={() => window.AndroidBridge?.refreshWebApp()}><Download size={16} /></button><button className="icon-button" aria-label="إعدادات الأذونات" onClick={() => setShowPermissionSettings(true)}><ShieldCheck size={19} /></button><div className="profile-badge">س</div></div>
      </div>

      {activeNav !== 'home' && <section className="page-heading"><div><span className="section-kicker">سندس دي أنا</span><h1>{activeNav === 'water' ? 'متابعة شرب الماء' : navigation.find((item) => item.id === activeNav)?.label}</h1><p>{activeNav === 'calendar' ? 'عدّلي مواعيد وجباتك واحفظي أوقاتك اليومية.' : activeNav === 'trophy' ? 'تابعي تقدمك والجوائز التي حققتها.' : activeNav === 'games' ? 'اختاري لعبة حركة مرحة، أو أضيفي لعبتك الخاصة.' : activeNav === 'water' ? 'سجلّ لطيف لأكوابك وأيامك وتنبيهاتك.' : 'معلومات ونصائح وإعدادات التطبيق.'}</p></div></section>}

      <section hidden={activeNav !== 'home'} className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> خطوتك الحلوة تبدأ اليوم</div>
          <h1>أهلاً يا <span>آنسة سندس!</span></h1>
          <p>أنتِ في رحلة صحية نابضة بالحياة</p>
          <div className="hero-meta"><div className="date-chip"><CalendarDays size={16} /> {new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</div><div className="clock-chip"><div className="analog-clock" aria-label="ساعة متحركة"><span className="clock-hand clock-hour" style={{ transform: `rotate(${(now.getHours() % 12) * 30 + now.getMinutes() / 2}deg)` }} /><span className="clock-hand clock-minute" style={{ transform: `rotate(${now.getMinutes() * 6 + now.getSeconds() / 10}deg)` }} /><span className="clock-hand clock-second" style={{ transform: `rotate(${now.getSeconds() * 6}deg)` }} /><i /></div><div><strong>{new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}</strong><small>{nextMeal ? `الوجبة التالية: ${nextMeal.title} — ${formatMealTime(nextMeal.time)}` : 'اكتملت وجبات اليوم'}</small></div></div></div>
        </div>
      </section>

      <section hidden={activeNav !== 'home'} className="jump-rope-promo games-home-promo">
        <div className="jump-rope-promo-icon"><Activity size={21} /></div>
        <div className="jump-rope-promo-copy"><span className="section-kicker">وقت ممتع لنفسك</span><h2>ألعاب حركة ونجوم!</h2><p>جرّبي الضغط والبلانك والرقص وتمارين لطيفة، أو أضيفي لعبتك الخاصة.</p></div>
        <button type="button" onClick={() => changePage('games')}>اختاري لعبة <ChevronLeft size={17} /></button>
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
        <div className="totti-message"><div><b>رسالة اليوم</b><p>{allComplete ? 'واو! يوم كامل من الإنجاز! أنتِ بطلة حقيقية' : completedCount === 0 ? 'يلا يا سندس، نبدأ أول خطوة؟' : completedCount === 1 ? 'أحسنتِ! أول خطوة هي الأهم يا بطلة' : 'شغل ممتاز! استمري، فاضل القليل'}</p></div><Heart size={19} className="message-heart" fill="currentColor" /></div>
      </section>

      <section hidden={activeNav !== 'calendar'} className="meal-section">
        <div className="section-title-row"><div><span className="section-kicker">خطة التغذية</span><h2>وجباتك اليوم</h2></div><div className="meal-list-actions"><span className="target-pill"><span /> الهدف 1700 سعرة</span><button type="button" className="add-meal-button" onClick={startMealAdd}><Plus size={17} /> إضافة وجبة</button></div></div>
        <div className="meal-list">
          {meals.map((meal, index) => {
            const isDone = Boolean(checked[meal.id]);
            if (mealEditor?.mealId === meal.id) return <div className="meal-editor-card-wrap" key={meal.id}>{renderMealEditor()}</div>;
            return <article className={`meal-card meal-card-${meal.accent} ${isDone ? 'meal-done' : ''}`} key={meal.id}>
              <div className={`meal-icon meal-${meal.accent}`}>{meal.icon}</div>
              <div className="meal-main"><div className="meal-topline"><div><span className="meal-label">{meal.label}</span><h3>{meal.title}</h3></div><label className="meal-time"><Clock size={15} /><input className="meal-time-input" type="time" value={meal.time} aria-label={`موعد ${meal.title}`} onChange={(event) => setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, time: event.target.value } : item))} /><span className="meal-time-readable">{formatMealTime(meal.time)}</span></label></div><ul>{meal.items.map((item, itemIndex) => <li key={`${meal.id}-${itemIndex}`}><span />{item}</li>)}</ul>{isDone && mealMessages[`${today}:${meal.id}`] && <div className="meal-message-card"><span className="meal-message-heart"><Heart size={15} fill="currentColor" /></span><div><b>رسالة حب من بابا سعيد</b><p>{mealMessages[`${today}:${meal.id}`]}</p></div><Sparkles size={15} className="meal-message-sparkle" /></div>}</div>
              <div className="meal-side"><div className="meal-order-controls"><button type="button" onClick={() => moveMeal(meal.id, -1)} disabled={index === 0} aria-label={`رفع ${meal.title} في الترتيب`} title="تحريك لأعلى"><ArrowUp size={15} /></button><button type="button" onClick={() => moveMeal(meal.id, 1)} disabled={index === meals.length - 1} aria-label={`خفض ${meal.title} في الترتيب`} title="تحريك لأسفل"><ArrowDown size={15} /></button><button type="button" onClick={() => startMealEdit(meal)} aria-label={`تعديل ${meal.title}`} title="تعديل الوجبة"><Pencil size={15} /></button></div><strong>{meal.calories}</strong><small>سعرة</small><button className={`check-button ${isDone ? 'checked' : ''}`} onClick={() => toggleMeal(meal.id)} aria-label={`تحديد ${meal.title}`}><Check size={22} strokeWidth={3} /></button></div>
              {isDone && <div className="done-ribbon">تمت <Check size={12} /></div>}
            </article>;
          })}
          {mealEditor?.mealId === null && renderMealEditor()}
        </div>
        {mealSaveNotice && <p className="meal-save-notice" role="status" aria-live="polite">{mealSaveNotice}</p>}
      </section>

      <ActivityGames active={activeNav === 'games'} customGames={customActivities} reminders={gameReminders} onRemindersChange={setGameReminders} stats={activityGameStats} onCustomGamesChange={setCustomActivities} onComplete={recordActivityGame} />

      <section hidden={activeNav !== 'trophy' && activeNav !== 'info'} className="bottom-grid single-panel">
        <div hidden={activeNav !== 'trophy'} className="reward-card">
          <div className="card-heading"><div className="reward-heading-icon"><Gift size={21} /></div><div><span className="section-kicker">تحفيز خاص</span><h2>صندوق الإنجازات</h2></div><Award size={24} className="heading-award" /></div>
          <p className="card-description">إنجازاتك الجديدة ستظهر هنا بعد البدء بنظام النقاط المحدّث.</p>
          <div className="rewards-list">{rewards.length === 0 ? <div className="empty-rewards">صندوق الإنجازات فارغ الآن. ابدئي وجمّعي نقاطك!</div> : rewards.slice(0, 3).map((reward) => <div className={`reward-row ${reward.unlocked ? 'reward-unlocked' : ''}`} key={reward.id}><span className="reward-status">{reward.unlocked ? <Gift size={17} /> : <LockKeyhole size={16} />}</span><div><b>{reward.title}</b><small>{reward.note}</small></div><ChevronLeft size={17} /></div>)}</div>
          {showRewardForm ? <div className="reward-form"><input autoFocus value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} placeholder="اكتبي اسم المكافأة" onKeyDown={(event) => event.key === 'Enter' && addReward()} /><button onClick={addReward}>إضافة</button></div> : <button className="add-reward" onClick={() => setShowRewardForm(true)}><Plus size={17} /> إضافة مكافأة جديدة</button>}
        </div>
        <button hidden={activeNav !== 'info'} type="button" className="water-info-card" onClick={() => changePage('water')}><span className="water-info-visual"><Droplets size={32} /><span>💧</span></span><span className="section-kicker">توتي يفكّرك بلطف</span><strong>ركن شرب الماء</strong><span className="water-info-description">علّمي أكوابك، راقبي أسبوعك، واختاري تذكيرًا صوتيًا يناسبك.</span><span className="water-info-link">افتحي سجل الماء <ChevronLeft size={16} /></span></button>
      </section>

      <WaterTrackerPage active={activeNav === 'water'} data={waterData} onChange={setWaterData} onBack={() => changePage('info', true)} />

      {activeNav === 'info' && <section className="info-actions-card"><span className="section-kicker">حول التطبيق</span><h2>سندس دي أنا</h2><p>خطتك الغذائية ومواعيد الوجبات محفوظة على هذا الجهاز. يمكنك إدارة التنبيهات والأذونات من هنا.</p><button type="button" onClick={() => setShowPermissionSettings(true)}><ShieldCheck size={18} /> إعدادات الجهاز والتنبيهات</button></section>}

      <footer hidden={activeNav !== 'home'}><span>صُنع بحب لسندس</span><span>تذكري: كل خطوة صغيرة انتصار كبير <Heart size={14} fill="currentColor" /></span></footer>

      {showPermissionSettings && <div className="celebration-overlay permission-overlay"><section className="permission-modal" role="dialog" aria-modal="true" aria-labelledby="permission-title"><button className="close-modal" onClick={() => setShowPermissionSettings(false)} aria-label="إغلاق"><X size={18} /></button><div className="permission-icon"><ShieldCheck size={27} /></div><span className="section-kicker">إعدادات الجهاز</span><h2 id="permission-title">الأذونات والتنبيهات</h2><p>يظهر طلب السماح تلقائيًا عند فتح التطبيق، ويمكنك إعادة طلبه من هنا.</p><div className="permission-actions"><button onClick={() => window.AndroidBridge?.checkForAppUpdate()}><Download size={19} /><span><b>تحديث نظام Android (APK)</b><small>للتغييرات الأصلية في Kotlin أو أذونات الجهاز فقط</small></span></button><button onClick={() => window.AndroidBridge?.requestNotificationPermission()}><Bell size={19} /><span><b>السماح بتنبيهات الوجبات والماء والألعاب</b><small>تذكيرات محلية للوجبات والماء ومواعيد الألعاب</small></span></button><button onClick={() => window.AndroidBridge?.requestExactAlarmAccess()}><Clock size={19} /><span><b>ضبط دقة مواعيد التنبيه</b><small>يفتح إعدادات المنبهات الدقيقة في Android</small></span></button><button onClick={() => window.AndroidBridge?.requestCameraPermission()}><Camera size={19} /><span><b>إذن الكاميرا</b><small>السماح باستخدام الكاميرا عند الحاجة</small></span></button><button onClick={() => window.AndroidBridge?.requestMicrophonePermission()}><Mic size={19} /><span><b>إذن الميكروفون</b><small>السماح باستخدام الميكروفون عند الحاجة</small></span></button></div></section></div>}

      {showFavoriteSong && <div className="celebration-overlay favorite-song-overlay" onClick={() => setShowFavoriteSong(false)}><section className="favorite-song-modal" role="dialog" aria-modal="true" aria-labelledby="favorite-song-title" onClick={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setShowFavoriteSong(false)} aria-label="إغلاق الفيديو"><X size={18} /></button><div className="favorite-song-modal-heading"><div className="favorite-song-icon"><Music2 size={22} /></div><div><span className="section-kicker">أغنية سندس</span><h2 id="favorite-song-title">أغنيتي المفضلة مع سندس</h2></div></div><video className="favorite-song-video" controls playsInline preload="metadata" src={favoriteSongVideo} /><p className="favorite-song-caption">استمتعي بالمشاهدة والاستماع مع كلمات الأغنية.</p></section></div>}

      <nav className="bottom-nav" aria-label="التنقل بين صفحات التطبيق">{navigation.map(({ Icon, id, label }) => <button key={id} aria-current={activeNav === id ? 'page' : undefined} className={`nav-item-${id} ${activeNav === id ? 'nav-active' : ''}`} onClick={() => changePage(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>

      {celebrationMeal && <div className="celebration-overlay"><div className="star-sparks" aria-hidden="true"><span>✦</span><span>★</span><span>✧</span><span>✦</span><span>★</span><span>✧</span><span>✦</span><span>★</span><span>✧</span><span>✦</span><span>★</span><span>✧</span></div><div className="celebration-modal" role="dialog" aria-modal="true" aria-label="تهنئة إتمام الوجبة"><button className="close-modal" onClick={() => setCelebrationMeal(null)} aria-label="إغلاق التهنئة"><X size={18} /></button><div className="applause-emoji" aria-hidden="true">👏</div><span className="section-kicker">تصفيق لكِ! رسالة من بابا سعيد</span><h2>أحسنتِ يا بطلة!</h2><p>أتممتِ {celebrationMeal.title} بنجاح.</p><blockquote className="celebration-love-note"><Heart size={16} fill="currentColor" /><span>{celebrationMeal.message}</span><Sparkles size={16} /></blockquote><div className="celebration-score"><Sparkles size={18} /> +2 نقطة إنجاز</div><button className="primary-button" onClick={() => setCelebrationMeal(null)}>رائع! <ChevronLeft size={18} /></button></div></div>}
    </main>
  );
}

export default App;
