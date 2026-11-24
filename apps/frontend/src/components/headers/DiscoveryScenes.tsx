import type { ReactElement } from "react";

const SVG_PROPS = {
  "aria-hidden": true as const,
  className: "lp-hero__art",
  viewBox: "0 0 1440 240",
  preserveAspectRatio: "xMaxYMid slice" as const,
};

/** 2. USM — Meadow Journey */
export function UsmScene(): ReactElement {
  const poles = [
    { x: 900, head: "#FF6B8B", card: "#FFD6DF", cards: 3 },
    { x: 1030, head: "#FFB020", card: "#FFE8B0", cards: 2 },
    { x: 1160, head: "#3AA0FF", card: "#C8E4FF", cards: 3 },
    { x: 1290, head: "#2DBE7F", card: "#C4F1DC", cards: 2 },
    { x: 1400, head: "#8B5CF6", card: "#DDD2FE", cards: 1 },
  ];

  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="hdr-usm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFE6FF" />
          <stop offset="62%" stopColor="#E6F5FF" />
          <stop offset="100%" stopColor="#FFF7DC" />
        </linearGradient>
        <radialGradient id="hdr-usm-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF0A8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#FFE17D" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#BFE6FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="240" fill="url(#hdr-usm-sky)" />

      {/* Warm sun glow behind amber pole */}
      <circle cx="1030" cy="60" r="88" fill="url(#hdr-usm-sun)" />

      {/* Clouds */}
      <path
        d="M768 68 Q756 68 756 56 Q756 44 772 42 Q782 22 806 22 Q826 22 834 40 Q848 42 848 56 Q848 68 836 68 Z"
        fill="#FFFFFF"
      />
      <path
        d="M1230 40 Q1220 40 1220 30 Q1220 20 1234 18 Q1242 2 1262 2 Q1280 2 1288 18 Q1300 20 1300 30 Q1300 40 1290 40 Z"
        fill="#FFFFFF"
      />
      <path
        d="M1364 90 Q1354 90 1354 80 Q1354 70 1368 68 Q1378 54 1396 54 Q1414 54 1422 70 Q1432 72 1432 82 Q1432 90 1422 90 Z"
        fill="#FFFFFF"
        opacity="0.92"
      />
      <path d="M874 16 L876 21 L881 23 L876 25 L874 30 L872 25 L867 23 L872 21 Z" fill="#FFFFFF" />

      {/* Layered sunny meadow hills */}
      <path d="M480 182 Q700 122 950 156 T1440 112 L1440 240 L480 240 Z" fill="#9ED7A0" />
      <path d="M560 198 Q780 152 1030 182 T1440 150 L1440 240 L560 240 Z" fill="#7BC47F" />
      <path d="M660 218 Q940 190 1160 214 T1440 196 L1440 240 L660 240 Z" fill="#2F8F5B" />

      {/* Winding tan trail with white dashes */}
      <path
        d="M700 226 Q930 194 1140 220 T1440 214"
        fill="none"
        stroke="#F4DDA8"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M700 226 Q930 194 1140 220 T1440 214"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeDasharray="10 10"
        strokeLinecap="round"
      />

      {/* Five story-step flag poles & hanging feature cards */}
      {poles.map((p) => (
        <g key={p.x}>
          <line x1={p.x} y1="68" x2={p.x} y2="206" stroke="#8C5D34" strokeWidth="3.5" />
          <rect x={p.x - 26} y="40" width="52" height="34" rx="7" fill={p.head} />
          <rect
            x={p.x - 16}
            y="50"
            width="32"
            height="3.5"
            rx="1.8"
            fill="#FFFFFF"
            opacity="0.92"
          />
          <rect
            x={p.x - 16}
            y="59"
            width="22"
            height="3.5"
            rx="1.8"
            fill="#FFFFFF"
            opacity="0.72"
          />
          {Array.from({ length: p.cards }, (_, idx) => {
            const cy = 84 + idx * 24;
            return (
              <g key={idx}>
                <rect x={p.x - 22} y={cy} width="44" height="19" rx="3.5" fill={p.card} />
                <rect
                  x={p.x - 14}
                  y={cy + 8}
                  width="28"
                  height="3"
                  rx="1.5"
                  fill="#6E7C8A"
                  opacity="0.75"
                />
              </g>
            );
          })}
        </g>
      ))}

      {/* Dashed RELEASE 1 line */}
      <line
        x1="864"
        y1="168"
        x2="1430"
        y2="168"
        stroke="#2F8F5B"
        strokeWidth="2"
        strokeDasharray="7 6"
      />
      <text
        x="864"
        y="162"
        fill="#1E6B43"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.08em"
      >
        RELEASE 1
      </text>

      {/* Little traveler walking the journey trail */}
      <g transform="translate(978, 198)">
        <circle cx="0" cy="-12" r="5" fill="#F4C7A1" />
        <path d="M-5 -14 Q0 -20 5 -14 Z" fill="#182C45" />
        <rect x="-8" y="-6" width="5" height="10" rx="2" fill="#FF7A45" />
        <rect x="-3" y="-6" width="7" height="12" rx="2" fill="#182C45" />
        <line
          x1="-1"
          y1="6"
          x2="-5"
          y2="16"
          stroke="#182C45"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="6"
          x2="6"
          y2="16"
          stroke="#182C45"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** 4. OST — World Tree */
export function OstScene(): ReactElement {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="hdr-ost-bg" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#031A17" />
          <stop offset="55%" stopColor="#062923" />
          <stop offset="100%" stopColor="#0A3B33" />
        </linearGradient>
        <radialGradient id="hdr-ost-canopy" cx="50%" cy="42%" r="50%">
          <stop offset="0%" stopColor="#3FD39B" stopOpacity="0.24" />
          <stop offset="60%" stopColor="#0A3B33" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#031A17" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hdr-ost-gold-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE27A" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FFE27A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFE27A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hdr-ost-lime-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#B6F36B" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#3FD39B" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#3FD39B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hdr-ost-cyan-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5EF2D6" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#5EF2D6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#5EF2D6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="240" fill="url(#hdr-ost-bg)" />
      <circle cx="1180" cy="108" r="220" fill="url(#hdr-ost-canopy)" />

      {/* Mystical concentric dashed orbits */}
      <circle
        cx="1180"
        cy="126"
        r="126"
        fill="none"
        stroke="#3FD39B"
        strokeWidth="1.2"
        strokeDasharray="4 8"
        opacity="0.28"
      />
      <circle
        cx="1180"
        cy="126"
        r="176"
        fill="none"
        stroke="#3FD39B"
        strokeWidth="1.2"
        strokeDasharray="4 10"
        opacity="0.2"
      />

      {/* Floating leaves */}
      <g fill="#3FD39B" opacity="0.35">
        <ellipse cx="1088" cy="70" rx="14" ry="6" transform="rotate(14 1088 70)" />
        <ellipse cx="1250" cy="64" rx="14" ry="6" transform="rotate(-16 1250 64)" />
        <ellipse cx="978" cy="120" rx="12" ry="5" transform="rotate(-10 978 120)" />
        <ellipse cx="1384" cy="62" rx="12" ry="5" transform="rotate(12 1384 62)" />
      </g>

      {/* World Tree trunk and branches */}
      <g fill="none" stroke="#5B3A29" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1180 232 L1180 72" strokeWidth="16" />
        <path d="M1180 160 L1060 106 L1012 82" strokeWidth="10" />
        <path d="M1060 106 L1034 136" strokeWidth="6" />
        <path d="M1180 160 L1298 106 L1348 82" strokeWidth="10" />
        <path d="M1298 106 L1328 136" strokeWidth="6" />
        <path d="M1180 86 Q1152 68 1138 50" strokeWidth="6" />
        <path d="M1180 86 Q1208 68 1222 50" strokeWidth="6" />
      </g>
      <path d="M1176 232 L1176 80" stroke="#7A5039" strokeWidth="2.5" opacity="0.55" />

      {/* Ground hill & glowing grass blades */}
      <path d="M870 240 Q1160 218 1440 236 L1440 240 Z" fill="#04211D" />
      <g stroke="#3FD39B" strokeWidth="1.8" strokeLinecap="round" opacity="0.65">
        <path d="M960 236 L964 226 M966 236 L968 226" />
        <path d="M1102 232 L1106 222 M1108 232 L1110 222" />
        <path d="M1260 232 L1264 222 M1266 232 L1268 222" />
        <path d="M1380 236 L1384 226 M1386 236 L1388 226" />
      </g>

      {/* Crown Golden Outcome Orb */}
      <circle cx="1180" cy="28" r="56" fill="url(#hdr-ost-gold-glow)" />
      <g stroke="#FFE27A" strokeWidth="1.6" opacity="0.65">
        <line x1="1180" y1="0" x2="1180" y2="6" />
        <line x1="1152" y1="28" x2="1140" y2="28" />
        <line x1="1208" y1="28" x2="1220" y2="28" />
        <line x1="1158" y1="10" x2="1148" y2="2" />
        <line x1="1202" y1="10" x2="1212" y2="2" />
        <line x1="1158" y1="46" x2="1148" y2="54" />
        <line x1="1202" y1="46" x2="1212" y2="54" />
      </g>
      <circle cx="1180" cy="28" r="16" fill="#FFE27A" stroke="#FFFFFF" strokeWidth="2" />

      {/* Opportunity Cyan Branch Nodes */}
      {[
        [1180, 78],
        [1060, 106],
        [1298, 106],
      ].map(([nx, ny], idx) => (
        <g key={idx}>
          <circle cx={nx} cy={ny} r="22" fill="url(#hdr-ost-cyan-glow)" />
          <circle cx={nx} cy={ny} r="7.5" fill="#5EF2D6" stroke="#FFFFFF" strokeWidth="2" />
        </g>
      ))}

      {/* Solution Leaf Lights (Lime & Cyan) */}
      {[
        [1012, 82, "lime"],
        [1138, 50, "lime"],
        [1222, 50, "cyan"],
        [1348, 82, "lime"],
        [1034, 136, "cyan"],
        [1328, 136, "cyan"],
      ].map(([lx, ly, kind], idx) => (
        <g key={idx}>
          <circle
            cx={lx as number}
            cy={ly as number}
            r="24"
            fill={kind === "lime" ? "url(#hdr-ost-lime-glow)" : "url(#hdr-ost-cyan-glow)"}
          />
          <circle
            cx={lx as number}
            cy={ly as number}
            r="4.5"
            fill={kind === "lime" ? "#E8FFE9" : "#FFFFFF"}
          />
        </g>
      ))}

      {/* Ambient sparkles & firefly orbs */}
      <path d="M858 28 L861 35 L868 38 L861 41 L858 48 L855 41 L848 38 L855 35 Z" fill="#E8FFE9" />
      <path
        d="M1410 92 L1413 99 L1420 102 L1413 105 L1410 112 L1407 105 L1400 102 L1407 99 Z"
        fill="#E8FFE9"
      />
      {[
        [900, 150],
        [1086, 188],
        [1274, 180],
        [1404, 148],
      ].map(([fx, fy], idx) => (
        <g key={idx}>
          <circle cx={fx} cy={fy} r="9" fill="#B6F36B" opacity="0.22" />
          <circle cx={fx} cy={fy} r="2.8" fill="#E8FFE9" />
        </g>
      ))}
    </svg>
  );
}

/** 6. RAID LOG — Threat Radar */
export function RaidScene(): ReactElement {
  const legend = [
    { label: "RISK", color: "#FF4D5E", w: 46, y: 52 },
    { label: "ASSUME", color: "#FFB020", w: 34, y: 76 },
    { label: "ISSUE", color: "#22D3EE", w: 28, y: 100 },
    { label: "DEPEND", color: "#A78BFA", w: 40, y: 124 },
  ];

  const blips = [
    { x: 1082, y: 80, ch: "R", color: "#FF4D5E" },
    { x: 1184, y: 94, ch: "A", color: "#FFB020" },
    { x: 1094, y: 162, ch: "I", color: "#22D3EE" },
    { x: 1176, y: 166, ch: "D", color: "#A78BFA" },
  ];

  return (
    <svg {...SVG_PROPS}>
      <defs>
        <pattern id="hdr-raid-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0 L0 0 0 28" fill="none" stroke="#16203A" strokeWidth="1" />
        </pattern>
        <linearGradient id="hdr-raid-sweep-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.02" />
        </linearGradient>
        <pattern
          id="hdr-raid-hazard"
          width="20"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="skewX(-36)"
        >
          <rect width="10" height="12" fill="#FF4D5E" />
          <rect x="10" width="10" height="12" fill="#0A0F1C" />
        </pattern>
      </defs>

      <rect width="1440" height="240" fill="#0A0F1C" />
      <rect width="1440" height="240" fill="url(#hdr-raid-grid)" />

      {/* HUD Corner Brackets */}
      <g fill="none" stroke="#22D3EE" strokeWidth="2.2" opacity="0.72">
        <path d="M930 34 L930 16 L948 16" />
        <path d="M1398 16 L1416 16 L1416 34" />
        <path d="M930 198 L930 216 L948 216" />
        <path d="M1398 216 L1416 216 L1416 198" />
      </g>

      {/* Left RAID Legend */}
      <g
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.08em"
      >
        {legend.map((item) => (
          <g key={item.label} transform={`translate(946, ${item.y})`}>
            <circle cx="0" cy="-3" r="3.5" fill={item.color} />
            <text x="12" y="0" fill="#C7D2EA">
              {item.label}
            </text>
            <rect x="64" y="-6" width={item.w} height="5" rx="1" fill={item.color} opacity="0.85" />
          </g>
        ))}
      </g>

      {/* Right HUD telemetry lines */}
      <g>
        {(
          [
            [40, 128],
            [62, 104],
            [84, 120],
            [106, 86],
          ] as const
        ).map(([y, w], idx) => (
          <g key={idx} transform={`translate(1264, ${y})`}>
            <rect x="0" y="-2.5" width="5" height="5" fill="#22D3EE" opacity="0.8" />
            <line
              x1="10"
              y1="0"
              x2={10 + w}
              y2="0"
              stroke="#22D3EE"
              strokeWidth="1.5"
              opacity="0.45"
            />
          </g>
        ))}
      </g>

      {/* Radar Console */}
      <g>
        <circle
          cx="1130"
          cy="120"
          r="102"
          fill="rgba(16, 32, 58, 0.45)"
          stroke="#22D3EE"
          strokeWidth="2.2"
        />
        <circle
          cx="1130"
          cy="120"
          r="74"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1"
          opacity="0.42"
        />
        <circle
          cx="1130"
          cy="120"
          r="46"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1"
          opacity="0.35"
        />
        <circle
          cx="1130"
          cy="120"
          r="18"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1"
          opacity="0.3"
        />
        <line
          x1="1022"
          y1="120"
          x2="1238"
          y2="120"
          stroke="#22D3EE"
          strokeWidth="1"
          opacity="0.32"
        />
        <line
          x1="1130"
          y1="12"
          x2="1130"
          y2="228"
          stroke="#22D3EE"
          strokeWidth="1"
          opacity="0.32"
        />

        {/* Sweeping sector */}
        <g className="lp-hero-radar-sweep">
          <path d="M1130 120 L1130 18 A102 102 0 0 1 1218 69 Z" fill="url(#hdr-raid-sweep-grad)" />
          <line x1="1130" y1="120" x2="1218" y2="69" stroke="#22D3EE" strokeWidth="2.4" />
        </g>
        <circle cx="1130" cy="120" r="3.5" fill="#22D3EE" />

        {/* R, A, I, D blips */}
        {blips.map((b) => (
          <g key={b.ch} transform={`translate(${b.x}, ${b.y})`}>
            <circle r="21" fill={b.color} opacity="0.16" stroke={b.color} strokeWidth="1.2" />
            <circle r="13" fill="rgba(10, 15, 28, 0.72)" stroke={b.color} strokeWidth="2.2" />
            <text
              x="0"
              y="4.5"
              fill={b.color}
              fontFamily="JetBrains Mono, monospace"
              fontSize="13"
              fontWeight="700"
              textAnchor="middle"
            >
              {b.ch}
            </text>
          </g>
        ))}
      </g>

      {/* Bottom red/dark hazard stripe */}
      <rect x="932" y="228" width="484" height="12" fill="url(#hdr-raid-hazard)" />
    </svg>
  );
}

/** 8. KANO — Pop Chart */
export function KanoScene(): ReactElement {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <pattern id="hdr-kano-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="2.2" fill="#FF9F1C" opacity="0.4" />
        </pattern>
        <pattern id="hdr-kano-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0 L0 0 0 24" fill="none" stroke="#E5E7EB" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Pop Yellow base + halftone right side */}
      <rect width="1440" height="240" fill="#FFD93D" />
      <rect x="520" y="0" width="920" height="240" fill="url(#hdr-kano-dots)" />

      {/* Diagonal Hot Pink slash band */}
      <polygon
        points="920,0 1030,0 870,240 760,240"
        fill="#FF4FA3"
        stroke="#1B1030"
        strokeWidth="4"
      />
      <polygon points="1030,0 1052,0 892,240 870,240" fill="#1B1030" />

      {/* Pop-art confetti shapes */}
      <g stroke="#1B1030" strokeWidth="2.2">
        <rect x="640" y="34" width="14" height="8" transform="rotate(20 647 38)" fill="#3A86FF" />
        <circle cx="704" cy="64" r="6" fill="#FFFFFF" />
        <circle cx="636" cy="84" r="5" fill="#00C2A8" />
        <rect x="770" y="26" width="15" height="8" transform="rotate(-14 777 30)" fill="#FF4FA3" />
        <circle cx="854" cy="116" r="5.5" fill="#FF4FA3" />
        <rect x="790" y="138" width="16" height="8" transform="rotate(36 798 142)" fill="#FFFFFF" />
        <polygon points="826,178 834,194 818,194" fill="#3A86FF" />
        <rect
          x="842"
          y="206"
          width="15"
          height="8"
          transform="rotate(-24 850 210)"
          fill="#00C2A8"
        />
      </g>

      {/* Crisp White Kano Chart Panel with hard ink shadow */}
      <g transform="translate(900, 18)">
        <rect x="8" y="8" width="484" height="198" rx="14" fill="#1B1030" />
        <rect width="484" height="198" rx="14" fill="#FFFFFF" stroke="#1B1030" strokeWidth="4" />
        <rect x="4" y="4" width="476" height="190" rx="11" fill="url(#hdr-kano-grid)" />

        {/* Axes */}
        <line
          x1="30"
          y1="16"
          x2="30"
          y2="184"
          stroke="#1B1030"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <polyline
          points="23,26 30,15 37,26"
          fill="none"
          stroke="#1B1030"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="30"
          y1="100"
          x2="462"
          y2="100"
          stroke="#1B1030"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        <g
          fill="#1B1030"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10.5"
          fontWeight="700"
          letterSpacing="0.08em"
        >
          <text x="40" y="28">
            DELIGHTED
          </text>
          <text x="40" y="182">
            UPSET
          </text>
          <text x="392" y="117">
            FEATURE
          </text>
        </g>

        {/* Curves with thick ink casing + colored core */}
        {/* Delighter (Hot Pink) */}
        <path
          d="M44 96 C210 96, 360 84, 464 14"
          fill="none"
          stroke="#1B1030"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M44 96 C210 96, 360 84, 464 14"
          fill="none"
          stroke="#FF4FA3"
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Performance (Perform Teal) */}
        <path
          d="M44 182 L464 56"
          fill="none"
          stroke="#1B1030"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M44 182 L464 56"
          fill="none"
          stroke="#00C2A8"
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Must-be (Must-be Blue) */}
        <path
          d="M44 182 C110 120, 260 105, 464 103"
          fill="none"
          stroke="#1B1030"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M44 182 C110 120, 260 105, 464 103"
          fill="none"
          stroke="#3A86FF"
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* D, P, M endpoint badges */}
        {[
          { y: 14, ch: "D", fill: "#FF4FA3" },
          { y: 56, ch: "P", fill: "#00C2A8" },
          { y: 103, ch: "M", fill: "#3A86FF" },
        ].map((b) => (
          <g key={b.ch} transform={`translate(464, ${b.y})`}>
            <circle r="12" fill={b.fill} stroke="#1B1030" strokeWidth="3" />
            <text
              x="0"
              y="4"
              fill="#FFFFFF"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
            >
              {b.ch}
            </text>
          </g>
        ))}

        {/* Comic WOW! starburst */}
        <g transform="translate(342, 42)">
          <polygon
            points="0,-32 8,-22 20,-28 20,-15 34,-14 25,-3 34,8 21,12 22,25 10,20 2,31 -6,20 -18,26 -18,13 -32,12 -23,1 -32,-10 -19,-14 -20,-26 -8,-21"
            fill="#FFE600"
            stroke="#1B1030"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <text
            x="0"
            y="5"
            fill="#1B1030"
            fontFamily="Barlow Condensed, sans-serif"
            fontSize="17"
            fontWeight="900"
            fontStyle="italic"
            textAnchor="middle"
          >
            WOW!
          </text>
        </g>

        {/* Comic sparkles */}
        <path
          d="M202 22 L205 29 L212 32 L205 35 L202 42 L199 35 L192 32 L199 29 Z"
          fill="#FFFFFF"
          stroke="#1B1030"
          strokeWidth="1.5"
        />
        <path
          d="M100 172 L103 179 L110 182 L103 185 L100 192 L97 185 L90 182 L97 179 Z"
          fill="#FFFFFF"
          stroke="#1B1030"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
