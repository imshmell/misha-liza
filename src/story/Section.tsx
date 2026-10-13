import type { ReactNode } from "react";

export type Tone = "paper" | "blush" | "burgundy" | "night";

interface SectionProps {
  id: string;
  tone: Tone;
  className?: string;
  laceUp?: boolean;
  laceDn?: boolean;
  children: ReactNode;
}

// laceUp — кружевной край внизу (переход в светлую секцию), laceDn — сверху (из светлой)
export function Section({ id, tone, className = "", laceUp, laceDn, children }: SectionProps) {
  return (
    <section id={id} className={`s s-${tone} ${className}`} data-tone={tone}>
      {children}
      {laceDn && <div className="lace-dn" aria-hidden="true" />}
      {laceUp && <div className="lace-up" aria-hidden="true" />}
    </section>
  );
}

interface ChapterHeadProps {
  kicker: string;
  title: string;
  light?: boolean;
  meta?: string;
}

const tracksMeta = (n: number) => (n ? ` · ${String(n).padStart(2, "0")} ${n === 1 ? "трек" : n < 5 ? "трека" : "треков"}` : "");

export function ChapterHead({ kicker, title, light, meta }: ChapterHeadProps) {
  return (
    <header className={`ch-head ${light ? "ch-head-light" : ""}`} data-reveal="up">
      <span className="caps ch-kicker">
        глава {kicker}
        {meta}
      </span>
      <h2 className="ch-title">{title}</h2>
    </header>
  );
}

export { tracksMeta };

// eager — для первого экрана (hero): грузить сразу и с высоким приоритетом
export function Img({ src, alt = "", className = "", bw = false, eager = false }: { src: string; alt?: string; className?: string; bw?: boolean; eager?: boolean }) {
  return (
    <div className={`img-wrap grain ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        className={`img-cover ${bw ? "graded-bw" : "graded"}`}
      />
    </div>
  );
}
