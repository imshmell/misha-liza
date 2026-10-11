export function SvgDefs() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
      <defs>
        <symbol id="laurel-branch" viewBox="0 0 60 200">
          <path d="M30 196 C30 150 30 100 28 10" fill="none" stroke="currentColor" strokeWidth="2" />
          <g fill="currentColor">
            <ellipse cx="18" cy="170" rx="11" ry="5" transform="rotate(-35 18 170)" />
            <ellipse cx="40" cy="150" rx="11" ry="5" transform="rotate(35 40 150)" />
            <ellipse cx="16" cy="128" rx="11" ry="5" transform="rotate(-35 16 128)" />
            <ellipse cx="38" cy="108" rx="11" ry="5" transform="rotate(35 38 108)" />
            <ellipse cx="15" cy="86" rx="10" ry="4.5" transform="rotate(-35 15 86)" />
            <ellipse cx="35" cy="66" rx="10" ry="4.5" transform="rotate(35 35 66)" />
            <ellipse cx="16" cy="46" rx="9" ry="4" transform="rotate(-35 16 46)" />
            <ellipse cx="32" cy="28" rx="8" ry="3.5" transform="rotate(35 32 28)" />
          </g>
        </symbol>
        <symbol id="heart-sketch" viewBox="-6 -4 112 108">
          <path
            d="M52 30 C44 10 18 6 9 24 C-1 44 14 60 34 74 C42 80 47 86 50 94 C54 85 60 78 68 72 C90 57 103 40 92 22 C82 6 56 9 50 28 C49 22 51 16 56 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M53 31 C45 12 20 7 10 26 C0 45 15 61 35 75"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.5"
          />
        </symbol>
        <symbol id="heart-solid" viewBox="0 0 100 100">
          <path d="M50 88 C20 65 4 45 4 27 C4 10 18 2 32 2 C42 2 48 8 50 14 C52 8 58 2 68 2 C82 2 96 10 96 27 C96 45 80 65 50 88 Z" />
        </symbol>
      </defs>
    </svg>
  );
}
