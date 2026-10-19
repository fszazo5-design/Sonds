import { useMemo, useRef, useState } from 'react';
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Pill, Plus, Trash2, X } from 'lucide-react';

export type TreatmentDose = { id: string; time: string; medicines: string[]; enabled: boolean };
export type TreatmentCourse = {
  startDate: string;
  durationDays: number;
  remindersEnabled: boolean;
  doses: TreatmentDose[];
  takenByDate: Record<string, string[]>;
};

type Props = { active: boolean; course: TreatmentCourse; onChange: (course: TreatmentCourse) => void; onBack: () => void };

const todayString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// The default is exported so App can initialize and restore the same course shape.
// eslint-disable-next-line react-refresh/only-export-components
export const defaultTreatmentCourse = (): TreatmentCourse => ({
  startDate: todayString(),
  durationDays: 90,
  remindersEnabled: true,
  doses: [
    { id: 'treatment-10', time: '10:00', medicines: ['كابرون', '2 Wfs'], enabled: true },
    { id: 'treatment-16', time: '16:00', medicines: ['جولوفاج', 'كابرون', '2 Wfs'], enabled: true },
    { id: 'treatment-22', time: '22:00', medicines: ['كابرون', '2 Wfs'], enabled: true },
  ],
  takenByDate: {},
});

function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function addDays(value: string, days: number) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days); return date; }
function formatDate(date: Date) { return new Intl.DateTimeFormat('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }).format(date); }

export default function TreatmentTracker({ active, course, onChange, onBack }: Props) {
  const [tableOpen, setTableOpen] = useState(true);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => Array.from({ length: Math.min(90, Math.max(1, course.durationDays || 90)) }, (_, index) => addDays(course.startDate, index)), [course.startDate, course.durationDays]);
  const enabledDoses = course.doses.filter((dose) => dose.enabled);
  const takenCount = Object.values(course.takenByDate).reduce((sum, values) => sum + values.length, 0);
  const totalCount = days.length * enabledDoses.length;

  const updateDose = (doseId: string, patch: Partial<TreatmentDose>) => onChange({ ...course, doses: course.doses.map((dose) => dose.id === doseId ? { ...dose, ...patch } : dose) });
  const toggleTaken = (day: string, doseId: string) => {
    const current = course.takenByDate[day] ?? [];
    const next = current.includes(doseId) ? current.filter((id) => id !== doseId) : [...current, doseId];
    if (!current.includes(doseId)) window.AndroidBridge?.acknowledgeTreatmentDose(doseId);
    onChange({ ...course, takenByDate: { ...course.takenByDate, [day]: next } });
  };
  const addDose = () => onChange({ ...course, doses: [...course.doses, { id: `treatment-${Date.now()}`, time: '12:00', medicines: ['دواء جديد'], enabled: true }] });
  const removeDose = (doseId: string) => onChange({ ...course, doses: course.doses.filter((dose) => dose.id !== doseId) });
  const moveTable = (amount: number) => tableWrapRef.current?.scrollBy({ left: amount, behavior: 'smooth' });

  if (!active) return null;
  return <section className="treatment-page">
    <button type="button" className="treatment-back-button" onClick={onBack}><X size={18} /> العودة إلى قائمة أوقاتي</button>
    <header className="treatment-hero">
      <div><span className="treatment-eyebrow"><Pill size={15} /> متابعة علاج سندس</span><h2>كورس سندس العلاجي</h2><p>جدول جاهز لمدة ثلاثة أشهر. عدّلي الجرعات، ثم علّمي الجرعة عند أخذها.</p></div>
      <div className="treatment-hero-icon"><Clock3 size={36} /></div>
    </header>

    <section className="treatment-settings">
      <div className="treatment-section-heading"><div><span className="section-kicker">إعداد الكورس</span><h3>تاريخ البداية والتنبيهات</h3></div><Bell size={21} /></div>
      <div className="treatment-settings-grid">
        <label><span>تاريخ بداية الكورس</span><input type="date" value={course.startDate} onChange={(event) => onChange({ ...course, startDate: event.target.value })} /></label>
        <label className="treatment-reminder-toggle"><input type="checkbox" checked={course.remindersEnabled} onChange={(event) => onChange({ ...course, remindersEnabled: event.target.checked })} /><span>تنبيهات العلاج مفعّلة</span></label>
      </div>
      <p className="treatment-safety-note">التنبيهات تنقل الأوقات والأسماء التي أدخلتِها كما هي. اتبعي وصف الطبيب ولا تغيّري الجرعات إلا بتوجيهه.</p>
    </section>

    <section className="treatment-dose-editor">
      <div className="treatment-section-heading"><div><span className="section-kicker">مواعيد الجرعات</span><h3>{enabledDoses.length} جرعات يومية</h3></div><button type="button" className="treatment-add-dose" onClick={addDose}><Plus size={16} /> إضافة موعد</button></div>
      <div className="treatment-dose-list">{course.doses.map((dose) => <article className={`treatment-dose ${dose.enabled ? '' : 'treatment-dose-disabled'}`} key={dose.id}>
        <label className="treatment-dose-enabled"><input type="checkbox" checked={dose.enabled} onChange={(event) => updateDose(dose.id, { enabled: event.target.checked })} /><span /></label>
        <input className="treatment-time" type="time" value={dose.time} onChange={(event) => updateDose(dose.id, { time: event.target.value })} aria-label="وقت الجرعة" />
        <input className="treatment-medicines" value={dose.medicines.join(' + ')} onChange={(event) => updateDose(dose.id, { medicines: event.target.value.split('+').map((item) => item.trim()).filter(Boolean) })} aria-label="أسماء الأدوية" />
        <button type="button" className="treatment-delete-dose" onClick={() => removeDose(dose.id)} aria-label="حذف موعد الجرعة"><Trash2 size={16} /></button>
      </article>)}</div>
    </section>

    <section className="treatment-table-card">
      <div className="treatment-table-heading"><button type="button" className="treatment-table-toggle" onClick={() => setTableOpen((open) => !open)} aria-expanded={tableOpen} aria-controls="treatment-days-table"><span><span className="section-kicker">خطة 90 يومًا</span><h3>متابعة الأيام والجرعات</h3><small>{tableOpen ? 'اضغطي للإغلاق أو اسحبي الجدول يمينًا ويسارًا' : 'اضغطي لعرض جدول الأيام والجرعات'}</small></span><ChevronDown size={20} /></button><strong>{takenCount} / {totalCount} <small>جرعة مؤكدة</small></strong></div>
      {tableOpen && <div className="treatment-table-controls"><span>حرّكي الجدول يمينًا ويسارًا لرؤية كل الخانات</span><div><button type="button" onClick={() => moveTable(280)} aria-label="تحريك الجدول لليمين"><ChevronRight size={16} /></button><button type="button" onClick={() => moveTable(-280)} aria-label="تحريك الجدول لليسار"><ChevronLeft size={16} /></button></div></div>}
      {tableOpen && <div className="treatment-table-wrap" ref={tableWrapRef} id="treatment-days-table" tabIndex={0} aria-label="جدول متابعة الأيام والجرعات"><table className="treatment-table"><thead><tr><th>اليوم</th><th>التاريخ</th><th>عدد الجرعات</th><th>التأكيد</th></tr></thead><tbody>{days.map((date, index) => {
        const day = dateKey(date);
        const taken = course.takenByDate[day] ?? [];
        return <tr key={day} className={taken.length === enabledDoses.length && enabledDoses.length > 0 ? 'treatment-day-complete' : ''}><td>اليوم {index + 1}</td><td>{formatDate(date)}</td><td><span className="treatment-count">{taken.length} / {enabledDoses.length}</span></td><td><div className="treatment-day-doses">{enabledDoses.map((dose) => <button type="button" key={dose.id} className={taken.includes(dose.id) ? 'taken' : ''} onClick={() => toggleTaken(day, dose.id)} title={`${dose.time} — ${dose.medicines.join(' + ')}`}><span>{dose.time}</span>{taken.includes(dose.id) ? <Check size={14} /> : <ChevronLeft size={14} />}</button>)}</div></td></tr>;
      })}</tbody></table></div>}
    </section>
  </section>;
}
