import { useState } from 'react';
import { FileAudio, FileImage, FileVideo, Plus, Save, Trash2, Upload, X } from 'lucide-react';

export type PrivateMedia = { name: string; type: string; dataUrl: string };
export type PrivateCard = { id: string; title: string; text: string; media?: PrivateMedia; createdAt: number };
type Props = { active: boolean; cards: PrivateCard[]; onCardsChange: (cards: PrivateCard[]) => void; onBack: () => void };

const mediaIcon = (type: string) => type.startsWith('image/') ? <FileImage size={18} /> : type.startsWith('video/') ? <FileVideo size={18} /> : <FileAudio size={18} />;

export default function PrivacyPage({ active, cards, onCardsChange, onBack }: Props) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [media, setMedia] = useState<PrivateMedia | undefined>();
  const [error, setError] = useState('');
  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^(image|video|audio)\//.test(file.type)) { setError('اختاري صورة أو فيديو أو ملفًا صوتيًا فقط.'); return; }
    if (file.size > 1_500_000) { setError('حجم الملف يجب ألا يتجاوز 1.5 ميجابايت حتى يتم حفظه بأمان.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setMedia({ name: file.name, type: file.type, dataUrl: typeof reader.result === 'string' ? reader.result : '' }); setError(''); };
    reader.onerror = () => setError('تعذر قراءة الملف، جربي ملفًا آخر.');
    reader.readAsDataURL(file);
  };
  const saveCard = () => {
    if (!title.trim() && !text.trim() && !media) { setError('اكتبي شيئًا أو أرفقي ملفًا قبل الحفظ.'); return; }
    onCardsChange([{ id: `private-${Date.now()}`, title: title.trim() || 'بطاقتي الخاصة', text: text.trim(), media, createdAt: Date.now() }, ...cards]);
    setTitle(''); setText(''); setMedia(undefined); setError('');
  };
  return <section hidden={!active} className="privacy-page">
    <button type="button" className="privacy-back-button" onClick={onBack}><X size={18} /> العودة إلى قائمة سندس</button>
    <header className="privacy-hero"><div><span className="privacy-eyebrow">مساحة آمنة لكِ</span><h2>خصوصية سندس</h2><p>اكتبي أي ذكرى أو ملاحظة، وأرفقي صورة أو فيديو أو صوتًا للاحتفاظ به داخل التطبيق.</p></div><span className="privacy-hero-lock">♡</span></header>
    <section className="privacy-compose"><div className="privacy-section-title"><div><span className="section-kicker">بطاقة جديدة</span><h3>اكتبي واحفظي</h3></div><Save size={22} /></div><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان البطاقة (اختياري)" /><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="اكتبي أي شيء تحبين حفظه..." rows={5} /><label className="privacy-upload"><Upload size={19} /><span>{media ? media.name : 'إضافة صورة أو فيديو أو صوت'}</span><input type="file" accept="image/*,video/*,audio/*" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>{media && <div className="privacy-selected-file">{mediaIcon(media.type)}<span>{media.name}</span><button type="button" onClick={() => setMedia(undefined)} aria-label="إزالة الملف"><X size={15} /></button></div>}{error && <p className="privacy-error" role="alert">{error}</p>}<button type="button" className="privacy-save-button" onClick={saveCard}><Plus size={18} /> حفظ البطاقة</button></section>
    <div className="privacy-cards-heading"><div><span className="section-kicker">ذكرياتك وملاحظاتك</span><h3>{cards.length} بطاقات محفوظة</h3></div></div>
    <div className="privacy-cards">{cards.length === 0 ? <div className="privacy-empty">لا توجد بطاقات بعد. ابدئي بكتابة أول شيء خاص بكِ.</div> : cards.map((card) => <article className="privacy-card" key={card.id}><div className="privacy-card-heading"><div><span className="privacy-card-date">{new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(card.createdAt)}</span><h4>{card.title}</h4></div><button type="button" className="privacy-delete" onClick={() => onCardsChange(cards.filter((item) => item.id !== card.id))} aria-label={`حذف ${card.title}`}><Trash2 size={17} /></button></div>{card.text && <p>{card.text}</p>}{card.media?.type.startsWith('image/') && <img className="privacy-media-image" src={card.media.dataUrl} alt={card.media.name} />}{card.media?.type.startsWith('video/') && <video className="privacy-media-video" controls playsInline src={card.media.dataUrl} />}{card.media?.type.startsWith('audio/') && <audio className="privacy-media-audio" controls src={card.media.dataUrl} />}</article>)}</div>
    <p className="privacy-note">هذه المساحة خاصة داخل التطبيق. الملفات الصغيرة تُحفظ مع بيانات التطبيق وتدخل ضمن المزامنة عند توفر Neon.</p>
  </section>;
}
