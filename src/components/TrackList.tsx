import type { Track } from "@/lib/story";
import { trackKey, useAudio } from "./AudioProvider";

interface TrackListProps {
  tracks: Track[];
  side?: string;
  label?: string;
  note?: string;
  tone?: "dark" | "light";
  bare?: boolean;
  startAt?: number;
}

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "трек" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "трека" : "треков");

export function TrackList({ tracks, side = "A", label, note, tone = "dark", bare = false, startAt = 1 }: TrackListProps) {
  const { current, playing, missing, toggle } = useAudio();
  if (!tracks.length) return null;

  return (
    <div className={`sl ${tone === "light" ? "sl-dark" : "sl-lt"} ${bare ? "sl-bare" : ""}`}>
      <div className="sl-h">
        <span className="caps">
          сторона {side} · {String(tracks.length).padStart(2, "0")} {plural(tracks.length)}
        </span>
        {label && <span className="sl-label">{label}</span>}
      </div>
      {tracks.map((t, i) => {
        const active = current && trackKey(current) === trackKey(t);
        const isPlaying = !!active && playing;
        return (
          <div key={trackKey(t)} className={`tr ${active ? "is-active" : ""} ${missing.has(trackKey(t)) ? "is-missing" : ""}`}>
            <span className="tr-n">{String(i + startAt).padStart(2, "0")}</span>
            <button type="button" className="tr-pl" onClick={() => toggle(t)} aria-label={`${isPlaying ? "Пауза" : "Слушать"}: ${t.artist} — ${t.title}`}>
              {isPlaying ? (
                <span className="eq"><i /><i /><i /></span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 2.5v9l7.5-4.5z" fill="currentColor" /></svg>
              )}
            </button>
            <div className="tr-body">
              <div className="tr-t">{t.title}</div>
              <div className="tr-a">{t.artist}</div>
              {t.note && <div className="tr-nt">{t.note}</div>}
            </div>
          </div>
        );
      })}
      {note && <p className="sl-note">{note}</p>}
    </div>
  );
}
