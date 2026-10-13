import { useEffect, useRef, useState } from "react";
import { video as videoUrl } from "@/lib/media";

interface VideoPlayerProps {
  name: string;
  className?: string;
  round?: boolean;
  ring?: string;
  /** true — пауза + звук; "sound" — только кнопка звука; false — без кнопок */
  controls?: boolean | "sound";
  /** пробовать сразу со звуком (браузер разрешит после любого клика/клавиши на странице), иначе — без звука */
  sound?: boolean;
  fit?: "cover" | "contain";
}

const SoundIcon = ({ muted }: { muted: boolean }) =>
  muted ? (
    <svg viewBox="0 0 18 18"><path d="M2 7h3l4-3v10l-4-3H2z" /><path d="M12 7l4 4M16 7l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
  ) : (
    <svg viewBox="0 0 18 18"><path d="M2 7h3l4-3v10l-4-3H2z" /><path d="M12 6.5a3.5 3.5 0 0 1 0 5M14 4.5a6.3 6.3 0 0 1 0 9" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
  );

// Автоплей без звука (браузеры блокируют автоплей со звуком), играет только когда виден на экране.
export function VideoPlayer({ name, className = "", round = false, ring, controls = true, sound = false, fit = "cover" }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const userPaused = useRef(false);
  const userMuted = useRef(false);
  const [near, setNear] = useState(false);
  const { src, poster } = videoUrl(name);

  // ничего не качаем, пока видео не подъехало к экрану (за экран до него)
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "100% 100%" } // и по горизонтали — кадры в лентах едут сбоку
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !near) return; // src ещё не выставлен — play() бы упал
    const playMuted = () => {
      el.muted = true;
      setMuted(true);
      return el.play().then(() => setPaused(false)).catch(() => setPaused(true));
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          if (sound && !userMuted.current) {
            el.muted = false;
            el.play()
              .then(() => {
                setMuted(false);
                setPaused(false);
              })
              .catch(playMuted);
          } else el.play().then(() => setPaused(false)).catch(() => setPaused(true));
        } else if (!entry.isIntersecting) {
          el.pause();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    const onTime = () => el.duration && setProgress(el.currentTime / el.duration);
    if (ring) el.addEventListener("timeupdate", onTime);
    return () => {
      io.disconnect();
      el.removeEventListener("timeupdate", onTime);
    };
  }, [ring, sound, near]);

  function togglePlay() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      userPaused.current = false;
      el.play();
      setPaused(false);
    } else {
      userPaused.current = true;
      el.pause();
      setPaused(true);
    }
  }

  function toggleSound() {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    userMuted.current = el.muted;
    setMuted(el.muted);
    if (!el.muted && el.paused) {
      userPaused.current = false;
      el.play();
      setPaused(false);
    }
  }

  const C = 2 * Math.PI * 48;

  return (
    <div className={`vp-wrap ${className}`} style={{ position: "relative", width: "100%", height: "100%" }}>
      {ring && (
        <svg className="vp-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(241,233,216,.14)" strokeWidth="1" />
          <circle cx="50" cy="50" r="48" fill="none" stroke={ring} strokeWidth="1.6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
        </svg>
      )}
      <div className={`vp ${round ? "vp-round" : ""}`}>
        <video ref={ref} src={near ? src : undefined} poster={near ? poster : undefined} muted loop playsInline preload="none" style={{ objectFit: fit }} onClick={togglePlay} />
        {controls && (
          <div className="vp-controls">
            {controls === true && (
              <button type="button" className="gb" onClick={togglePlay} aria-label={paused ? "Играть" : "Пауза"}>
                {paused ? (
                  <svg viewBox="0 0 16 16"><path d="M5 3v10l8-5z" /></svg>
                ) : (
                  <svg viewBox="0 0 16 16"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
                )}
              </button>
            )}
            {/* пока звук выключен — заметная кнопка с подписью */}
            <button type="button" className={`gb gb-sound ${muted ? "is-muted" : ""}`} onClick={toggleSound} aria-label={muted ? "Включить звук" : "Выключить звук"}>
              <SoundIcon muted={muted} />
              {muted && !round && <span className="gb-label">звук</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
