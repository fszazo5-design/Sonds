import { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  GlassWater,
  Heart,
  HeartPulse,
  Minus,
  Plus,
  Scale,
  Sparkles,
  Volume2,
} from 'lucide-react';
import waterCharacter from '../assets/sundus-water.webp';

export type WaterTrackingData = {
  dailyGoal: number;
  cupsByDate: Record<string, number>;
  weightByDate: Record<string, number>;
  remindersEnabled: boolean;
  reminderTimes: string[];
};

type WaterTrackerPageProps = {
  active: boolean;
  data: WaterTrackingData;
  onChange: (next: WaterTrackingData) => void;
  onBack: () => void;
};

const todayDate = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const dateKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const shiftDate = (date: Date, amount: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const formatNumber = (value: number): string => new Intl.NumberFormat('ar-EG').format(value);
const reminderOptions = ['10:00', '13:00', '16:00', '19:00'];

function getWeek(weekOffset: number): Date[] {
  const today = todayDate();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = shiftDate(today, -mondayOffset + weekOffset * 7);
  return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index));
}

export default function WaterTrackerPage({ active, data, onChange, onBack }: WaterTrackerPageProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const todayKey = dateKey(todayDate());
  const days = getWeek(weekOffset);
  const [selectedDay, setSelectedDay] = useState(() => dateKey(todayDate()));
  useEffect(() => {
    setSelectedDay(todayKey);
    setWeekOffset(0);
  }, [todayKey]);
  const selectedDate = fromKey(selectedDay);
  const selectedIsFuture = selectedDay > todayKey;
  const cups = Math.max(0, data.cupsByDate[selectedDay] ?? 0);
  const goal = Math.min(16, Math.max(4, data.dailyGoal || 8));
  const progress = Math.min(100, Math.round((cups / goal) * 100));
  const weekStart = days[0];
  const weekEnd = days[6];
  const weekLabel = `${new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(weekStart)} — ${new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(weekEnd)}`;
  const selectedWeight = data.weightByDate[selectedDay];
  const completedDays = days.filter((day) => (data.cupsByDate[dateKey(day)] ?? 0) >= goal && dateKey(day) <= todayKey).length;

  const update = (patch: Partial<WaterTrackingData>): void => onChange({ ...data, ...patch });
  const setCups = (nextCups: number): void => {
    const next = Math.max(0, Math.min(30, nextCups));
    update({ cupsByDate: { ...data.cupsByDate, [selectedDay]: next } });
  };
  const toggleReminderTime = (time: string): void => {
    const selected = data.reminderTimes.includes(time)
      ? data.reminderTimes.filter((item) => item !== time)
      : [...data.reminderTimes, time].sort();
    update({ reminderTimes: selected });
  };

  return (
    <section hidden={!active} className="water-page" aria-label="متابعة شرب الماء">
      <button type="button" className="water-back-button" onClick={onBack}><ChevronRight size={18} /> العودة إلى معلوماتي</button>

      <header className="water-hero">
        <div className="water-hero-copy">
          <span className="water-hero-eyebrow"><Droplets size={15} /> عادة صغيرة.. فرق كبير</span>
          <h2>كل رشفة تحكي عن اهتمامك بنفسك</h2>
          <p>علّمي أكوابك خلال اليوم، واحتفظي بسجل لطيف يبيّن تقدمك يومًا بعد يوم.</p>
          <div className="water-hero-badges"><span><Heart size={14} fill="currentColor" /> بلطف ومن غير ضغط</span><span><Sparkles size={14} /> محفوظ على الجهاز، مع مزامنة سحابية عند إعدادها</span></div>
        </div>
        <div className="water-hero-character"><span className="water-orbit water-orbit-one" /><span className="water-orbit water-orbit-two" /><img src={waterCharacter} alt="سندس تشرب الماء وتشجعك على الترطيب" /><span className="water-character-drop">💧</span></div>
        <div className="water-hero-logo"><span className="brand-paw">✦</span><span>سندس دي أنا</span></div>
      </header>

      <div className="water-metrics" aria-label="ملخص الماء والصحة">
        <article className="water-metric water-metric-blue"><span className="water-metric-icon"><GlassWater size={22} /></span><div><small>أكواب اليوم</small><strong>{formatNumber(cups)} <em>/ {formatNumber(goal)}</em></strong></div><span className="water-metric-art">💧</span></article>
        <article className="water-metric water-metric-yellow"><span className="water-metric-icon"><Flame size={22} /></span><div><small>السعرات في الماء</small><strong>0 <em>سعرة</em></strong></div><span className="water-metric-art">✦</span></article>
        <article className="water-metric water-metric-purple"><span className="water-metric-icon"><Scale size={22} /></span><div><small>متابعة الجسم</small><strong>{selectedWeight ? `${formatNumber(selectedWeight)} كجم` : 'اختيارية'}</strong></div><span className="water-metric-art">♡</span></article>
        <article className="water-metric water-metric-green"><span className="water-metric-icon"><HeartPulse size={22} /></span><div><small>أيام بلغتي هدفك</small><strong>{formatNumber(completedDays)} <em>هذا الأسبوع</em></strong></div><span className="water-metric-art">✿</span></article>
      </div>

      <div className="water-page-columns">
        <div className="water-main-column">
          <section className="water-cups-card">
            <div className="water-section-heading"><div className="water-heading-icon"><Droplets size={20} /></div><div><span className="section-kicker">خطوة بخطوة</span><h3>أكوابك اليوم</h3></div><div className="water-goal-control"><button type="button" aria-label="تقليل هدف الأكواب" onClick={() => update({ dailyGoal: Math.max(4, goal - 1) })} disabled={goal <= 4}><Minus size={14} /></button><span>{formatNumber(goal)} <small>أكواب</small></span><button type="button" aria-label="زيادة هدف الأكواب" onClick={() => update({ dailyGoal: Math.min(16, goal + 1) })} disabled={goal >= 16}><Plus size={14} /></button></div></div>
            <div className="water-progress-line"><span style={{ width: `${progress}%` }} /></div>
            <div className="water-progress-caption"><span>{selectedDay === todayKey ? 'اليوم' : new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' }).format(selectedDate)}</span><strong>{progress >= 100 ? 'يا سلام! وصلتي لهدفك' : `باقي ${formatNumber(Math.max(0, goal - cups))} أكواب`}</strong><span>{progress}%</span></div>

            <div className="water-cup-grid" role="group" aria-label={`تعليم أكواب الماء لليوم، ${formatNumber(cups)} من ${formatNumber(goal)}`}>
              {Array.from({ length: goal }, (_, index) => {
                const filled = index < cups;
                return <button key={index} type="button" className={`water-cup-tile ${filled ? 'water-cup-filled' : ''}`} disabled={selectedIsFuture} aria-pressed={filled} aria-label={`${filled ? 'إلغاء' : 'تسجيل'} الكوب رقم ${index + 1}`} onClick={() => setCups(filled ? index : index + 1)}><span className="water-cup-number">{formatNumber(index + 1)}</span><GlassWater size={28} strokeWidth={1.8} /><span className="water-cup-check">{filled ? <Check size={13} strokeWidth={3} /> : '+'}</span></button>;
              })}
            </div>
            <div className="water-cup-actions"><button type="button" className="water-add-cup" onClick={() => setCups(cups + 1)} disabled={selectedIsFuture}><Plus size={18} /> أضفت كوب ماء</button><button type="button" className="water-undo-cup" onClick={() => setCups(cups - 1)} disabled={cups === 0 || selectedIsFuture}><Minus size={16} /> تراجع</button></div>
            <p className="water-gentle-note"><Heart size={13} fill="currentColor" /> كل كوب تسجّلينه يظهر فورًا في جدول الأسبوع، والهدف قابل للتعديل.</p>
          </section>

          <section className="water-week-card">
            <div className="water-section-heading"><div className="water-heading-icon water-heading-calendar"><CalendarDays size={20} /></div><div><span className="section-kicker">نظرة على تقدمك</span><h3>أسبوع الماء</h3></div><div className="water-week-switch"><button type="button" aria-label="الأسبوع السابق" onClick={() => { setWeekOffset((value) => value - 1); setSelectedDay(dateKey(shiftDate(fromKey(selectedDay), -7))); }}><ChevronRight size={18} /></button><strong>{weekLabel}</strong><button type="button" aria-label="الأسبوع التالي" disabled={weekOffset >= 0} onClick={() => { setWeekOffset((value) => value + 1); setSelectedDay(dateKey(shiftDate(fromKey(selectedDay), 7))); }}><ChevronLeft size={18} /></button></div></div>
            <div className="water-week-list">
              {days.map((day) => {
                const key = dateKey(day);
                const isFuture = key > todayKey;
                const isSelected = key === selectedDay;
                const dayCups = data.cupsByDate[key] ?? 0;
                const dayProgress = Math.min(100, Math.round((dayCups / goal) * 100));
                return <button key={key} type="button" className={`water-day-row ${isSelected ? 'water-day-selected' : ''} ${isFuture ? 'water-day-future' : ''}`} onClick={() => !isFuture && setSelectedDay(key)} disabled={isFuture} aria-current={key === todayKey ? 'date' : undefined}>
                  <span className="water-day-name"><b>{new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(day)}</b><small>{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(day)}{key === todayKey ? ' · اليوم' : ''}</small></span>
                  <span className="water-day-drops" aria-hidden="true">{Array.from({ length: Math.min(goal, 8) }, (_, index) => <Droplets key={index} size={13} className={index < dayCups ? 'drop-on' : ''} />)}</span>
                  <span className="water-day-count"><strong>{formatNumber(dayCups)}</strong><small>كوب</small></span>
                  <span className="water-day-bar"><i style={{ width: `${dayProgress}%` }} /></span>
                </button>;
              })}
            </div>
            <div className="water-week-legend"><span><i /> كوب مسجل</span><span>اضغطي يومًا لعرضه أو تحديث سجله</span></div>
          </section>
        </div>

        <aside className="water-side-column">
          <section className="water-body-card">
            <div className="water-side-heading"><span className="water-body-icon"><Activity size={20} /></span><div><span className="section-kicker">اختياري تمامًا</span><h3>متابعة الجسم</h3></div></div>
            <p>لو حبيتي، سجّلي قراءة الوزن لهذا اليوم لتتبعي تغيّرها بمرور الوقت. اتركيها فارغة إذا مش محتاجة.</p>
            <label className="water-weight-field"><span><Scale size={16} /> الوزن</span><span className="water-weight-input-wrap"><input type="number" min="1" max="500" step="0.1" inputMode="decimal" value={selectedWeight ?? ''} placeholder="—" aria-label="الوزن بالكيلوغرام" onChange={(event) => { const value = event.target.value; const next = { ...data.weightByDate }; if (!value) delete next[selectedDay]; else { const parsed = Number(value); if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) next[selectedDay] = parsed; } update({ weightByDate: next }); }} /><small>كجم</small></span></label>
            <div className="water-privacy-note"><Heart size={14} /> سجل الجسم يبقى على الجهاز ولا يدخل في المزامنة السحابية.</div>
          </section>

          <section className="water-health-card"><span className="water-health-illustration"><HeartPulse size={25} /><Droplets size={19} /></span><div><span className="section-kicker">عناية متوازنة</span><h3>استمعي لجسمك</h3><p>اشربي على مهل وحسب احتياجك. الهدف تذكير لطيف، وليس قاعدة طبية تناسب الجميع.</p></div></section>

          <section className="water-reminder-card">
            <div className="water-side-heading"><span className="water-reminder-icon"><Bell size={20} /></span><div><span className="section-kicker">صوت توتي</span><h3>تذكير شرب الماء</h3></div><label className="water-switch" aria-label="تفعيل تنبيهات الماء"><input type="checkbox" checked={data.remindersEnabled} onChange={(event) => update({ remindersEnabled: event.target.checked })} /><span /></label></div>
            <p>اختاري مواعيد التذكير اليومية. على Android تُجدول كتذكيرات هاتف وتستخدم نغمة التطبيق الحالية.</p>
            <div className="water-reminder-times">{reminderOptions.map((time) => <button key={time} type="button" aria-pressed={data.reminderTimes.includes(time)} onClick={() => toggleReminderTime(time)} disabled={!data.remindersEnabled}><span>{data.reminderTimes.includes(time) ? <Check size={12} /> : <Plus size={12} />}</span>{new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date(`2000-01-01T${time}:00`))}</button>)}</div>
            <div className="water-audio-note"><Volume2 size={15} /> نغمة الإشعار تضبط من إعدادات إشعارات Android.</div>
            {data.remindersEnabled && data.reminderTimes.length === 0 && <p className="water-reminder-warning" role="status">اختاري موعدًا واحدًا على الأقل لتفعيل التذكير.</p>}
          </section>

            <div className="water-disclaimer"><Droplets size={16} /><span>الأكواب المسجلة والسجل الأسبوعي محفوظان محليًا ضمن بيانات خطتك.</span></div>
        </aside>
      </div>
    </section>
  );
}
