import { useEffect, useRef, useState } from 'react';
import { Activity, Pause, Play, RotateCcw, Sparkles, Star, Timer, Trophy } from 'lucide-react';
import jumpRopeIllustration from '../assets/jump-rope-sundus.png';

export type JumpRopeStats = {
  sessions: number;
  totalJumps: number;
  bestJumps: number;
};

type JumpRopeActivityProps = {
  active: boolean;
  breakfastComplete: boolean;
  stats: JumpRopeStats;
  onSessionComplete: (jumps: number) => void;
};

const durationOptions = [30, 60, 90];
const formatTime = (seconds: number): string =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const formatNumber = (value: number): string => new Intl.NumberFormat('ar-EG').format(value);

export default function JumpRopeActivity({ active, breakfastComplete, stats, onSessionComplete }: JumpRopeActivityProps) {
  const [duration, setDuration] = useState(30);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [jumpCount, setJumpCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [tapPulse, setTapPulse] = useState(false);
  const completionRecorded = useRef(false);

  useEffect(() => {
    if (!isRunning) return undefined;
    const interval = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || secondsLeft !== 0 || completionRecorded.current) return;
    completionRecorded.current = true;
    setIsRunning(false);
    setIsFinished(true);
    onSessionComplete(jumpCount);
  }, [isRunning, secondsLeft, jumpCount, onSessionComplete]);

  const chooseDuration = (seconds: number): void => {
    if (isRunning) return;
    completionRecorded.current = false;
    setDuration(seconds);
    setSecondsLeft(seconds);
    setJumpCount(0);
    setIsFinished(false);
  };

  const toggleRound = (): void => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }
    if (secondsLeft === 0 || isFinished) {
      completionRecorded.current = false;
      setSecondsLeft(duration);
      setJumpCount(0);
      setIsFinished(false);
    }
    setIsRunning(true);
  };

  const resetRound = (): void => {
    completionRecorded.current = false;
    setIsRunning(false);
    setSecondsLeft(duration);
    setJumpCount(0);
    setIsFinished(false);
  };

  const countJump = (): void => {
    if (!isRunning || secondsLeft === 0) return;
    setJumpCount((count) => count + 1);
    setTapPulse((pulse) => !pulse);
  };

  const progress = ((duration - secondsLeft) / duration) * 100;
  const startLabel = isRunning ? 'إيقاف مؤقت' : isFinished ? 'جولة جديدة' : secondsLeft < duration ? 'استئناف الجولة' : 'ابدئي الجولة';

  return (
    <section hidden={!active} className="jump-rope-page">
      <div className="jump-rope-hero">
        <div className="jump-rope-hero-copy">
          <span className="jump-rope-kicker"><Sparkles size={15} /> حركة مرحة ونجوم</span>
          <h2>نطّي واجمعي النجوم!</h2>
          <p>{breakfastComplete ? 'سجّلتي الفطار! اختاري وقتًا تكونين فيه مرتاحة، ثم ابدئي جولة الحبل.' : 'بعد تسجيل الفطار، ارجعي هنا لجولة حبل مرحة عندما تكونين مستعدة.'}</p>
          <div className="jump-rope-reminder"><Activity size={16} /> نشاط اختياري — خذي راحة إذا شعرتِ بالتعب.</div>
        </div>
        <div className={`jump-rope-art ${isRunning ? 'jumping-now' : ''}`}>
          <img src={jumpRopeIllustration} alt="رسم سندس وهي تقفز بالحبل" />
          <span className="jump-art-star jump-art-star-one">✦</span>
          <span className="jump-art-star jump-art-star-two">★</span>
        </div>
      </div>

      <div className="jump-rope-layout">
        <section className="jump-game-card" aria-label="لعبة نط الحبل">
          <div className="jump-game-heading">
            <div className="jump-game-icon"><Timer size={21} /></div>
            <div><span className="section-kicker">تحدّي سريع</span><h2>استعدّي للجولة</h2></div>
          </div>

          <div className="jump-duration-picker" role="group" aria-label="اختيار مدة الجولة">
            {durationOptions.map((seconds) => (
              <button key={seconds} type="button" aria-pressed={duration === seconds} disabled={isRunning} onClick={() => chooseDuration(seconds)}>
                {seconds}<small>ثانية</small>
              </button>
            ))}
          </div>

          <div className="jump-round-status">
            <div className="jump-timer" role="timer" aria-label={`الوقت المتبقي ${formatTime(secondsLeft)}`}>{formatTime(secondsLeft)}</div>
            <div className="jump-counter"><strong>{formatNumber(jumpCount)}</strong><span>نطّة</span></div>
          </div>
          <div className="jump-progress" role="progressbar" aria-label="تقدم الجولة" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={duration - secondsLeft}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <button type="button" className={`jump-count-button ${tapPulse ? 'jump-tap-pulse' : ''}`} onClick={countJump} disabled={!isRunning} aria-label="عدّي قفزة واحدة">
            <span className="jump-count-button-number">{formatNumber(jumpCount)}</span>
            <strong>نطّة!</strong>
            <small>{isRunning ? 'اضغطي مع كل قفزة' : 'ابدئي الجولة أولاً'}</small>
          </button>

          <div className="jump-game-controls">
            <button type="button" className="jump-start-button" onClick={toggleRound}>{isRunning ? <Pause size={18} /> : <Play size={18} fill="currentColor" />} {startLabel}</button>
            <button type="button" className="jump-reset-button" onClick={resetRound} aria-label="إعادة ضبط الجولة"><RotateCcw size={17} /> إعادة</button>
          </div>
          <p className="jump-count-note">اضغطي زر «نطّة!» مع كل قفزة؛ التطبيق لا يرصد الحركة تلقائيًا.</p>
          {isFinished && <div className="jump-finish-banner" role="status"><Sparkles size={19} /><div><strong>رائعة يا سندس!</strong><span>أكملتِ الجولة وجمعتِ {formatNumber(jumpCount)} نطّة. حُفظ إنجازك.</span></div><Star size={19} fill="currentColor" /></div>}
        </section>

        <aside className="jump-stats-card" aria-label="إحصاءات نط الحبل">
          <div className="jump-stats-heading"><div className="jump-stats-icon"><Trophy size={20} /></div><div><span className="section-kicker">تقدّمك</span><h2>نجوم الحبل</h2></div></div>
          <div className="jump-stat-row"><span className="jump-stat-symbol">✦</span><div><strong>{formatNumber(stats.sessions)}</strong><small>جولات مكتملة</small></div></div>
          <div className="jump-stat-row"><span className="jump-stat-symbol">↗</span><div><strong>{formatNumber(stats.totalJumps)}</strong><small>قفزات مسجلة</small></div></div>
          <div className="jump-stat-row"><span className="jump-stat-symbol">★</span><div><strong>{formatNumber(stats.bestJumps)}</strong><small>أفضل جولة</small></div></div>
          <p className="jump-stats-footnote">إحصاءاتك محفوظة على الجهاز، ومنفصلة عن نقاط الوجبات.</p>
        </aside>
      </div>
    </section>
  );
}
