import { useId } from "react";
import { heartPath, heartRingPoints } from "@/lib/heartGeometry";

interface LaceHeartProps {
  image: string;
  size?: number;
  rotate?: number;
  label?: string;
  duotone?: boolean;
}

const VB = 200;
const CX = 100;
const CY = 98;
const OUTER = 92;
const INNER = 72;

export function LaceHeart({ image, size = 420, rotate = 0, label, duotone = false }: LaceHeartProps) {
  const uid = useId().replace(/:/g, "");
  const clip = `lace-clip-${uid}`;
  const shadow = `lace-shadow-${uid}`;
  const tone = `lace-tone-${uid}`;
  const lace = "#f4ece0";
  const scallops = heartRingPoints(64, OUTER, CX, CY);
  const petals = heartRingPoints(64, OUTER - 3, CX, CY);
  const eyelets = heartRingPoints(48, OUTER * 0.9, CX, CY);
  const inner = heartRingPoints(60, INNER + 3.5, CX, CY);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      style={{ transform: `rotate(${rotate}deg)`, overflow: "visible" }}
      className="lace-heart"
    >
      <defs>
        <clipPath id={clip}>
          <path d={heartPath(INNER, CX, CY)} />
        </clipPath>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#1a0507" floodOpacity="0.45" />
        </filter>
        <filter id={tone}>
          <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.2 0.95" />
            <feFuncG type="table" tableValues="0.05 0.62" />
            <feFuncB type="table" tableValues="0.08 0.68" />
          </feComponentTransfer>
        </filter>
      </defs>

      <g filter={`url(#${shadow})`}>
        {scallops.map((p, i) => (
          <circle key={`s${i}`} cx={p.x} cy={p.y} r={6.2} fill={lace} />
        ))}
        <path d={heartPath(OUTER, CX, CY)} fill={lace} />
      </g>
      {petals.map((p, i) =>
        i % 2 ? (
          <g key={`p${i}`} transform={`translate(${p.x} ${p.y})`}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="0" cy="-2.1" rx="1.1" ry="2.1" fill="none" stroke="#cdb99d" strokeWidth={0.45} transform={`rotate(${a})`} />
            ))}
            <circle r={0.7} fill="#bfa889" />
          </g>
        ) : (
          <circle key={`p${i}`} cx={p.x} cy={p.y} r={1.2} fill="none" stroke="#d2c0a6" strokeWidth={0.5} />
        )
      )}
      {eyelets.map((p, i) => (
        <circle key={`e${i}`} cx={p.x} cy={p.y} r={1.5} fill="#cdb99d" />
      ))}
      {inner.map((p, i) => (
        <circle key={`i${i}`} cx={p.x} cy={p.y} r={0.9} fill="#bfa889" />
      ))}

      <g clipPath={`url(#${clip})`}>
        <image
          href={image}
          x={CX - INNER - 2}
          y={CY - INNER - 6}
          width={INNER * 2 + 4}
          height={INNER * 2 + 4}
          preserveAspectRatio="xMidYMid slice"
          filter={duotone ? `url(#${tone})` : undefined}
        />
      </g>
      <path d={heartPath(INNER, CX, CY)} fill="none" stroke="#b9a283" strokeWidth={0.8} />

      {label && (
        <text x={CX - INNER + 14} y={CY + 4} fontSize="6" fill="#f6ece0" fontFamily="'EB Garamond', serif" letterSpacing="2.4">
          {label.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
