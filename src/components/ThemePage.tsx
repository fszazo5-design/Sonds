import { RotateCcw, Palette, ChevronRight } from 'lucide-react';

export type ThemeSettings = { primary: string; secondary: string; surface: string; text: string; card: string; success: string; accent: string };
type Props = { active: boolean; theme: ThemeSettings; onThemeChange: (theme: ThemeSettings) => void; onBack: () => void };
const presets: Array<{ name: string; colors: ThemeSettings }> = [
  { name: 'وردي سندس', colors: { primary: '#ff007f', secondary: '#00cfe8', surface: '#fff8fc', text: '#34223f', card: '#ffffff', success: '#00cE76', accent: '#ffea00' } },
  { name: 'بحر هادئ', colors: { primary: '#0077b6', secondary: '#00b4d8', surface: '#f0fbff', text: '#12304a', card: '#ffffff', success: '#20b486', accent: '#90e0ef' } },
  { name: 'بنفسجي مرح', colors: { primary: '#7b2cbf', secondary: '#c77dff', surface: '#faf3ff', text: '#34213f', card: '#ffffff', success: '#57cc99', accent: '#ffcf56' } },
  { name: 'ليموني مبهج', colors: { primary: '#e07a00', secondary: '#61c554', surface: '#fffdf0', text: '#3d351c', card: '#ffffff', success: '#36a269', accent: '#ffd166' } },
];
const labels: Array<{ key: keyof ThemeSettings; label: string; help: string }> = [
  { key: 'primary', label: 'اللون الأساسي', help: 'الأزرار والعناوين' },
  { key: 'secondary', label: 'لون البهجة', help: 'المساعد والنجوم' },
  { key: 'surface', label: 'خلفية التطبيق', help: 'المساحة خلف الصفحات' },
  { key: 'card', label: 'لون البطاقات', help: 'القوائم والبطاقات' },
  { key: 'text', label: 'لون الكتابة', help: 'النصوص الرئيسية' },
  { key: 'success', label: 'لون الإنجاز', help: 'النجاح والإتمام' },
  { key: 'accent', label: 'اللون المميز', help: 'التفاصيل واللمسات' },
];

export default function ThemePage({ active, theme, onThemeChange, onBack }: Props) {
  return <section hidden={!active} className="theme-page"><button type="button" className="theme-back-button" onClick={onBack}><ChevronRight size={18} /> العودة إلى قائمة سندس</button><header className="theme-page-hero"><div><span className="theme-page-eyebrow"><Palette size={15} /> مساحة الاختيار</span><h2>ألوان تطبيقي</h2><p>اختاري أي لون تحبينه. ستتغير المعاينة فورًا ويتم حفظ اختيارك تلقائيًا.</p></div><div className="theme-preview-sparkle">✦</div></header><section className="theme-controls"><div className="theme-controls-heading"><div><span className="section-kicker">كل الألوان</span><h3>اختاري ألوان سندس</h3></div><button type="button" className="theme-reset" onClick={() => onThemeChange(presets[0].colors)}><RotateCcw size={15} /> الألوان الافتراضية</button></div><div className="theme-full-fields">{labels.map(({ key, label, help }) => <label key={key} className="theme-full-field"><input type="color" value={theme[key]} onChange={(event) => onThemeChange({ ...theme, [key]: event.target.value })} /><span><b>{label}</b><small>{help}</small></span><code>{theme[key].toUpperCase()}</code></label>)}</div><div className="theme-full-preview" style={{ background: theme.surface, color: theme.text, borderColor: theme.secondary }}><div className="theme-preview-card" style={{ background: theme.card }}><b>معاينة بطاقة سندس</b><p>هكذا ستظهر البطاقات والقوائم باللون الذي اخترته.</p><button type="button" style={{ background: theme.primary, color: '#fff' }}>زر مبهج</button><span style={{ background: theme.success }}>تم الإنجاز</span></div><div className="theme-preview-accent" style={{ color: theme.accent }}>✦ ★ ✦</div></div><div className="theme-presets theme-page-presets" aria-label="ألوان جاهزة">{presets.map((preset) => <button type="button" key={preset.name} onClick={() => onThemeChange(preset.colors)}><span style={{ background: `linear-gradient(135deg, ${preset.colors.primary}, ${preset.colors.secondary})` }} />{preset.name}</button>)}</div></section></section>;
}
