import { useId } from "react";

// Пластинка: вращается диск (канавки + лейбл с поцелуем и надписью по кругу), блик сверху неподвижен —
// так вращение хорошо заметно.
export function Vinyl({ playing = false, className = "" }: { playing?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const grooves = Array.from({ length: 34 }, (_, i) => 44 + i * 1.6);
  return (
    <div className={`vinyl2 ${className}`}>
      <svg className={`vinyl2-disc ${playing ? "fast" : ""}`} viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`vg-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1c0a0a" />
            <stop offset="100%" stopColor="#0b0404" />
          </radialGradient>
          <path id={`ring-${id}`} d="M100,100 m-27,0 a27,27 0 1,1 54,0 a27,27 0 1,1 -54,0" />
        </defs>
        <circle cx="100" cy="100" r="99" fill={`url(#vg-${id})`} />
        {grooves.map((r, i) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={i % 7 === 0 ? "rgba(255,230,230,.09)" : "rgba(255,255,255,.035)"} strokeWidth={i % 7 === 0 ? 0.7 : 0.45} />
        ))}
        {/* неравномерный "износ" дорожек — делает вращение читаемым */}
        <path d="M100 18 A82 82 0 0 1 172 64" fill="none" stroke="rgba(255,220,220,.12)" strokeWidth="2.2" />
        <path d="M40 150 A70 70 0 0 1 32 96" fill="none" stroke="rgba(255,220,220,.08)" strokeWidth="1.6" />
        <circle cx="100" cy="100" r="38" fill="#C21807" />
        <circle cx="100" cy="100" r="38" fill="none" stroke="#330D0D" strokeWidth="1.4" />
        <text fontFamily="'EB Garamond', serif" fontSize="5.6" letterSpacing="1.6" fill="#F1E9D8">
          <textPath href={`#ring-${id}`}>МИША &amp; ЛИЗА · ПЛЕЙЛИСТ НАШЕЙ ИСТОРИИ · СТОРОНА A ·</textPath>
        </text>
        {/* поцелуй */}
        <g transform="translate(84 86) scale(.32)" fill="#F3A9C0">
          <path d="M6 50 C20 26 38 22 50 36 C62 22 80 26 94 50 C80 58 64 62 50 56 C36 62 20 58 6 50 Z" />
          <path d="M6 50 C22 56 36 60 50 58 C64 60 78 56 94 50 C82 76 66 88 50 88 C34 88 18 76 6 50 Z" />
          <path d="M10 51 C26 54 38 53 50 54 C62 53 74 54 90 51" fill="none" stroke="#C21807" strokeWidth="2.5" />
        </g>
        <circle cx="100" cy="100" r="2.6" fill="#F1E9D8" />
      </svg>
      <div className="vinyl2-glare" aria-hidden="true" />
    </div>
  );
}
