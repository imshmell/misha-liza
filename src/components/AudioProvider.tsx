import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { audio as audioUrl } from "@/lib/media";
import type { Track } from "@/lib/story";

interface AudioState {
  current: Track | null;
  playing: boolean;
  missing: Set<string>;
  toggle: (t: Track) => void;
  stop: () => void;
}

const Ctx = createContext<AudioState | null>(null);

export const trackKey = (t: Track) => `${t.artist}|${t.title}`;

export function AudioProvider({ children }: { children: ReactNode }) {
  const el = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const curKey = useRef("");

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.addEventListener("play", () => setPlaying(true));
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("ended", () => setPlaying(false));
    // «не загружен» — только при настоящей ошибке файла (404 и т.п.), а не когда переключили трек во время загрузки
    a.addEventListener("error", () => {
      setPlaying(false);
      if (curKey.current) setMissing((m) => new Set(m).add(curKey.current));
    });
    a.addEventListener("playing", () =>
      setMissing((m) => {
        if (!m.has(curKey.current)) return m;
        const n = new Set(m);
        n.delete(curKey.current);
        return n;
      })
    );
    el.current = a;
    return () => a.pause();
  }, []);

  const toggle = useCallback(
    (t: Track) => {
      const a = el.current;
      if (!a) return;
      if (current && trackKey(current) === trackKey(t)) {
        if (a.paused) a.play();
        else a.pause();
        return;
      }
      a.src = audioUrl(t.artist, t.title);
      curKey.current = trackKey(t);
      setCurrent(t);
      a.play().catch((e: DOMException) => {
        if (e.name !== "AbortError") setPlaying(false); // AbortError — просто нажали другой трек
      });
    },
    [current]
  );

  const stop = useCallback(() => {
    el.current?.pause();
    setCurrent(null);
  }, []);

  return <Ctx.Provider value={{ current, playing, missing, toggle, stop }}>{children}</Ctx.Provider>;
}

export function useAudio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAudio вне AudioProvider");
  return c;
}
