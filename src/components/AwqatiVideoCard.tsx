import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Film, LoaderCircle, RotateCw } from 'lucide-react';

type VideoItem = {
  id: string;
  title: string;
  mimeType: string;
  byteSize: number;
  durationSeconds: number;
};

type Props = {
  active: boolean;
  apiBaseUrl: string | null;
};

export default function AwqatiVideoCard({ active, apiBaseUrl }: Props) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (!apiBaseUrl) {
      setStatus('error');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    fetch(`${apiBaseUrl}/v1/media`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('تعذّر جلب قائمة الفيديوهات.');
        const payload = await response.json() as { videos?: VideoItem[] };
        const availableVideos = Array.isArray(payload.videos)
          ? payload.videos.filter((video) => typeof video.id === 'string' && typeof video.title === 'string')
          : [];
        if (!availableVideos.length) throw new Error('لا توجد فيديوهات مضافة بعد.');
        setVideos(availableVideos);
        setSelectedIndex(0);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn('[Awqati] Could not load videos:', error);
        setStatus('error');
      });

    return () => controller.abort();
  }, [active, apiBaseUrl, reloadKey]);

  if (!active) return null;

  const currentVideo = videos[selectedIndex];
  const videoUrl = currentVideo && apiBaseUrl
    ? `${apiBaseUrl}/v1/media/${encodeURIComponent(currentVideo.id)}`
    : '';
  const moveSelection = (offset: -1 | 1) => {
    setSelectedIndex((index) => (index + offset + videos.length) % videos.length);
  };

  return (
    <section className="awqati-video-card" aria-labelledby="awqati-video-title">
      <div className="awqati-video-heading">
        <div className="awqati-video-icon"><Film size={21} /></div>
        <div className="awqati-video-copy">
          <span className="section-kicker">لحظات سندس</span>
          <h3 id="awqati-video-title">فيديوهاتك المفضلة</h3>
          <p>اختاري مقطعًا وشاهديه مباشرة من بطاقة أوقاتي.</p>
        </div>
        {status === 'ready' && videos.length > 1 && (
          <div className="awqati-video-controls" aria-label="اختيار الفيديو">
            <button type="button" onClick={() => moveSelection(-1)} aria-label="الفيديو السابق"><ChevronRight size={19} /></button>
            <span>{selectedIndex + 1} / {videos.length}</span>
            <button type="button" onClick={() => moveSelection(1)} aria-label="الفيديو التالي"><ChevronLeft size={19} /></button>
          </div>
        )}
      </div>

      {status === 'loading' && <div className="awqati-video-message" role="status"><LoaderCircle className="awqati-spin" size={20} /> جارٍ تحميل الفيديوهات…</div>}
      {status === 'error' && (
        <div className="awqati-video-message awqati-video-error" role="status">
          <span>تعذّر تحميل الفيديو الآن. تحققي من الاتصال ثم أعيدي المحاولة.</span>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}><RotateCw size={16} /> إعادة المحاولة</button>
        </div>
      )}
      {status === 'ready' && currentVideo && (
        <div className="awqati-video-player-wrap">
          <video
            key={currentVideo.id}
            className="awqati-video-player"
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
            aria-label={currentVideo.title}
          >
            المتصفح لا يدعم تشغيل الفيديو.
          </video>
          <div className="awqati-video-caption"><strong>{currentVideo.title}</strong><span>اضغطي تشغيل للمشاهدة</span></div>
        </div>
      )}
    </section>
  );
}
