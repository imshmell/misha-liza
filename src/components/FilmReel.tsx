import type { ReactNode } from "react";
import { useMarquee } from "@/lib/useMarquee";

interface FilmReelProps {
  items: ReactNode[];
  label?: string;
}

// Непрерывная лента: кадры едут вбок сами, мышь над лентой — стоп, тянется мышью/пальцем. Контент продублирован для бесшовного цикла.
export function FilmReel({ items, label }: FilmReelProps) {
  const loop = [...items, ...items];
  const ref = useMarquee<HTMLDivElement>(70, -1);
  return (
    <div className="reel" ref={ref}>
      <div className="reel-track" data-track>
        {loop.map((node, i) => (
          // ячейка плёнки: кадр + своя перфорация сверху и снизу — едет вместе с кадром
          <div key={i} className="reel-cell">
            <div className="reel-frame">
              {node}
              <span className="caps reel-num">{String((i % items.length) + 1).padStart(2, "0")}A</span>
            </div>
          </div>
        ))}
      </div>
      {label && <span className="caps reel-label">{label}</span>}
    </div>
  );
}
