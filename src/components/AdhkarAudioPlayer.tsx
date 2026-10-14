import { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, LoaderCircle, RefreshCw } from 'lucide-react';

type AdhkarTab = 'morning' | 'evening' | 'ruqyah';
type AudioTrack = { surah: number; title: string; url: string; tabs: AdhkarTab[] };
type AudioCatalog = { reciter: string; tracks: AudioTrack[] };
type ApiMoshaf = { server?: string; surah_list?: string };
type ApiReciter = { id: number; name: string; moshaf?: ApiMoshaf[] };
type ApiResponse = { reciters?: ApiReciter[] };

type Props = { active: boolean; tab: AdhkarTab; onPlay: () => void };

const RECITER_ID = 123; // Mishary Al-Afasy
const API_URL = `https://mp3quran.net/api/v3/reciters?language=ar&reciter=${RECITER_ID}`;
const AUDIO_SURAH_OPTIONS: Array<{ surah: number; title: string; tabs: AdhkarTab[] }> = [
  { surah: 1, title: 'سورة الفاتحة', tabs: ['ruqyah'] },
  { surah: 2, title: 'سورة البقرة كاملة', tabs: ['ruqyah'] },
  { surah: 112, title: 'سورة الإخلاص', tabs: ['morning', 'evening', 'ruqyah'] },
  { surah: 113, title: 'سورة الفلق', tabs: ['morning', 'evening', 'ruqyah'] },
  { surah: 114, title: 'سورة الناس', tabs: ['morning', 'evening', 'ruqyah'] },
];

async function loadAudioCatalog(signal: AbortSignal): Promise<AudioCatalog> {
  const response = await fetch(API_URL, { signal });
  if (!response.ok) throw new Error('audio_api_unavailable');
  const data = (await response.json()) as ApiResponse;
  const reciter = data.reciters?.find((item) => item.id === RECITER_ID);
  if (!reciter?.moshaf?.length) throw new Error('reciter_not_found');

  const desiredSurahs = new Set(AUDIO_SURAH_OPTIONS.map((item) => item.surah));
  const editions = reciter.moshaf.map((edition) => {
    const available = new Set((edition.surah_list ?? '').split(',').map(Number).filter(Number.isInteger));
    return { edition, available, score: [...desiredSurahs].filter((surah) => available.has(surah)).length };
  }).sort((a, b) => b.score - a.score);
  const selected = editions[0];
  if (!selected?.edition.server || selected.score === 0) throw new Error('audio_tracks_unavailable');

  const server = new URL(selected.edition.server);
  if (server.protocol !== 'https:' || !(server.hostname === 'mp3quran.net' || server.hostname.endsWith('.mp3quran.net'))) {
    throw new Error('untrusted_audio_host');
  }
  const base = selected.edition.server.endsWith('/') ? selected.edition.server : `${selected.edition.server}/`;
  const tracks = AUDIO_SURAH_OPTIONS.filter((item) => selected.available.has(item.surah)).map((item) => ({
    ...item,
    url: new URL(`${String(item.surah).padStart(3, '0')}.mp3`, base).toString(),
  }));
  return { reciter: reciter.name, tracks };
}

export default function AdhkarAudioPlayer({ active, tab, onPlay }: Props) {
  const [catalog, setCatalog] = useState<AudioCatalog | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setStatus('loading');
    setPlaybackError(false);
    loadAudioCatalog(controller.signal)
      .then((result) => {
        setCatalog(result);
        setStatus('ready');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCatalog(null);
        setStatus('error');
      });
    return () => controller.abort();
  }, [active, retry]);

  const visibleTracks = useMemo(() => catalog?.tracks.filter((track) => track.tabs.includes(tab)) ?? [], [catalog, tab]);
  const selectedTrack = visibleTracks.find((track) => track.surah === selectedSurah) ?? visibleTracks[0];

  useEffect(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setSelectedSurah(null);
    setPlaybackError(false);
  }, [tab]);

  useEffect(() => {
    if (!selectedTrack) return;
    if (selectedSurah !== selectedTrack.surah) setSelectedSurah(selectedTrack.surah);
  }, [selectedSurah, selectedTrack]);

  useEffect(() => {
    if (!active) audioRef.current?.pause();
  }, [active]);

  useEffect(() => {
    const pauseAudio = () => audioRef.current?.pause();
    window.addEventListener('adhkar:stop-mp3', pauseAudio);
    return () => window.removeEventListener('adhkar:stop-mp3', pauseAudio);
  }, []);

  const sectionTitle = tab === 'ruqyah' ? 'سور قرآنية للرقية' : 'السور القرآنية المرافقة للأذكار';
  const loadingLabel = 'جارٍ تحميل قائمة التلاوات الصوتية…';

  return <section className="adhkar-audio-card" aria-label="تلاوات الأذكار والرقية بصيغة MP3">
    <div className="adhkar-audio-heading">
      <span className="adhkar-audio-icon"><Headphones size={20} /></span>
      <div className="adhkar-audio-copy"><span className="section-kicker">مشغل MP3 عبر الإنترنت</span><h3>{sectionTitle}</h3><p>تلاوة مشاري العفاسي للسور القرآنية المتاحة في هذا القسم.</p></div>
    </div>
    {status === 'loading' && <p className="adhkar-audio-state" role="status"><LoaderCircle size={16} className="adhkar-audio-spinner" /> {loadingLabel}</p>}
    {status === 'error' && <div className="adhkar-audio-error" role="status"><span>تعذّر تحميل قائمة MP3. يمكنك متابعة القراءة الصوتية الموجودة في الصفحة.</span><button type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={14} /> إعادة المحاولة</button></div>}
    {status === 'ready' && !selectedTrack && <p className="adhkar-audio-state">لا توجد تلاوات متاحة لهذا القسم حاليًا.</p>}
    {status === 'ready' && selectedTrack && <div className="adhkar-audio-controls">
      <label className="adhkar-audio-select"><span>اختاري السورة</span><select value={selectedTrack.surah} onChange={(event) => { audioRef.current?.pause(); setPlaybackError(false); setSelectedSurah(Number(event.target.value)); }}>
        {visibleTracks.map((track) => <option value={track.surah} key={track.surah}>{track.title}</option>)}
      </select></label>
      <audio key={selectedTrack.url} ref={audioRef} className="adhkar-audio-element" controls preload="none" src={selectedTrack.url} aria-label={`${selectedTrack.title} بصوت ${catalog?.reciter ?? 'مشاري العفاسي'}`} onPlay={onPlay} onError={() => setPlaybackError(true)} onCanPlay={() => setPlaybackError(false)}>
        المتصفح لا يدعم تشغيل ملفات الصوت.
      </audio>
      {playbackError && <p className="adhkar-audio-error-message" role="alert">تعذّر تشغيل الملف الصوتي. اختاري سورة أخرى أو أعيدي المحاولة لاحقًا.</p>}
    </div>}
    <p className="adhkar-audio-attribution">تلاوات MP3 تُبث مباشرةً من <a href="https://mp3quran.net/eng/api" target="_blank" rel="noreferrer">MP3Quran.net</a> وتحتاج اتصالًا بالإنترنت. صوت بقية الأذكار والأدعية متاح من زر «قراءة صوتية».</p>
  </section>;
}
