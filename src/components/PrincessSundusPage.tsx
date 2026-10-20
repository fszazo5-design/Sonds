import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Coffee, Flower2, Home, Pause, Play, RefreshCw, Shirt, Sparkles, Star, Volume2, VolumeX } from 'lucide-react';
import princessImage from '../assets/princess-sundus.jpeg';
import princessBlueImage from '../assets/princess-sundus-blue.webp';
import princessLavenderImage from '../assets/princess-sundus-lavender.webp';
import princessEmeraldImage from '../assets/princess-sundus-emerald.webp';
import princessGoldImage from '../assets/princess-sundus-gold.webp';

type Tab = 'room' | 'bubbles' | 'smoothie';
type Bubble = { id: number; x: number; size: number; color: string; drift: number };
type Ingredient = { name: string; emoji: string; color: string };
type RecipeKind = 'smoothie' | 'recipe' | 'drink';

const affirmations = [
  'يا سندس، أنتِ أميرة قوية ومميزة ومتألقة دائمًا ✨',
  'خذي نفسًا عميقًا، واسمحي لقلبك بلحظة راحة جميلة 🌸',
  'ابتسامتك تنور القصر والعالم كله يا سندس 💖',
  'كل يوم فرصة جديدة لتبدعي وتكوني سعيدة ⭐',
  'أنتِ تستحقين كل الحب والاهتمام والراحة يا أميرة 👑',
];
const looks = [
  { id: 'rose', name: 'الوردي الأصلي', emoji: '🌸', color: '#f472b6', image: princessImage, dress: 'فستان وردي ملكي', background: 'قصر البحيرة' },
  { id: 'blue', name: 'الأزرق الليلي', emoji: '🌙', color: '#2563eb', image: princessBlueImage, dress: 'فستان أزرق ملكي', background: 'قصر تحت النجوم' },
  { id: 'lavender', name: 'لافندر الغيوم', emoji: '☁️', color: '#a78bfa', image: princessLavenderImage, dress: 'فستان لافندر لامع', background: 'قصر الغيوم' },
  { id: 'emerald', name: 'زمرد الحديقة', emoji: '🌿', color: '#10b981', image: princessEmeraldImage, dress: 'فستان زمردي ذهبي', background: 'الحديقة الملكية' },
  { id: 'gold', name: 'ذهبي الغروب', emoji: '☀️', color: '#f59e0b', image: princessGoldImage, dress: 'فستان ذهبي وردي', background: 'شرفة الغروب' },
];

const ingredients: Ingredient[] = [
  { name: 'فراولة', emoji: '🍓', color: '#fb7185' },
  { name: 'موز', emoji: '🍌', color: '#fde047' },
  { name: 'توت', emoji: '🫐', color: '#818cf8' },
  { name: 'كيوي', emoji: '🥝', color: '#86efac' },
  { name: 'حليب', emoji: '🥛', color: '#fff7ed' },
  { name: 'فاكهة التنين', emoji: '🌺', color: '#f472b6' },
];

function playTone(kind: 'pop' | 'sparkle' | 'blend', enabled: boolean): void {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'blend' ? 'sawtooth' : 'sine';
    oscillator.frequency.value = kind === 'blend' ? 140 : kind === 'sparkle' ? 740 : 460;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === 'blend' ? 0.12 : 0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'blend' ? 0.8 : 0.18));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (kind === 'blend' ? 0.85 : 0.22));
    oscillator.addEventListener('ended', () => { void context.close(); }, { once: true });
  } catch { /* الصوت اختياري، وتظل اللعبة تعمل بدونه */ }
}

export default function PrincessSundusPage({ active }: { active: boolean }) {
  const [tab, setTab] = useState<Tab>('room');
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(false);
  const [look, setLook] = useState(looks[0]);
  const [decor, setDecor] = useState<string[]>(['stars', 'flowers']);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popped, setPopped] = useState(0);
  const [message, setMessage] = useState('اضغطي على الفقاعات لاكتشاف رسالة جميلة يا سندس ✨');
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>(ingredients);
  const [items, setItems] = useState<Ingredient[]>([]);
  const [recipeKind, setRecipeKind] = useState<RecipeKind>('smoothie');
  const [customIngredientName, setCustomIngredientName] = useState('');
  const [customIngredientEmoji, setCustomIngredientEmoji] = useState('🍽️');
  const [blending, setBlending] = useState(false);
  const [ready, setReady] = useState(false);
  const [smoothieColor, setSmoothieColor] = useState('#fda4af');
  const [photoFlash, setPhotoFlash] = useState(false);
  const musicTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!active || tab !== 'bubbles') return;
    const timer = window.setInterval(() => setBubbles((current) => current.length < 8 ? [...current, { id: Date.now() + Math.random(), x: 8 + Math.random() * 80, size: 50 + Math.random() * 35, color: ['#fbcfe8', '#c4b5fd', '#bae6fd', '#bbf7d0'][Math.floor(Math.random() * 4)], drift: -12 + Math.random() * 24 }] : current), 1050);
    return () => window.clearInterval(timer);
  }, [active, tab]);
  useEffect(() => () => { if (musicTimer.current) window.clearInterval(musicTimer.current); }, []);

  const toggleMusic = () => {
    if (music) { if (musicTimer.current) window.clearInterval(musicTimer.current); setMusic(false); return; }
    setMusic(true);
    musicTimer.current = window.setInterval(() => playTone('sparkle', sound), 850);
  };
  const popBubble = (bubble: Bubble) => {
    playTone('pop', sound);
    setBubbles((current) => current.filter((item) => item.id !== bubble.id));
    setMessage(affirmations[Math.floor(Math.random() * affirmations.length)]);
    setPopped((current) => current + 1);
  };
  const addCustomIngredient = () => {
    const name = customIngredientName.trim();
    if (!name || availableIngredients.some((item) => item.name === name)) return;
    const colors = ['#fb7185', '#fbbf24', '#60a5fa', '#34d399', '#c084fc', '#f97316'];
    const item = { name, emoji: customIngredientEmoji.trim() || '🍽️', color: colors[availableIngredients.length % colors.length] };
    setAvailableIngredients((current) => [...current, item]);
    setCustomIngredientName('');
    setCustomIngredientEmoji('🍽️');
    playTone('sparkle', sound);
  };
  const kindLabel = recipeKind === 'smoothie' ? 'العصير' : recipeKind === 'recipe' ? 'الوصفة' : 'المشروب';
  const blend = () => {
    if (!items.length || blending) return;
    setBlending(true); playTone('blend', sound);
    window.setTimeout(() => { setBlending(false); setReady(true); setSmoothieColor(items[Math.floor(Math.random() * items.length)].color); playTone('sparkle', sound); }, 1300);
  };
  const toggleDecor = (id: string) => setDecor((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const title = useMemo(() => tab === 'room' ? 'قصر الأميرة سندس' : tab === 'bubbles' ? 'فقاعات الأمنيات' : 'مطبخ العصائر الملكي', [tab]);

  if (!active) return null;
  return <section className="princess-page" aria-labelledby="princess-title">
    <header className="princess-hero"><div><span className="princess-kicker"><Sparkles size={15} /> عالم سندس السحري</span><h1 id="princess-title">الأميرة سندس</h1><p>لعبة خيالية مليئة بالنجوم والراحة والمرح.</p></div><div className="princess-crown">👑</div></header>
    <div className="princess-toolbar"><div className="princess-tabs" role="tablist">{([{ id: 'room', label: 'القصر', icon: Home }, { id: 'bubbles', label: 'الأمنيات', icon: Star }, { id: 'smoothie', label: 'العصائر', icon: Coffee }] as const).map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} /> {label}</button>)}</div><div className="princess-audio"><button type="button" onClick={toggleMusic} aria-label={music ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}>{music ? <Pause size={17} /> : <Play size={17} />}</button><button type="button" onClick={() => setSound((value) => !value)} aria-label={sound ? 'كتم المؤثرات' : 'تشغيل المؤثرات'}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div></div>
    <div className="princess-section-title"><div><span className="section-kicker">مغامرة اليوم</span><h2>{title}</h2></div><span className="princess-score"><Sparkles size={14} /> {popped} أمنية</span></div>
    {tab === 'room' && <div className="princess-room-layout"><div className="princess-scene"><div className="scene-glow" />{decor.includes('stars') && <div className="scene-stars">✦ ✧ ★ ✦ ✧</div>}<img className="princess-character" src={look.image} alt="الأميرة سندس في القصر" />{decor.includes('flowers') && <div className="scene-flowers">🌸 🌷 🌸</div>}<button type="button" className="photo-button" onClick={() => { setPhotoFlash(true); playTone('sparkle', sound); window.setTimeout(() => setPhotoFlash(false), 500); }}><Camera size={16} /> لقطة سحرية</button>{photoFlash && <div className="photo-flash" aria-hidden="true"><Camera size={42} /></div>}<div className="scene-caption">سندس حارسة النجوم ✨</div></div><aside className="princess-controls"><h3><Shirt size={18} /> لوحة الألوان والفساتين</h3><p className="look-help">اختاري نسخة لتطبيق الفستان والخلفية على الصورة نفسها:</p><div className="look-grid">{looks.map((item) => <button type="button" key={item.id} className={look.id === item.id ? 'selected' : ''} onClick={() => { setLook(item); playTone('sparkle', sound); }}><img src={item.image} alt={item.name} /><span className="look-swatch" style={{ backgroundColor: item.color }} /><strong>{item.emoji} {item.name}</strong><small>{item.dress}</small><em>{item.background}</em></button>)}</div><h3><Flower2 size={18} /> ديكور القصر</h3><div className="decor-grid"><button type="button" className={decor.includes('stars') ? 'selected' : ''} onClick={() => toggleDecor('stars')}>✨ النجوم</button><button type="button" className={decor.includes('flowers') ? 'selected' : ''} onClick={() => toggleDecor('flowers')}>🌸 الزهور</button></div><div className="outfit-note"><span style={{ backgroundColor: look.color }} /> إطلالة اليوم: <strong>{look.dress}</strong><small> · {look.background}</small></div></aside></div>}
    {tab === 'bubbles' && <div className="bubble-game"><div className="affirmation-card"><Sparkles size={20} /><p>«{message}»</p><small>اضغطي الفقاعات لتغيير الرسالة</small></div><div className="bubble-stage">{!bubbles.length && <span className="bubble-hint">تظهر الأمنيات هنا… ✨</span>}{bubbles.map((bubble) => <button type="button" key={bubble.id} className="wish-bubble" onClick={() => popBubble(bubble)} style={{ left: `${bubble.x}%`, width: bubble.size, height: bubble.size, backgroundColor: bubble.color, ['--bubble-drift' as string]: `${bubble.drift}px`, animationDuration: `${4 + bubble.size / 30}s` }}>✦</button>)}</div></div>}
    {tab === 'smoothie' && <div className="smoothie-game"><div className="blender-card"><div className={`blender-cup ${blending ? 'blending' : ''}`} style={ready ? { background: `linear-gradient(160deg, ${smoothieColor}, #fff1f2)` } : undefined}>{ready ? (recipeKind === 'recipe' ? '🍲' : recipeKind === 'drink' ? '🧋' : '🥤') : items.map((item, index) => <span key={`${item.name}-${index}`}>{item.emoji}</span>)}{blending && <i>🌀</i>}</div><p>{ready ? `${kindLabel} الملكي جاهز لسندس! ✨` : `اختاري مكونات ${kindLabel} (${items.length}/8)`}</p><div className="blender-actions"><button type="button" onClick={blend} disabled={!items.length || blending}><Sparkles size={15} /> {blending ? 'جاري التحضير…' : `اصنعي ${kindLabel}`}</button><button type="button" onClick={() => { setItems([]); setReady(false); }} aria-label="إعادة ضبط"><RefreshCw size={16} /></button></div></div><div className="ingredients-card"><h3><Coffee size={18} /> مطبخ سندس المفتوح</h3><div className="recipe-kind" role="group" aria-label="نوع التحضير">{([{ id: 'smoothie', label: 'عصير', emoji: '🥤' }, { id: 'recipe', label: 'وصفة', emoji: '🍲' }, { id: 'drink', label: 'مشروب', emoji: '🧋' }] as const).map((kind) => <button type="button" key={kind.id} className={recipeKind === kind.id ? 'selected' : ''} onClick={() => { setRecipeKind(kind.id); setReady(false); }}><span>{kind.emoji}</span>{kind.label}</button>)}</div><div className="ingredients-grid">{availableIngredients.map((item) => <button type="button" key={item.name} disabled={items.length >= 8 || blending} onClick={() => { setItems((current) => current.length < 8 ? [...current, item] : current); setReady(false); playTone('pop', sound); }}><span>{item.emoji}</span><small>{item.name}</small>{items.includes(item) && <Check size={13} />}</button>)}</div><div className="custom-ingredient"><strong>أضيفي أي مكوّن من عندك</strong><div className="custom-ingredient-fields"><input value={customIngredientName} onChange={(event) => setCustomIngredientName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addCustomIngredient(); }} placeholder="مثال: تفاح، نعناع، قرفة…" maxLength={30} /><input className="emoji-input" value={customIngredientEmoji} onChange={(event) => setCustomIngredientEmoji(event.target.value)} aria-label="رمز المكوّن" maxLength={3} /><button type="button" onClick={addCustomIngredient} disabled={!customIngredientName.trim()}>إضافة</button></div><small>سيظهر المكوّن الجديد في القائمة ويمكنك إدخاله في أي عصير أو وصفة أو مشروب.</small></div></div></div>}
    <p className="princess-footer"><Sparkles size={14} /> كل ضغطة تصنع لحظة جميلة للأميرة سندس <Sparkles size={14} /></p>
  </section>;
}
