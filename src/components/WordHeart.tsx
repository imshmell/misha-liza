import { useEffect, useId, useRef } from "react";

const HEART = "M320 560 C120 420 0 300 0 170 C0 70 80 0 175 0 C240 0 295 40 320 95 C345 40 400 0 465 0 C560 0 640 70 640 170 C640 300 520 420 320 560 Z";

// speed — px контура в секунду (знак = направление: соседние кольца едут навстречу)
const RINGS = [
  { scale: 1, size: 30, weight: 600, color: "#551515", speed: 26, words: "любовь · верность · нежность · забота · доверие · любовь · тепло · смех · уют · поддержка · нежность · любовь · верность · забота · доверие · тепло · смех · любовь · нежность" },
  { scale: 0.76, size: 34, weight: 400, color: "#7a2a2a", speed: -22, words: "нежность · любовь · забота · верность · тепло · доверие · смех · любовь · уют · нежность · верность · забота · любовь · тепло · смех · доверие · уют" },
  { scale: 0.54, size: 42, weight: 600, color: "#551515", speed: 20, words: "верность · любовь · нежность · забота · доверие · любовь · тепло · смех · верность · уют · любовь · нежность" },
  { scale: 0.33, size: 56, weight: 400, color: "#C21807", speed: -16, words: "любовь · любовь · любовь · любовь · любовь · любовь · любовь · любовь" },
];

const ACCENT = new Set(["любовь", "верность"]);

const LIGHT = ["#F1E9D8", "rgba(243,227,221,.8)", "#F1E9D8", "#F3A9C0"];

export function WordHeart({ size = 560, center = "Л + М", light = false }: { size?: number; center?: string; light?: boolean }) {
  const id = `hrt-${useId().replace(/:/g, "")}`;
  const svg = useRef<SVGSVGElement>(null);

  // бегущая строка по контуру: в textPath две копии фразы; межбуквенный интервал подгоняется так,
  // чтобы одна копия была ровно длиной контура — тогда сдвиг startOffset на длину контура бесшовен
  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const path = root.querySelector<SVGPathElement>(`#${id}`)!;
    const L = path.getTotalLength();
    const texts = [...root.querySelectorAll<SVGTextElement>(".wh-ring")];
    const paths = texts.map((t) => t.querySelector("textPath")!);
    const measures = [...root.querySelectorAll<SVGTextElement>(".wh-measure")];
    const offs = RINGS.map(() => 0);
    let raf = 0;
    let last = 0;
    let visible = false;

    const fit = () => {
      measures.forEach((m, i) => {
        const chars = m.textContent!.length;
        const natural = m.getComputedTextLength();
        texts[i].style.letterSpacing = `${1 + (L - natural) / chars}px`;
      });
    };
    fit();
    document.fonts.ready.then(fit);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      RINGS.forEach((r, i) => {
        offs[i] = (((offs[i] - r.speed * dt) % L) + L) % L; // 0..L
        paths[i].setAttribute("startOffset", String(-offs[i]));
      });
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !reduce;
      last = 0;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [id]);

  return (
    <svg ref={svg} width={size} height={size * 0.907} viewBox="-20 -20 680 620" role="img" aria-label="Сердце из слов" className="word-heart">
      <defs>
        <path id={id} d={HEART} />
      </defs>
      {RINGS.map((r, i) => {
        const words = r.words.split(" · ");
        const style = { fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: r.size, fontWeight: r.weight, letterSpacing: 1 } as const;
        const copy = (k: number) =>
          words.map((w, j) => (
            <tspan key={`${k}-${j}`} fill={i < 3 && j % 5 === 0 && ACCENT.has(w) ? (light ? "#F3A9C0" : "#C21807") : undefined}>
              {w + " · "}
            </tspan>
          ));
        return (
          <g key={i} transform={`translate(320 290) scale(${r.scale}) translate(-320 -290)`}>
            <text className="wh-measure" style={style} visibility="hidden">
              {r.words + " · "}
            </text>
            <text className="wh-ring" style={style} fill={light ? LIGHT[i] : r.color}>
              <textPath href={`#${id}`}>
                {copy(0)}
                {copy(1)}
              </textPath>
            </text>
          </g>
        );
      })}
      <text x="320" y="300" textAnchor="middle" style={{ fontFamily: "'Marck Script', cursive", fontSize: 54 }} fill={light ? "#F1E9D8" : "#551515"}>
        {center}
      </text>
    </svg>
  );
}
