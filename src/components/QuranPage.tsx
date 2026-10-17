import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Download, Headphones, LoaderCircle, Pause, Play, Radio, RotateCcw } from 'lucide-react';

type Surah = { number: number; name: string; englishName: string; numberOfAyahs: number; revelationType: 'Meccan' | 'Medinan' };
type Props = { active: boolean; onBack: () => void };

const API_URL = 'https://api.alquran.cloud/v1/surah';
const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy';
const RECITER_NAME = 'مشاري راشد العفاسي';

export default function QuranPage({ active, onBack }: Props) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selected, setSelected] = useState(() => Number(localStorage.getItem('sonds-quran-surah') || 1));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL)
      .then((response) => { if (!response.ok) throw new Error('network'); return response.json() as Promise<{ data: Surah[] }>; })
      .then((result) => { if (!cancelled) setSurahs(result.data); })
      .catch(() => { if (!cancelled) setError('تعذر تحميل قائمة السور. تحققي من اتصال الإنترنت.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { localStorage.setItem('sonds-quran-surah', String(selected)); }, [selected]);
  const current = surahs.find((surah) => surah.number === selected);
  const audioUrl = `${AUDIO_BASE}/${selected}.mp3`;
  const filtered = useMemo(() => surahs.filter((surah) => `${surah.number} ${surah.name} ${surah.englishName}`.toLowerCase().includes(search.toLowerCase())), [surahs, search]);

  const chooseSurah = (number: number) => { setSelected(number); setPlaying(false); setAudioError(''); };
  const handleAudioError = () => { setPlaying(false); setAudioError('تعذر تشغيل التلاوة الآن. جرّبي الضغط مرة أخرى.'); };

  return <section hidden={!active} className="quran-page">
    <button type="button" className="quran-back" onClick={onBack}><ChevronRight size={18} /> العودة إلى قائمة سندس</button>
    <header className="quran-hero"><div><span className="quran-kicker"><BookOpen size={16} /> القرآن الكريم</span><h2>استمعي إلى القرآن كاملًا</h2><p>114 سورة بصوت {RECITER_NAME} بجودة MP3، مع حفظ آخر سورة اخترتها.</p></div><div className="quran-hero-icon"><Radio size={42} /></div></header>
    <div className="quran-player-card"><div className="quran-player-heading"><div><span>التلاوة الحالية</span><h3>{current ? `${current.number}. ${current.name}` : 'اختاري سورة'}</h3><small>{current ? `${current.numberOfAyahs} آية · ${current.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${RECITER_NAME}` : ''}</small></div><Headphones size={28} /></div><audio key={audioUrl} controls preload="none" src={audioUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={handleAudioError} /><div className="quran-player-actions"><a href={audioUrl} download={`${current?.number ?? selected}-${current?.englishName ?? 'quran'}.mp3`}><Download size={15} /> تنزيل MP3</a>{playing && <span><Pause size={14} /> التلاوة تعمل الآن</span>}</div>{audioError && <p className="quran-error">{audioError}</p>}</div>
    <div className="quran-toolbar"><div><span className="section-kicker">فهرس المصحف</span><h3>السور الكريمة <small>({surahs.length || 114})</small></h3></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحثي عن سورة..." aria-label="البحث عن سورة" /></div>
    {loading && <div className="quran-status"><LoaderCircle size={17} /> جارٍ تحميل قائمة السور من API القرآن...</div>}
    {error && <div className="quran-error"><RotateCcw size={16} /> {error}<button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button></div>}
    <div className="quran-surah-grid">{filtered.map((surah) => <button type="button" className={`quran-surah ${selected === surah.number ? 'selected' : ''}`} key={surah.number} onClick={() => chooseSurah(surah.number)}><span className="quran-surah-number">{surah.number}</span><span className="quran-surah-name"><strong>{surah.name}</strong><small>{surah.englishName} · {surah.numberOfAyahs} آية</small></span><span className="quran-surah-play">{selected === surah.number && playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</span></button>)}</div>
    <p className="quran-source">المصدر: Al Quran Cloud API وCDN الإسلامي · القارئ: {RECITER_NAME}</p>
  </section>;
}
