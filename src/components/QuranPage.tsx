import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronRight, Download, Headphones, LoaderCircle, Pause, Play, Radio, RotateCcw, WifiOff } from 'lucide-react';

type Surah = { number: number; name: string; englishName: string; numberOfAyahs: number; revelationType: 'Meccan' | 'Medinan' };
type Ayah = { number: number; numberInSurah: number; text: string; audio: string };
type Props = { active: boolean; onBack: () => void };
type SurahResponse = { data: Surah[] };
type AyahResponse = { data: { ayahs: Ayah[] } };

const API_URL = 'https://api.alquran.cloud/v1/surah';
const RECITER_ID = 'ar.mahermuaiqly';
const RECITER_NAME = 'ماهر المعيقلي';
const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.mahermuaiqly';
const CACHE_NAME = 'sonds-quran-maher-v1';

async function getCachedAudio(url: string): Promise<string> {
  if (!('caches' in window)) return url;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (!cached) return url;
  return URL.createObjectURL(await cached.blob());
}

export default function QuranPage({ active, onBack }: Props) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selected, setSelected] = useState(() => Number(localStorage.getItem('sonds-quran-surah') || 1));
  const [search, setSearch] = useState('');
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [audioSrc, setAudioSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [ayahLoading, setAyahLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [continuous, setContinuous] = useState(true);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL).then((response) => { if (!response.ok) throw new Error('network'); return response.json() as Promise<SurahResponse>; })
      .then((result) => { if (!cancelled) setSurahs(result.data); }).catch(() => { if (!cancelled) setError('تعذر تحميل قائمة السور. تحققي من اتصال الإنترنت.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAyahLoading(true); setAudioError(''); setCurrentAyah(0); setAutoPlaying(false); setAudioSrc('');
    fetch(`${API_URL}/${selected}/${RECITER_ID}`).then((response) => { if (!response.ok) throw new Error('network'); return response.json() as Promise<AyahResponse>; })
      .then((result) => { if (!cancelled) setAyahs(result.data.ayahs); }).catch(() => { if (!cancelled) setAudioError('تعذر تحميل آيات السورة.'); })
      .finally(() => { if (!cancelled) setAyahLoading(false); });
    localStorage.setItem('sonds-quran-surah', String(selected));
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    const loadAudio = async () => {
      const ayah = ayahs[currentAyah];
      if (!ayah) return;
      const src = await getCachedAudio(ayah.audio || `${AUDIO_BASE}/${ayah.number}.mp3`);
      if (!cancelled) setAudioSrc(src);
    };
    void loadAudio();
    return () => { cancelled = true; };
  }, [ayahs, currentAyah]);

  useEffect(() => () => { if (audioSrc.startsWith('blob:')) URL.revokeObjectURL(audioSrc); }, [audioSrc]);
  useEffect(() => { if (autoPlaying && audioSrc && audioRef.current) void audioRef.current.play().catch(() => setAutoPlaying(false)); }, [audioSrc, autoPlaying]);

  const current = surahs.find((surah) => surah.number === selected);
  const filtered = useMemo(() => surahs.filter((surah) => `${surah.number} ${surah.name} ${surah.englishName}`.toLowerCase().includes(search.toLowerCase())), [surahs, search]);
  const currentText = ayahs[currentAyah]?.text || '';

  const chooseSurah = (number: number) => { setSelected(number); setAudioError(''); };
  const handleEnded = () => {
    if (currentAyah < ayahs.length - 1) { setCurrentAyah((value) => value + 1); setAutoPlaying(true); return; }
    if (continuous && selected < 114) { setSelected((value) => value + 1); setAutoPlaying(true); }
    else setAutoPlaying(false);
  };
  const playAyah = (index: number) => { setCurrentAyah(index); setAutoPlaying(true); };
  const downloadOffline = async () => {
    if (!('caches' in window) || ayahs.length === 0) { setAudioError('التخزين دون إنترنت غير متاح في هذا الجهاز.'); return; }
    setDownloadProgress(0); const cache = await caches.open(CACHE_NAME);
    for (let i = 0; i < ayahs.length; i += 1) { const url = ayahs[i].audio || `${AUDIO_BASE}/${ayahs[i].number}.mp3`; if (!(await cache.match(url))) await cache.add(url); setDownloadProgress(Math.round(((i + 1) / ayahs.length) * 100)); }
    setOfflineReady(true); window.setTimeout(() => setDownloadProgress(null), 1800);
  };

  return <section hidden={!active} className="quran-page">
    <button type="button" className="quran-back" onClick={onBack}><ChevronRight size={18} /> العودة إلى قائمة سندس</button>
    <header className="quran-hero"><div><span className="quran-kicker"><BookOpen size={16} /> القرآن الكريم التعليمي</span><h2>تلاوة ماهر المعيقلي</h2><p>قراءة الآيات أثناء الاستماع، حفظ السورة دون إنترنت، وتشغيل متواصل للمصحف.</p></div><div className="quran-hero-icon"><Radio size={42} /></div></header>
    <div className="quran-player-card"><div className="quran-player-heading"><div><span>التلاوة الحالية</span><h3>{current ? `${current.number}. ${current.name}` : 'اختاري سورة'}</h3><small>{current ? `${current.numberOfAyahs} آية · ${current.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${RECITER_NAME}` : ''}</small></div><Headphones size={28} /></div>{ayahLoading ? <div className="quran-status"><LoaderCircle size={17} /> جارٍ تحميل آيات السورة...</div> : <><div className="quran-now-playing"><span>الآية {ayahs[currentAyah]?.numberInSurah || 1} من {ayahs.length}</span><strong>{currentText || 'اضغطي تشغيل لبدء التلاوة'}</strong></div><audio ref={audioRef} key={audioSrc} controls preload="none" src={audioSrc} onPlay={() => setAutoPlaying(true)} onPause={() => setAutoPlaying(false)} onEnded={handleEnded} onError={() => setAudioError('تعذر تشغيل التلاوة. قد تحتاجين للاتصال بالإنترنت أول مرة.')} /><div className="quran-player-actions"><button type="button" onClick={downloadOffline} disabled={downloadProgress !== null}><Download size={15} /> {downloadProgress === null ? 'حفظ السورة أوفلاين' : `جارٍ الحفظ ${downloadProgress}%`}</button><label><input type="checkbox" checked={continuous} onChange={(event) => setContinuous(event.target.checked)} /> تشغيل متواصل</label>{offlineReady && <span className="quran-offline-ready"><Check size={14} /> محفوظة أوفلاين</span>}</div></>}{audioError && <p className="quran-error"><WifiOff size={15} /> {audioError}</p>}</div>
    <details className="quran-learning-details"><summary><BookOpen size={16} /> عرض آيات السورة للتعلّم والاستماع</summary><div className="quran-ayah-list">{ayahs.map((ayah, index) => <button type="button" className={index === currentAyah ? 'active' : ''} key={ayah.number} onClick={() => playAyah(index)}><span>{ayah.numberInSurah}</span><p>{ayah.text}</p><Play size={15} fill="currentColor" /></button>)}</div></details>
    <div className="quran-toolbar"><div><span className="section-kicker">فهرس المصحف</span><h3>السور الكريمة <small>({surahs.length || 114})</small></h3></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحثي عن سورة..." aria-label="البحث عن سورة" /></div>
    {loading && <div className="quran-status"><LoaderCircle size={17} /> جارٍ تحميل قائمة السور من API القرآن...</div>}
    {error && <div className="quran-error"><RotateCcw size={16} /> {error}</div>}
    <div className="quran-surah-grid">{filtered.map((surah) => <button type="button" className={`quran-surah ${selected === surah.number ? 'selected' : ''}`} key={surah.number} onClick={() => chooseSurah(surah.number)}><span className="quran-surah-number">{surah.number}</span><span className="quran-surah-name"><strong>{surah.name}</strong><small>{surah.englishName} · {surah.numberOfAyahs} آية</small></span><span className="quran-surah-play" onClick={(event) => { event.stopPropagation(); chooseSurah(surah.number); playAyah(0); }}>{selected === surah.number && autoPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</span></button>)}</div>
    <div className="quran-learning-card"><BookOpen size={19} /><div><strong>وضع التعلّم</strong><p>اضغطي على أي آية من النص الظاهر أثناء التلاوة للاستماع إليها، وكرريها حتى تثبت الحفظ. ينتقل التطبيق تلقائيًا للآية التالية عند تفعيل التشغيل المتواصل.</p></div></div>
    <p className="quran-source">المصدر: Al Quran Cloud API وCDN الإسلامي · القارئ: {RECITER_NAME}</p>
  </section>;
}
