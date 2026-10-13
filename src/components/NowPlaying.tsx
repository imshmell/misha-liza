import { trackKey, useAudio } from "./AudioProvider";

export function NowPlaying() {
  const { current, playing, missing, toggle, stop } = useAudio();
  if (!current) return null;
  const isMissing = missing.has(trackKey(current));

  return (
    <div className="now-playing">
      <div className={`np-vinyl vinyl ${playing ? "spin" : ""}`} aria-hidden="true" />
      <div className="np-text">
        <span className="np-label">{isMissing ? "трек ещё не загружен" : playing ? "сейчас играет" : "на паузе"}</span>
        <b>
          {current.title} — <em>{current.artist}</em>
        </b>
      </div>
      {!isMissing && (
        <button type="button" className="np-btn" onClick={() => toggle(current)} aria-label={playing ? "Пауза" : "Играть"}>
          {playing ? (
            <svg viewBox="0 0 16 16"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 16 16"><path d="M5 3v10l8-5z" /></svg>
          )}
        </button>
      )}
      <button type="button" className="np-close" onClick={stop} aria-label="Закрыть">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </div>
  );
}
