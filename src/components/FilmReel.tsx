import type { ReactNode } from "react";

interface FilmReelProps {
  items: ReactNode[];
  label?: string;
  secondsPerFrame?: number;
}

// Непрерывная лента: кадры едут вбок сами, при наведении — стоп. Контент продублирован для бесшовного цикла.
export function FilmReel({ items, label, secondsPerFrame = 6 }: FilmReelProps) {
  const loop = [...items, ...items];
  return (
    <div className="reel" style={{ ["--reel-dur" as string]: `${items.length * secondsPerFrame}s` }}>
      <div className="spr spr-top" />
      <div className="spr spr-bot" />
      <span className="caps reel-code reel-code-a">35 мм · 400 · 11</span>
      <span className="caps reel-code reel-code-b">12 ▸ 12A</span>
      <span className="caps reel-code reel-code-c">13</span>
      <div className="reel-track">
        {loop.map((node, i) => (
          <div key={i} className="reel-frame">
            {node}
            <span className="caps reel-num">{String((i % items.length) + 1).padStart(2, "0")}A</span>
          </div>
        ))}
      </div>
      {label && <span className="caps reel-label">{label}</span>}
    </div>
  );
}
