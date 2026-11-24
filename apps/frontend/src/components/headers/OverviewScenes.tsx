import type { ReactElement } from "react";

const SVG_PROPS = {
  "aria-hidden": true as const,
  className: "lp-hero__art",
  viewBox: "0 0 1440 240",
  preserveAspectRatio: "xMaxYMid slice" as const,
};

/** Helper for toothed mechanical gears (History & Settings). */
function gearPath(cx: number, cy: number, outerR: number, innerR: number, teeth: number): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.18;
    const a2 = a0 + step * 0.42;
    const a3 = a0 + step * 0.6;
    const coords = [
      [cx + Math.cos(a0) * innerR, cy + Math.sin(a0) * innerR],
      [cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR],
      [cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR],
      [cx + Math.cos(a3) * innerR, cy + Math.sin(a3) * innerR],
    ] as const;
    for (const [x, y] of coords) {
      pts.push(`${pts.length === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  return `${pts.join(" ")} Z`;
}

function BrassGear({
  cx,
  cy,
  r,
  teeth,
  fill = "#F5C451",
  stroke = "#C9962B",
}: {
  cx: number;
  cy: number;
  r: number;
  teeth: number;
  fill?: string;
  stroke?: string;
}): ReactElement {
  const spokes = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <path
        d={gearPath(cx, cy, r, r * 0.82, teeth)}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#1B1455" stroke={stroke} strokeWidth="2" />
      {spokes.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(rad) * r * 0.62}
            y2={cy + Math.sin(rad) * r * 0.62}
            stroke={fill}
            strokeWidth={Math.max(2.5, r * 0.1)}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.22} fill={stroke} stroke={fill} strokeWidth="2" />
    </g>
  );
}

/** 1. HOME — Mountain Basecamp */
export function HomeScene(): ReactElement {
  const pines = [
    { x: 640, y: 205, s: 0.72, c: "#1B4D45" },
    { x: 1010, y: 215, s: 1.05, c: "#18463F" },
    { x: 1052, y: 222, s: 0.85, c: "#216154" },
    { x: 1102, y: 210, s: 1.15, c: "#1B4D45" },
    { x: 1134, y: 226, s: 0.78, c: "#2A7A6B" },
    { x: 1198, y: 206, s: 1.22, c: "#18463F" },
    { x: 1244, y: 226, s: 0.75, c: "#2A7A6B" },
    { x: 1262, y: 214, s: 0.96, c: "#1B4D45" },
    { x: 1308, y: 208, s: 1.18, c: "#18463F" },
    { x: 1364, y: 216, s: 0.95, c: "#216154" },
    { x: 1412, y: 224, s: 0.8, c: "#1B4D45" },
  ];

  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="hdr-home-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0C1C33" />
          <stop offset="42%" stopColor="#12263F" />
          <stop offset="72%" stopColor="#42556F" />
          <stop offset="92%" stopColor="#AE866C" />
          <stop offset="100%" stopColor="#D7A17A" />
        </linearGradient>
        <radialGradient id="hdr-home-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF0B8" stopOpacity="0.6" />
          <stop offset="55%" stopColor="#F2A272" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#12263F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hdr-home-fire-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD166" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#E76F51" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E76F51" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hdr-home-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D9ECFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#D9ECFF" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#D9ECFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1440" height="240" fill="url(#hdr-home-sky)" />

      {/* Stars & four-point sparkles */}
      <g fill="#F1F7FF" opacity="0.8">
        <circle cx="96" cy="24" r="1.4" />
        <circle cx="320" cy="18" r="1.3" />
        <circle cx="436" cy="30" r="1.6" />
        <circle cx="560" cy="16" r="1.3" />
        <circle cx="1220" cy="20" r="1.4" />
        <circle cx="1334" cy="14" r="1.5" />
        <circle cx="1398" cy="44" r="1.4" />
      </g>
      <path d="M250 18 L253 26 L261 29 L253 32 L250 40 L247 32 L239 29 L247 26 Z" fill="#D5D0B8" />
      <path d="M632 32 L635 39 L642 42 L635 45 L632 52 L629 45 L622 42 L629 39 Z" fill="#FFF0B8" />

      {/* Glowing moon / dawn sun behind peaks */}
      <circle cx="860" cy="126" r="150" fill="url(#hdr-home-moon-glow)" />
      <circle cx="860" cy="130" r="46" fill="#FFEAA8" />

      {/* Far background ridge */}
      <polygon points="560,210 660,136 745,210" fill="#5D779B" opacity="0.72" />
      <polygon points="860,210 956,122 1040,210" fill="#536E92" opacity="0.78" />
      <polygon points="1130,220 1204,158 1280,220" fill="#4C688C" opacity="0.75" />

      {/* Center-left snow peak */}
      <polygon points="710,208 796,92 806,208" fill="#4E7BA7" />
      <polygon points="796,92 888,208 806,208" fill="#3B628A" />
      <polygon points="796,92 768,132 786,126 798,144 812,126 828,136" fill="#F1F7FF" />

      {/* Tall hero peak with dashed ridge trail & summit flag */}
      <polygon points="914,225 1048,28 1064,225" fill="#426D97" />
      <polygon points="1048,28 1188,225 1064,225" fill="#2E547A" />
      <polygon points="1048,28 1004,88 1030,78 1048,96 1068,80 1094,94" fill="#F1F7FF" />
      <path
        d="M1066 226 L1032 178 L1088 144 L1054 112 L1072 86"
        fill="none"
        stroke="#FFD166"
        strokeWidth="3"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      <g transform="translate(1070, 68)">
        <line x1="0" y1="0" x2="0" y2="20" stroke="#12263F" strokeWidth="2" />
        <polygon points="1,0 16,6 1,12" fill="#E76F51" />
      </g>

      {/* Right snow peak */}
      <polygon points="1182,226 1288,70 1300,226" fill="#48739D" />
      <polygon points="1288,70 1396,226 1300,226" fill="#335A80" />
      <polygon points="1288,70 1254,118 1274,110 1288,124 1304,112 1320,118" fill="#F1F7FF" />

      {/* Birds */}
      <g fill="none" stroke="#182C45" strokeWidth="2.2" strokeLinecap="round">
        <path d="M700 94 Q706 88 712 94 Q718 88 724 94" />
        <path d="M742 110 Q747 105 752 110 Q757 105 762 110" />
        <path d="M1152 58 Q1158 52 1164 58 Q1170 52 1176 58" />
      </g>

      {/* Valley mist */}
      <rect x="560" y="160" width="880" height="34" fill="url(#hdr-home-mist)" />

      {/* Forest floor + right pine treeline */}
      <path d="M960 220 Q1200 206 1440 200 L1440 240 L960 240 Z" fill="#173D38" />
      {pines.map((p, idx) => (
        <g key={idx} transform={`translate(${p.x}, ${p.y}) scale(${p.s})`} fill={p.c}>
          <polygon points="0,-46 -18,-12 18,-12" />
          <polygon points="0,-32 -22,6 22,6" />
          <polygon points="0,-16 -25,22 25,22" />
        </g>
      ))}

      {/* Dark basecamp ridge */}
      <path d="M560 214 Q770 202 980 212 L980 240 L560 240 Z" fill="#0F1F30" />

      {/* Campfire glow & flames */}
      <circle cx="858" cy="204" r="44" fill="url(#hdr-home-fire-glow)" />
      <g transform="translate(858, 212)">
        <line
          x1="-14"
          y1="6"
          x2="14"
          y2="-2"
          stroke="#5A331E"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="-14"
          y1="-2"
          x2="14"
          y2="6"
          stroke="#422313"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M-9 2 C-10 -12 -2 -18 0 -28 C6 -16 11 -10 9 2 Z" fill="#E76F51" />
        <path d="M-5 2 C-5 -6 0 -12 1 -18 C5 -10 6 -4 4 2 Z" fill="#FFD166" />
      </g>

      {/* Orange tent */}
      <g transform="translate(700, 174)">
        <polygon points="0,0 -34,40 34,40" fill="#E76F51" />
        <polygon points="0,0 12,40 34,40" fill="#C9593E" />
        <polygon points="0,16 -10,40 10,40" fill="#142334" />
        <polygon points="0,24 -5,40 5,40" fill="#FFD166" opacity="0.8" />
      </g>

      {/* Teal tent */}
      <g transform="translate(788, 182)">
        <polygon points="0,0 -28,32 28,32" fill="#2A9D8F" />
        <polygon points="0,0 10,32 28,32" fill="#207B70" />
        <polygon points="0,14 -8,32 8,32" fill="#142334" />
        <polygon points="0,20 -4,32 4,32" fill="#FFD166" opacity="0.75" />
      </g>

      {/* Camp flagpole & festive lantern string */}
      <line x1="940" y1="150" x2="940" y2="214" stroke="#1E354E" strokeWidth="3" />
      <polygon points="941,150 982,162 941,174" fill="#FFD166" />
      <path d="M700 174 Q820 194 940 154" fill="none" stroke="#2C445D" strokeWidth="1.5" />
      {[
        [744, 181],
        [784, 183],
        [824, 181],
        [864, 174],
        [904, 164],
      ].map(([lx, ly], idx) => (
        <g key={idx}>
          <circle cx={lx} cy={ly} r="8" fill="#FFD166" opacity="0.26" />
          <circle cx={lx} cy={ly} r="3.2" fill="#FFD166" />
        </g>
      ))}
    </svg>
  );
}

/** 3. HISTORY — Clockwork Time */
export function HistoryScene(): ReactElement {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="hdr-hist-bg" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#0F0B2E" />
          <stop offset="55%" stopColor="#1D124B" />
          <stop offset="100%" stopColor="#2A1860" />
        </linearGradient>
        <radialGradient id="hdr-hist-clock-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7DE8FF" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#4328A8" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#0F0B2E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="240" fill="url(#hdr-hist-bg)" />

      {/* Stars & outer sparkles */}
      <g fill="#FFF3D6" opacity="0.85">
        <circle cx="110" cy="44" r="1.4" />
        <circle cx="290" cy="56" r="1.3" />
        <circle cx="370" cy="38" r="1.5" />
        <circle cx="492" cy="52" r="1.4" />
      </g>
      <path d="M180 44 L183 53 L192 56 L183 59 L180 68 L177 59 L168 56 L177 53 Z" fill="#FFF3D6" />
      <path d="M452 38 L454 44 L460 46 L454 48 L452 54 L450 48 L444 46 L450 44 Z" fill="#FFF3D6" />

      {/* Zoomed-out clockwork composition so full clock & gears stay unclipped at wide aspect ratios */}
      <g transform="translate(1390, 120) scale(0.75) translate(-1390, -120)">
        <circle cx="1132" cy="118" r="190" fill="url(#hdr-hist-clock-glow)" />
        <g fill="#F5C451" opacity="0.85">
          <circle cx="760" cy="26" r="1.6" />
          <circle cx="990" cy="188" r="1.6" />
          <circle cx="1232" cy="186" r="1.5" />
        </g>
        <path
          d="M1012 122 L1015 128 L1021 131 L1015 134 L1012 140 L1009 134 L1003 131 L1009 128 Z"
          fill="#7DE8FF"
        />
        <path
          d="M1238 78 L1241 84 L1247 87 L1241 90 L1238 96 L1235 90 L1229 87 L1235 84 Z"
          fill="#7DE8FF"
        />

        {/* Interlocking brass gears */}
        <BrassGear cx={574} cy={58} r={34} teeth={12} />
        <BrassGear cx={704} cy={176} r={54} teeth={14} />
        <BrassGear cx={790} cy={210} r={30} teeth={10} />
        <BrassGear cx={942} cy={62} r={38} teeth={12} />
        <BrassGear cx={1320} cy={52} r={38} teeth={12} />
        <BrassGear cx={1354} cy={196} r={68} teeth={16} />

        {/* Hourglass */}
        <g transform="translate(620, 112)">
          <rect x="-26" y="-52" width="52" height="7" rx="3" fill="#F5C451" />
          <rect x="-26" y="45" width="52" height="7" rx="3" fill="#F5C451" />
          <line x1="-20" y1="-45" x2="-20" y2="45" stroke="#C9962B" strokeWidth="2.2" />
          <line x1="20" y1="-45" x2="20" y2="45" stroke="#C9962B" strokeWidth="2.2" />
          <path
            d="M-16 -45 L16 -45 L2 0 L16 45 L-16 45 L-2 0 Z"
            fill="rgba(125,232,255,0.1)"
            stroke="#7DE8FF"
            strokeWidth="2"
          />
          <polygon points="-11,-41 11,-41 0,-12" fill="#F5C451" />
          <polygon points="-12,43 12,43 0,28" fill="#F5C451" />
          <line
            x1="0"
            y1="-10"
            x2="0"
            y2="30"
            stroke="#F5C451"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </g>

        {/* Small floating clocks */}
        <g transform="translate(812, 66)">
          <circle r="19" fill="#1B1455" stroke="#F5C451" strokeWidth="2.8" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-11"
            stroke="#FFF3D6"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="9"
            y2="-4"
            stroke="#FFF3D6"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(880, 128)">
          <circle r="15" fill="#1B1455" stroke="#F5C451" strokeWidth="2.5" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-8"
            stroke="#FFF3D6"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="6"
            y2="4"
            stroke="#FFF3D6"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>

        {/* Hero 10:10 glowing clock */}
        <g transform="translate(1132, 118)">
          <circle
            r="136"
            fill="none"
            stroke="#7DE8FF"
            strokeWidth="1.5"
            strokeDasharray="3 7"
            opacity="0.45"
          />
          <circle r="106" fill="none" stroke="#7DE8FF" strokeWidth="2" opacity="0.7" />
          <circle r="96" fill="#1B1455" stroke="#F5C451" strokeWidth="6" />
          <circle r="86" fill="none" stroke="#C9962B" strokeWidth="1" opacity="0.55" />
          {ticks.map((deg) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            const major = deg % 90 === 0;
            const r1 = major ? 74 : 78;
            const r2 = 86;
            return (
              <line
                key={deg}
                x1={Math.cos(rad) * r1}
                y1={Math.sin(rad) * r1}
                x2={Math.cos(rad) * r2}
                y2={Math.sin(rad) * r2}
                stroke="#F5C451"
                strokeWidth={major ? 2.6 : 1.8}
                strokeLinecap="round"
              />
            );
          })}
          <g
            fill="#FFF3D6"
            fontFamily="Cinzel, Georgia, serif"
            fontSize="13"
            fontWeight="700"
            textAnchor="middle"
          >
            <text x="0" y="-56">
              XII
            </text>
            <text x="62" y="5">
              III
            </text>
            <text x="0" y="68">
              VI
            </text>
            <text x="-62" y="5">
              IX
            </text>
          </g>
          <path
            d="M-32 42 A50 50 0 0 0 38 38"
            fill="none"
            stroke="#7DE8FF"
            strokeWidth="2"
            opacity="0.65"
          />
          {/* Hands reading 10:10 */}
          <line
            x1="0"
            y1="0"
            x2="-42"
            y2="-24"
            stroke="#FFF3D6"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="64"
            y2="-36"
            stroke="#FFF3D6"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <line
            x1="-10"
            y1="-16"
            x2="42"
            y2="74"
            stroke="#F472B6"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle r="7" fill="#F5C451" stroke="#F472B6" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

/** 5. WORKLOAD — Daylight Dock */
export function WorkloadScene(): ReactElement {
  const container = (x: number, y: number, w: number, h: number, fill: string, key: string) => {
    const ribs = Math.max(3, Math.floor((w - 20) / 14));
    return (
      <g key={key}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx="3"
          fill={fill}
          stroke="#0B1B3A"
          strokeWidth="3.5"
        />
        {Array.from({ length: ribs }, (_, i) => {
          const rx = x + 12 + i * ((w - 24) / Math.max(1, ribs - 1));
          return (
            <line
              key={i}
              x1={rx}
              y1={y + 6}
              x2={rx}
              y2={y + h - 6}
              stroke="#0B1B3A"
              strokeWidth="2"
              opacity="0.28"
            />
          );
        })}
      </g>
    );
  };

  return (
    <svg {...SVG_PROPS}>
      <defs>
        <pattern id="hdr-work-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="1.8" fill="#0B1B3A" opacity="0.09" />
        </pattern>
        <pattern
          id="hdr-work-hazard"
          width="24"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="skewX(-32)"
        >
          <rect width="12" height="14" fill="#FFC857" />
          <rect x="12" width="12" height="14" fill="#0B1B3A" />
        </pattern>
        <clipPath id="hdr-work-right">
          <polygon points="712,0 1440,0 1440,240 634,240" />
        </clipPath>
      </defs>

      {/* Left Ink Navy panel */}
      <rect width="1440" height="240" fill="#0B1B3A" />
      <g stroke="#244673" strokeWidth="2.5" strokeLinecap="round">
        <line x1="504" y1="26" x2="604" y2="26" />
        <line x1="478" y1="54" x2="528" y2="54" />
        <line x1="538" y1="40" x2="582" y2="40" />
      </g>

      {/* Right Daylight Dock manga panel */}
      <g clipPath="url(#hdr-work-right)">
        <rect x="620" y="0" width="820" height="240" fill="#38BDF8" />
        {/* Manga sunburst beams */}
        <g fill="#BAE6FD" opacity="0.45">
          <polygon points="1030,130 660,0 780,0" />
          <polygon points="1030,130 920,0 1040,0" />
          <polygon points="1030,130 1200,0 1320,0" />
          <polygon points="1030,130 1440,40 1440,120" />
        </g>
        <rect x="620" y="0" width="820" height="240" fill="url(#hdr-work-dots)" />

        {/* Zoomed-out dock composition so crane cab & hazard dock floor stay fully visible */}
        <g transform="translate(1060, 124) scale(0.75) translate(-1060, -124)">
          {/* Clouds */}
          <path
            d="M728 78 Q718 78 718 66 Q718 52 734 50 Q742 28 768 28 Q790 28 798 48 Q814 50 814 66 Q814 78 802 78 Z"
            fill="#FFFFFF"
          />
          <path
            d="M1382 58 Q1372 58 1372 46 Q1372 34 1386 32 Q1394 16 1414 16 Q1432 16 1440 34 Q1452 36 1452 48 Q1452 58 1442 58 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />

          {/* Distant container silhouettes */}
          <rect
            x="760"
            y="156"
            width="76"
            height="44"
            fill="#7DD3FC"
            stroke="#0284C7"
            strokeWidth="2.5"
          />
          <rect
            x="1070"
            y="140"
            width="120"
            height="58"
            fill="#7DD3FC"
            stroke="#0284C7"
            strokeWidth="2.5"
          />

          {/* Gantry crane structure */}
          <g stroke="#0B1B3A" strokeWidth="3.5" strokeLinejoin="round">
            {/* Crane tower legs */}
            <rect x="914" y="48" width="14" height="156" fill="#FF7A45" />
            <rect x="978" y="48" width="14" height="156" fill="#FF7A45" />
            {/* Cross braces */}
            <line x1="928" y1="92" x2="978" y2="146" />
            <line x1="978" y1="92" x2="928" y2="146" />
            <line x1="928" y1="146" x2="978" y2="200" />
            <line x1="978" y1="146" x2="928" y2="200" />
            <rect x="904" y="84" width="98" height="12" fill="#FF7A45" />
            {/* Operator cabin */}
            <rect x="900" y="10" width="94" height="24" fill="#FFC857" />
            <rect x="960" y="15" width="24" height="14" fill="#BAE6FD" />
            {/* Main boom */}
            <rect x="880" y="34" width="720" height="18" fill="#FF7A45" />
            {/* Lifting trolley & cables */}
            <rect x="1156" y="52" width="74" height="12" fill="#0B1B3A" />
            <line x1="1172" y1="64" x2="1172" y2="78" strokeWidth="3" />
            <line x1="1214" y1="64" x2="1214" y2="78" strokeWidth="3" />
          </g>

          {/* Speed lines behind lifted container */}
          <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9">
            <line x1="1264" y1="88" x2="1340" y2="88" />
            <line x1="1276" y1="102" x2="1366" y2="102" />
            <line x1="1266" y1="114" x2="1318" y2="114" />
          </g>

          {/* Shipping containers */}
          {container(1152, 76, 88, 42, "#14B8A6", "c-lifted")}
          {container(642, 118, 88, 42, "#FFC857", "c-l1")}
          {container(642, 160, 88, 42, "#14B8A6", "c-l2")}
          {container(734, 160, 88, 42, "#FF7A45", "c-l3")}
          {container(1010, 160, 88, 42, "#3B82F6", "c-r1")}
          {container(1102, 160, 88, 42, "#FF7A45", "c-r2")}
          {container(1194, 118, 88, 42, "#14B8A6", "c-r3top")}
          {container(1194, 160, 88, 42, "#FFC857", "c-r3")}
          {container(1286, 160, 88, 42, "#FF7A45", "c-r4")}
          {container(1378, 160, 88, 42, "#3B82F6", "c-r5")}
          {container(1470, 160, 88, 42, "#14B8A6", "c-r6")}
          {container(1562, 160, 88, 42, "#FFC857", "c-r7")}

          {/* Hazard dock floor & full-bleed pier base */}
          <rect x="420" y="204" width="1260" height="12" fill="url(#hdr-work-hazard)" />
          <rect x="420" y="216" width="1260" height="72" fill="#1B3154" />
        </g>
      </g>

      {/* Diagonal Orange + Yellow manga divider */}
      <polygon points="700,0 718,0 640,240 622,240" fill="#FF7A45" />
      <polygon points="716,0 726,0 648,240 638,240" fill="#FFC857" />
    </svg>
  );
}

/** 7. PROJECTS — Guild Quest Board */
export function ProjectsScene(): ReactElement {
  const planks = Array.from({ length: 36 }, (_, i) => i * 40);
  const star = (x: number, y: number, s: number) => (
    <path
      transform={`translate(${x}, ${y}) scale(${s})`}
      d="M0 -18 L5 -5 L18 0 L5 5 L0 18 L-5 5 L-18 0 L-5 -5 Z"
      fill="#F2B632"
    />
  );

  return (
    <svg {...SVG_PROPS}>
      <defs>
        <radialGradient id="hdr-proj-lantern" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F2B632" stopOpacity="0.65" />
          <stop offset="50%" stopColor="#F2B632" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#12383F" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Teal hall paneling */}
      <rect width="1440" height="240" fill="#12383F" />
      <g stroke="#0D2A30" strokeWidth="2">
        {planks.map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="240" />
        ))}
      </g>

      {/* Hanging tavern lantern + warm light pool */}
      <circle cx="584" cy="64" r="92" fill="url(#hdr-proj-lantern)" />
      <line x1="584" y1="0" x2="584" y2="38" stroke="#1E130B" strokeWidth="2.5" />
      <rect
        x="573"
        y="38"
        width="22"
        height="28"
        rx="6"
        fill="#F2B632"
        stroke="#1E130B"
        strokeWidth="3"
      />
      <rect x="578" y="45" width="12" height="14" rx="2" fill="#FFF7DC" />
      <path
        d="M520 44 L522 49 L527 51 L522 53 L520 58 L518 53 L513 51 L518 49 Z"
        fill="#F5E6C8"
        opacity="0.8"
      />
      <circle cx="538" cy="96" r="2" fill="#F2B632" opacity="0.7" />
      <circle cx="518" cy="190" r="2.2" fill="#F2B632" opacity="0.7" />

      {/* Wooden Quest Notice Board */}
      <rect x="604" y="18" width="812" height="204" rx="4" fill="#4A2A16" />
      <rect x="616" y="30" width="788" height="180" fill="#7A4B2A" />
      {/* Board horizontal wood slats */}
      <g stroke="#5E371C" strokeWidth="2">
        <line x1="616" y1="75" x2="1404" y2="75" />
        <line x1="616" y1="120" x2="1404" y2="120" />
        <line x1="616" y1="165" x2="1404" y2="165" />
        <line x1="780" y1="30" x2="780" y2="75" />
        <line x1="1060" y1="75" x2="1060" y2="120" />
        <line x1="1210" y1="120" x2="1210" y2="165" />
        <line x1="900" y1="165" x2="900" y2="210" />
      </g>
      {/* Subtle light beams across top-right of board */}
      <polygon points="1090,0 1180,0 1050,150 960,150" fill="#FFFFFF" opacity="0.06" />
      <polygon points="1220,0 1280,0 1160,140 1100,140" fill="#FFFFFF" opacity="0.05" />

      {/* Quest Card 1 (S rank) */}
      <g transform="translate(656, 46)">
        <rect x="4" y="4" width="90" height="108" fill="rgba(26,12,4,0.28)" />
        <rect width="90" height="108" fill="#F5E6C8" />
        <rect width="90" height="18" fill="#E4572E" />
        <text
          x="45"
          y="13"
          fill="#FFF7EC"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
          fontWeight="700"
          textAnchor="middle"
        >
          QUEST
        </text>
        {star(45, 48, 0.95)}
        <rect x="14" y="72" width="46" height="4" rx="2" fill="#B59B78" />
        <rect x="14" y="82" width="38" height="4" rx="2" fill="#B59B78" />
        <rect x="14" y="92" width="30" height="4" rx="2" fill="#B59B78" />
        <circle cx="71" cy="94" r="11" fill="none" stroke="#E4572E" strokeWidth="2.2" />
        <text
          x="71"
          y="98"
          fill="#E4572E"
          fontFamily="Inter, sans-serif"
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
        >
          S
        </text>
      </g>

      {/* Quest Card 2 (A rank) */}
      <g transform="translate(770, 50) rotate(5)">
        <rect x="3" y="4" width="74" height="82" fill="rgba(26,12,4,0.24)" />
        <rect width="74" height="82" fill="#F5E6C8" />
        <rect width="74" height="13" fill="#1F8A8A" />
        {star(37, 36, 0.65)}
        <rect x="12" y="54" width="46" height="4" rx="2" fill="#B59B78" />
        <rect x="12" y="64" width="34" height="4" rx="2" fill="#B59B78" />
        <circle cx="56" cy="70" r="10" fill="none" stroke="#1F8A8A" strokeWidth="2" />
        <text
          x="56"
          y="74"
          fill="#1F8A8A"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          A
        </text>
      </g>

      {/* Mint Sticky Note */}
      <g transform="translate(860, 56) rotate(-5)">
        <rect x="2" y="3" width="54" height="54" fill="rgba(26,12,4,0.22)" />
        <rect width="54" height="54" fill="#A8E6CF" />
        <rect x="10" y="16" width="32" height="4" rx="2" fill="#4E8572" />
        <rect x="10" y="26" width="26" height="4" rx="2" fill="#4E8572" />
        <rect x="10" y="36" width="30" height="4" rx="2" fill="#4E8572" />
      </g>

      {/* Quest Card 3 (OPEN, A rank) */}
      <g transform="translate(936, 56) rotate(3)">
        <rect x="4" y="4" width="84" height="100" fill="rgba(26,12,4,0.25)" />
        <rect width="84" height="100" fill="#F5E6C8" />
        <rect width="84" height="16" fill="#1F8A8A" />
        <text
          x="42"
          y="12"
          fill="#FFF7EC"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9.5"
          fontWeight="700"
          textAnchor="middle"
        >
          OPEN
        </text>
        <rect x="14" y="28" width="54" height="4" rx="2" fill="#B59B78" />
        <rect x="14" y="39" width="44" height="4" rx="2" fill="#B59B78" />
        <rect x="14" y="50" width="52" height="4" rx="2" fill="#B59B78" />
        <rect x="14" y="61" width="36" height="4" rx="2" fill="#B59B78" />
        <circle cx="24" cy="84" r="10" fill="none" stroke="#1F8A8A" strokeWidth="2" />
        <text
          x="24"
          y="88"
          fill="#1F8A8A"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          A
        </text>
        {star(62, 84, 0.55)}
      </g>

      {/* Lantern Gold Sticky Note */}
      <g transform="translate(1044, 48) rotate(8)">
        <rect x="3" y="3" width="58" height="58" fill="rgba(26,12,4,0.22)" />
        <rect width="58" height="58" fill="#F2B632" />
        <rect x="10" y="16" width="36" height="4" rx="2" fill="#8A6110" />
        <rect x="10" y="26" width="28" height="4" rx="2" fill="#8A6110" />
        <rect x="10" y="36" width="32" height="4" rx="2" fill="#8A6110" />
      </g>

      {/* Quest Card 4 (QUEST, S rank) */}
      <g transform="translate(1108, 52) rotate(-3)">
        <rect x="4" y="4" width="88" height="100" fill="rgba(26,12,4,0.26)" />
        <rect width="88" height="100" fill="#F5E6C8" />
        <rect width="88" height="17" fill="#E4572E" />
        <text
          x="44"
          y="12"
          fill="#FFF7EC"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
          fontWeight="700"
          textAnchor="middle"
        >
          QUEST
        </text>
        {star(44, 44, 0.85)}
        <rect x="12" y="66" width="44" height="4" rx="2" fill="#B59B78" />
        <rect x="12" y="76" width="34" height="4" rx="2" fill="#B59B78" />
        <rect x="12" y="86" width="28" height="4" rx="2" fill="#B59B78" />
        <circle cx="68" cy="84" r="10" fill="none" stroke="#E4572E" strokeWidth="2.2" />
        <text
          x="68"
          y="88"
          fill="#E4572E"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          S
        </text>
      </g>

      {/* Salmon Sticky Note */}
      <g transform="translate(1214, 46) rotate(-5)">
        <rect x="2" y="3" width="50" height="52" fill="rgba(26,12,4,0.22)" />
        <rect width="50" height="52" fill="#F6A689" />
        <rect x="10" y="16" width="28" height="4" rx="2" fill="#9A533C" />
        <rect x="10" y="26" width="22" height="4" rx="2" fill="#9A533C" />
        <rect x="10" y="36" width="26" height="4" rx="2" fill="#9A533C" />
      </g>

      {/* Quest Card 5 (B rank) */}
      <g transform="translate(1296, 52) rotate(4)">
        <rect x="4" y="4" width="76" height="84" fill="rgba(26,12,4,0.24)" />
        <rect width="76" height="84" fill="#F5E6C8" />
        <rect width="76" height="14" fill="#1F8A8A" />
        <rect x="12" y="26" width="48" height="4" rx="2" fill="#B59B78" />
        <rect x="12" y="36" width="40" height="4" rx="2" fill="#B59B78" />
        <rect x="12" y="46" width="32" height="4" rx="2" fill="#B59B78" />
        <circle cx="56" cy="68" r="10" fill="none" stroke="#1F8A8A" strokeWidth="2" />
        <text
          x="56"
          y="72"
          fill="#1F8A8A"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          B
        </text>
      </g>

      {/* Lower pinned sticky notes */}
      <g transform="translate(730, 162) rotate(-4)">
        <rect width="60" height="40" fill="#F5E6C8" />
        <rect x="10" y="16" width="36" height="3.5" rx="1.5" fill="#B59B78" />
        <rect x="10" y="24" width="24" height="3.5" rx="1.5" fill="#B59B78" />
      </g>
      <g transform="translate(860, 154) rotate(8)">
        <rect width="46" height="42" fill="#F8B4C6" />
        <rect x="8" y="16" width="28" height="3.5" rx="1.5" fill="#A05A6E" />
        <rect x="8" y="24" width="22" height="3.5" rx="1.5" fill="#A05A6E" />
      </g>
      <g transform="translate(982, 162) rotate(-7)">
        <rect width="58" height="40" fill="#F5E6C8" />
        <rect width="58" height="9" fill="#E4572E" />
        <rect x="10" y="18" width="34" height="3.5" rx="1.5" fill="#B59B78" />
        <rect x="10" y="26" width="22" height="3.5" rx="1.5" fill="#B59B78" />
      </g>

      {/* Red twine & gold connecting strings */}
      <polyline
        points="700,48 804,54 888,58 978,60 1072,54 1152,54 1238,48 1334,56"
        fill="none"
        stroke="#E4572E"
        strokeWidth="2"
      />
      <path
        d="M700 48 L884 160 M1008 164 L1152 54"
        fill="none"
        stroke="#F2B632"
        strokeWidth="2"
        strokeDasharray="5 5"
      />

      {/* Pushpins */}
      {[
        [700, 48],
        [804, 54],
        [888, 58],
        [978, 60],
        [1072, 54],
        [1152, 54],
        [1238, 48],
        [1334, 56],
        [760, 166],
        [884, 160],
        [1008, 164],
      ].map(([px, py], idx) => (
        <circle key={idx} cx={px} cy={py} r="4.2" fill="#E4572E" stroke="#7A1D0D" strokeWidth="1" />
      ))}

      {/* Board corner sparkles */}
      <path d="M604 12 L607 19 L614 22 L607 25 L604 32 L601 25 L594 22 L601 19 Z" fill="#FFF7DC" />
      <path
        d="M1102 10 L1104 15 L1109 17 L1104 19 L1102 24 L1100 19 L1095 17 L1100 15 Z"
        fill="#FFF7DC"
      />
      <path
        d="M1414 204 L1417 211 L1424 214 L1417 217 L1414 224 L1411 217 L1404 214 L1411 211 Z"
        fill="#FFF7DC"
      />
    </svg>
  );
}
