import { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, Check, ChevronRight, Moon, Play, RotateCcw, ShieldCheck, Sun, Volume2, VolumeX } from 'lucide-react';

export type AdhkarSettings = {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
};

type AdhkarProgress = { morning: string[]; evening: string[]; ruqyah: string[] };
type Props = { active: boolean; settings: AdhkarSettings; progress: AdhkarProgress; onSettingsChange: (settings: AdhkarSettings) => void; onProgressChange: (progress: AdhkarProgress) => void; onBack: () => void };
type AdhkarItem = { id: string; text: string; count: number; source?: string };
type Tab = 'morning' | 'evening' | 'ruqyah';

const morning: AdhkarItem[] = [
  { id: 'morning-ayatul-kursi', text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ.', count: 1, source: 'البقرة: 255' },
  { id: 'morning-1', text: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. رب أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده، رب أعوذ بك من الكسل وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر.', count: 1, source: 'رواه مسلم' },
  { id: 'morning-2', text: 'اللهم بك أصبحنا وبك أمسينا، وبك نحيا وبك نموت وإليك النشور.', count: 1, source: 'رواه الترمذي' },
  { id: 'morning-3', text: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي، فإنه لا يغفر الذنوب إلا أنت.', count: 1, source: 'سيد الاستغفار، رواه البخاري' },
  { id: 'morning-4', text: 'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد صلى الله عليه وسلم نبيًا.', count: 3, source: 'رواه أبو داود والترمذي' },
  { id: 'morning-5', text: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.', count: 3, source: 'رواه أبو داود والترمذي' },
  { id: 'morning-6', text: 'اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي، واحفظني من بين يدي ومن خلفي وعن يميني وعن شمالي ومن فوقي، وأعوذ بعظمتك أن أغتال من تحتي.', count: 1, source: 'رواه أبو داود وابن ماجه' },
  { id: 'morning-7', text: 'اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت. اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت.', count: 3, source: 'رواه أبو داود' },
  { id: 'morning-8', text: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.', count: 7, source: 'التوبة: 129' },
  { id: 'morning-9', text: 'اللهم فاطر السماوات والأرض، عالم الغيب والشهادة، رب كل شيء ومليكه، أشهد أن لا إله إلا أنت، أعوذ بك من شر نفسي، ومن شر الشيطان وشركه، وأن أقترف على نفسي سوءًا أو أجره إلى مسلم.', count: 1, source: 'رواه الترمذي' },
  { id: 'morning-10', text: 'اللهم إني أصبحت أشهدك وأشهد حملة عرشك وملائكتك وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.', count: 4, source: 'رواه أبو داود' },
  { id: 'morning-11', text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، يحيي ويميت وهو على كل شيء قدير.', count: 10, source: 'رواه ابن حبان' },
  { id: 'morning-12', text: 'سبحان الله وبحمده.', count: 100, source: 'رواه مسلم' },
  { id: 'morning-13', text: 'سبحان الله وبحمده، عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته.', count: 3, source: 'رواه مسلم' },
  { id: 'morning-14', text: 'قراءة سور الإخلاص والفلق والناس.', count: 3, source: 'رواه الترمذي' },
];

const evening: AdhkarItem[] = morning.map((item) => ({ ...item, id: item.id.replace('morning', 'evening'), text: item.text.split('أصبحنا').join('أمسينا').split('أصبح').join('أمسى').split('هذا اليوم').join('هذه الليلة').split('ما بعده').join('ما بعدها').split('النشور').join('المصير').split('أصبحت').join('أمسيت'), }));
evening[9] = { ...evening[9], text: 'اللهم إني أمسيت أشهدك وأشهد حملة عرشك وملائكتك وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.' };

const constRuqyah: AdhkarItem[] = [
  { id: 'ruqyah-fatiha', text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ. الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ. الرَّحْمَٰنِ الرَّحِيمِ. مَالِكِ يَوْمِ الدِّينِ. إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ. اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ. صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ.', count: 7, source: 'سورة الفاتحة' },
  { id: 'ruqyah-kursi', text: morning[0].text, count: 1, source: 'البقرة: 255' },
  { id: 'ruqyah-baqara-end', text: 'آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِنْ رُسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ. لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِنْ قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنْتَ مَوْلَانَا فَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ.', count: 1, source: 'آخر آيتين من البقرة: 285-286' },
  { id: 'ruqyah-ikhlas', text: 'قُلْ هُوَ اللَّهُ أَحَدٌ. اللَّهُ الصَّمَدُ. لَمْ يَلِدْ وَلَمْ يُولَدْ. وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ.', count: 3, source: 'سورة الإخلاص' },
  { id: 'ruqyah-falaq', text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ. مِنْ شَرِّ مَا خَلَقَ. وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ. وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ. وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ.', count: 3, source: 'سورة الفلق' },
  { id: 'ruqyah-nas', text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ. مَلِكِ النَّاسِ. إِلَٰهِ النَّاسِ. مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ. الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ. مِنَ الْجِنَّةِ وَالنَّاسِ.', count: 3, source: 'سورة الناس' },
  { id: 'ruqyah-batil', text: 'وَقُلْ جَاءَ الْحَقُّ وَزَهَقَ الْبَاطِلُ ۚ إِنَّ الْبَاطِلَ كَانَ زَهُوقًا. وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِلْمُؤْمِنِينَ.', count: 1, source: 'الإسراء: 81-82' },
  { id: 'ruqyah-musa', text: 'وَأَوْحَيْنَا إِلَىٰ مُوسَىٰ أَنْ أَلْقِ عَصَاكَ ۖ فَإِذَا هِيَ تَلْقَفُ مَا يَأْفِكُونَ. فَوَقَعَ الْحَقُّ وَبَطَلَ مَا كَانُوا يَعْمَلُونَ. فَغُلِبُوا هُنَالِكَ وَانْقَلَبُوا صَاغِرِينَ.', count: 1, source: 'الأعراف: 117-119' },
  { id: 'ruqyah-yunus', text: 'فَلَمَّا أَلْقَوْا قَالَ مُوسَىٰ مَا جِئْتُمْ بِهِ السِّحْرُ ۖ إِنَّ اللَّهَ سَيُبْطِلُهُ ۖ إِنَّ اللَّهَ لَا يُصْلِحُ عَمَلَ الْمُفْسِدِينَ. وَيُحِقُّ اللَّهُ الْحَقَّ بِكَلِمَاتِهِ وَلَوْ كَرِهَ الْمُجْرِمُونَ.', count: 1, source: 'يونس: 81-82' },
  { id: 'ruqyah-shifa', text: 'وَيَشْفِ صُدُورَ قَوْمٍ مُؤْمِنِينَ. وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ. قُلْ هُوَ لِلَّذِينَ آمَنُوا هُدًى وَشِفَاءٌ.', count: 1, source: 'التوبة: 14، الشعراء: 80، فصلت: 44' },
  { id: 'ruqyah-dua-1', text: 'أذهب الباس رب الناس، اشف وأنت الشافي، لا شفاء إلا شفاؤك، شفاء لا يغادر سقمًا.', count: 3, source: 'رواه البخاري ومسلم' },
  { id: 'ruqyah-dua-2', text: 'باسم الله أرقيك، من كل شيء يؤذيك، من شر كل نفس أو عين حاسد، الله يشفيك، باسم الله أرقيك.', count: 3, source: 'رواه مسلم' },
  { id: 'ruqyah-dua-3', text: 'أعوذ بكلمات الله التامات من شر ما خلق.', count: 3, source: 'رواه مسلم' },
  { id: 'ruqyah-dua-4', text: 'أعوذ بكلمات الله التامة من كل شيطان وهامة، ومن كل عين لامة.', count: 3, source: 'رواه البخاري' },
  { id: 'ruqyah-dua-5', text: 'أسأل الله العظيم رب العرش العظيم أن يشفيك.', count: 7, source: 'رواه أبو داود والترمذي' },
  { id: 'ruqyah-dua-6', text: 'ضع يدك على الذي تألم من جسدك وقل: بسم الله، ثلاثًا، وقل سبع مرات: أعوذ بالله وقدرته من شر ما أجد وأحاذر.', count: 7, source: 'رواه مسلم' },
];

const speak = (text: string) => {
  if (window.AndroidBridge?.speakArabic) { window.AndroidBridge.speakArabic(text); return true; }
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA'; utterance.rate = 0.82; utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
};
const stopSpeak = () => { window.AndroidBridge?.stopSpeech(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };

export default function AdhkarPage({ active, settings, progress, onSettingsChange, onProgressChange, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('morning');
  const [speaking, setSpeaking] = useState(false);
  const list = tab === 'morning' ? morning : tab === 'evening' ? evening : constRuqyah;
  const done = progress[tab];
  const completed = list.filter((item) => done.includes(item.id)).length;
  const title = tab === 'morning' ? 'أذكار الصباح' : tab === 'evening' ? 'أذكار المساء' : 'الرقية الشرعية';
  const reminder = tab === 'morning' ? { enabled: settings.morningEnabled, time: settings.morningTime } : { enabled: settings.eveningEnabled, time: settings.eveningTime };
  const setReminder = (patch: Partial<typeof reminder>) => onSettingsChange(tab === 'morning' ? { ...settings, morningEnabled: patch.enabled ?? reminder.enabled, morningTime: patch.time ?? reminder.time } : { ...settings, eveningEnabled: patch.enabled ?? reminder.enabled, eveningTime: patch.time ?? reminder.time });
  const currentText = useMemo(() => list.map((item) => item.text).join(' '), [list]);
  useEffect(() => () => stopSpeak(), []);
  const toggleItem = (id: string) => onProgressChange({ ...progress, [tab]: done.includes(id) ? done.filter((item) => item !== id) : [...done, id] });
  const readAll = () => { if (speaking) { stopSpeak(); setSpeaking(false); return; } setSpeaking(speak(currentText)); window.setTimeout(() => setSpeaking(false), Math.max(3000, currentText.length * 45)); };
  return <section hidden={!active} className="adhkar-page">
    <button type="button" className="adhkar-back-button" onClick={onBack}><ChevronRight size={18} /> العودة إلى قائمة سندس</button>
    <header className="adhkar-hero"><div><span className="adhkar-eyebrow"><BookOpen size={15} /> نور يومك وطمأنينة قلبك</span><h2>الأذكار والرقية الشرعية</h2><p>نصوص موسعة من القرآن والسنة، مع قراءة صوتية محلية تعمل دون الحاجة إلى اتصال داخل التطبيق.</p></div><div className="adhkar-hero-symbol">{tab === 'morning' ? <Sun size={55} /> : tab === 'evening' ? <Moon size={55} /> : <ShieldCheck size={55} />}</div></header>
    <div className="adhkar-tabs" role="tablist"><button type="button" className={tab === 'morning' ? 'active' : ''} onClick={() => setTab('morning')}><Sun size={18} /> أذكار الصباح</button><button type="button" className={tab === 'evening' ? 'active' : ''} onClick={() => setTab('evening')}><Moon size={18} /> أذكار المساء</button><button type="button" className={tab === 'ruqyah' ? 'active' : ''} onClick={() => setTab('ruqyah')}><ShieldCheck size={18} /> الرقية الشرعية</button></div>
    <section className="adhkar-toolbar"><div><span className="section-kicker">{title}</span><h3>{completed} من {list.length} مكتملة</h3></div><div className="adhkar-actions"><button type="button" onClick={readAll}>{speaking ? <VolumeX size={16} /> : <Volume2 size={16} />} {speaking ? 'إيقاف القراءة' : 'قراءة صوتية'}</button><button type="button" onClick={() => onProgressChange({ ...progress, [tab]: [] })}><RotateCcw size={15} /> إعادة</button></div></section>
    <div className="adhkar-progress"><span style={{ width: `${list.length ? completed / list.length * 100 : 0}%` }} /></div>
    <div className="adhkar-list">{list.map((item) => <article className={`adhkar-card ${done.includes(item.id) ? 'adhkar-done' : ''}`} key={item.id}><button type="button" className="adhkar-check" onClick={() => toggleItem(item.id)} aria-label={`تحديد ${item.text}`}>{done.includes(item.id) ? <Check size={20} /> : <span />}</button><div className="adhkar-card-copy"><p>{item.text}</p>{item.source && <small>{item.source}</small>}</div><span className="adhkar-count">{item.count} {item.count === 1 ? 'مرة' : 'مرات'}</span><button type="button" className="adhkar-read-one" aria-label="قراءة النص" onClick={() => { setSpeaking(speak(item.text)); }}><Play size={15} fill="currentColor" /></button></article>)}</div>
    {tab !== 'ruqyah' && <section className="adhkar-reminder"><div className="adhkar-reminder-icon"><Bell size={20} /></div><div className="adhkar-reminder-copy"><span className="section-kicker">تنبيه لطيف</span><h3>تذكير {title}</h3><p>اختاري موعدًا ليظهر التذكير في الهاتف عند توفر إشعارات Android.</p></div><label className="adhkar-switch"><input type="checkbox" checked={reminder.enabled} onChange={(event) => setReminder({ enabled: event.target.checked })} /><span /></label><input className="adhkar-time" type="time" value={reminder.time} disabled={!reminder.enabled} onChange={(event) => setReminder({ time: event.target.value })} /></section>}
    {tab === 'ruqyah' && <p className="adhkar-note">الرقية الشرعية دعاء وقراءة من القرآن والسنة، والشفاء بيد الله وحده. لا تغني عن مراجعة الطبيب عند الحاجة، وتجنبي أي نص أو ممارسة فيها شرك أو ضرر.</p>}
    {tab !== 'ruqyah' && <p className="adhkar-note">تم توسيع الأذكار من مصادر عربية موثوقة، مع مراعاة اختلاف صيغ بعض الروايات. راجعي النص مع مصدر موثوق عند التعليم أو الحفظ.</p>}
  </section>;
}
