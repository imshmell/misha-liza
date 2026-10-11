import { useEffect, useRef, useState } from "react";

// Маршрут пробежки пунктиром: рисуется, когда секция в кадре (маска-сплошная линия «протягивает» пунктир).
const D =
  "M40 40 C 400 -10, 820 40, 880 160 S 860 420, 900 520 S 700 600, 640 700 S 760 900, 900 980";

export function RunRoute({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio > 0.4) {
        setOn(true);
        io.disconnect();
      }
    }, { threshold: [0, 0.4] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <svg ref={ref} className={`run-route ${on ? "on" : ""} ${className}`} viewBox="0 0 940 1020" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <mask id="run-route-mask" maskUnits="userSpaceOnUse">
          <path d={D} pathLength={1} className="run-route-draw" />
        </mask>
      </defs>
      <path d={D} className="run-route-line" mask="url(#run-route-mask)" />
      <circle cx="40" cy="40" r="7" className="run-route-start" />
      <g className="run-route-pin" transform="translate(900 980)">
        <path d="M0 0 C-14 -16 -20 -26 -20 -36 a20 20 0 0 1 40 0 c0 10 -6 20 -20 36z" />
        <path d="M0 -26c-4-3-7-6-7-9a3.5 3.5 0 0 1 7-1.5 3.5 3.5 0 0 1 7 1.5c0 3-3 6-7 9z" className="run-route-heart" />
      </g>
    </svg>
  );
}
