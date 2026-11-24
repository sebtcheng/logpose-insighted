import type { ReactElement } from "react";

const SVG_PROPS = {
  "aria-hidden": true as const,
  className: "lp-hero__art",
  viewBox: "0 0 1440 240",
  preserveAspectRatio: "xMaxYMid slice" as const,
};

function blueprintGearPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  teeth: number,
): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.2;
    const a2 = a0 + step * 0.44;
    const a3 = a0 + step * 0.64;
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

/** 9. SETTINGS — Blueprint */
export function SettingsScene(): ReactElement {
  const dialTicks = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="hdr-set-bg" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#1E4FA3" />
          <stop offset="60%" stopColor="#174492" />
          <stop offset="100%" stopColor="#143C82" />
        </linearGradient>
        <pattern id="hdr-set-grid-sm" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 L0 0 0 20" fill="none" stroke="#4B72B8" strokeWidth="0.7" opacity="0.45" />
        </pattern>
        <pattern id="hdr-set-grid-lg" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#hdr-set-grid-sm)" />
          <path
            d="M100 0 L0 0 0 100"
            fill="none"
            stroke="#4B72B8"
            strokeWidth="1.4"
            opacity="0.7"
          />
        </pattern>
      </defs>

      <rect width="1440" height="240" fill="url(#hdr-set-bg)" />
      <rect width="1440" height="240" fill="url(#hdr-set-grid-lg)" />

      {/* Technical sliders */}
      <g transform="translate(848, 38)">
        {[
          { y: 0, kx: 72 },
          { y: 26, kx: 32 },
          { y: 52, kx: 118 },
        ].map((s, idx) => (
          <g key={idx}>
            <line
              x1="0"
              y1={s.y}
              x2="156"
              y2={s.y}
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx={s.kx} cy={s.y} r="8" fill="#FF8A3D" stroke="#FFFFFF" strokeWidth="2" />
          </g>
        ))}
        {/* Calibration ticks under sliders */}
        {Array.from({ length: 13 }, (_, i) => (
          <line
            key={i}
            x1={i * 13}
            y1="64"
            x2={i * 13}
            y2="68"
            stroke="#9CC3FF"
            strokeWidth="1"
            opacity="0.75"
          />
        ))}
      </g>

      {/* Stacked toggles */}
      <g transform="translate(848, 122)">
        <rect width="48" height="24" rx="12" fill="#FF8A3D" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="36" cy="12" r="8" fill="#FFFFFF" />
        <rect y="32" width="48" height="24" rx="12" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="12" cy="44" r="8" fill="#9CC3FF" />
      </g>

      {/* Rotary control dial */}
      <g transform="translate(960, 158)">
        {dialTicks.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={Math.cos(rad) * 26}
              y1={Math.sin(rad) * 26}
              x2={Math.cos(rad) * 32}
              y2={Math.sin(rad) * 32}
              stroke="#9CC3FF"
              strokeWidth="1.5"
            />
          );
        })}
        <circle r="21" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
        <circle r="15" fill="none" stroke="#9CC3FF" strokeWidth="1" strokeDasharray="3 3" />
        <line
          x1="0"
          y1="0"
          x2="11"
          y2="-11"
          stroke="#FF8A3D"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle r="3.5" fill="#FF8A3D" />
      </g>

      {/* Technical line-art wrench */}
      <g
        transform="translate(848, 206)"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M22 6 A14 14 0 1 0 22 24 L30 19 L144 2 L152 8 L160 1 L156 -10 L144 -14 L138 -6 L28 11 Z" />
        <circle cx="147" cy="-3" r="4.5" />
      </g>

      {/* Meshing Blueprint Gears */}
      <g fill="none" stroke="#FFFFFF" strokeWidth="2">
        {/* Small lower-left gear */}
        <path d={blueprintGearPath(1134, 184, 46, 36, 12)} />
        <circle cx="1134" cy="184" r="24" stroke="#9CC3FF" strokeWidth="1.4" />
        <circle cx="1134" cy="184" r="10" />
        <line
          x1="1076"
          y1="184"
          x2="1192"
          y2="184"
          stroke="#9CC3FF"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <line
          x1="1134"
          y1="126"
          x2="1134"
          y2="238"
          stroke="#9CC3FF"
          strokeWidth="1"
          strokeDasharray="6 4"
        />

        {/* Large hero blueprint gear */}
        <path d={blueprintGearPath(1232, 118, 84, 68, 16)} strokeWidth="2.2" />
        <circle cx="1232" cy="118" r="46" stroke="#9CC3FF" strokeWidth="1.5" />
        <circle cx="1232" cy="118" r="16" strokeWidth="2" />
        <line
          x1="1136"
          y1="118"
          x2="1328"
          y2="118"
          stroke="#9CC3FF"
          strokeWidth="1.2"
          strokeDasharray="8 4"
        />
        <line
          x1="1232"
          y1="22"
          x2="1232"
          y2="214"
          stroke="#9CC3FF"
          strokeWidth="1.2"
          strokeDasharray="8 4"
        />

        {/* Upper-right meshing gear */}
        <path d={blueprintGearPath(1368, 36, 52, 42, 12)} />
        <circle cx="1368" cy="36" r="28" stroke="#9CC3FF" strokeWidth="1.4" />
        <circle cx="1368" cy="36" r="12" />
        <line
          x1="1306"
          y1="36"
          x2="1430"
          y2="36"
          stroke="#9CC3FF"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <line
          x1="1368"
          y1="0"
          x2="1368"
          y2="96"
          stroke="#9CC3FF"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
      </g>

      {/* Dimension callout Ø168 */}
      <g stroke="#9CC3FF" strokeWidth="1.4">
        <line x1="1148" y1="16" x2="1148" y2="34" />
        <line x1="1316" y1="16" x2="1316" y2="34" />
        <line x1="1148" y1="24" x2="1316" y2="24" />
      </g>
      <text
        x="1232"
        y="19"
        fill="#FFFFFF"
        fontFamily="JetBrains Mono, monospace"
        fontSize="11"
        fontWeight="700"
        textAnchor="middle"
      >
        Ø168
      </text>

      {/* Orange radius callout R84 */}
      <polyline
        points="1232,118 1296,170 1334,170"
        fill="none"
        stroke="#FF8A3D"
        strokeWidth="2.2"
      />
      <text
        x="1340"
        y="174"
        fill="#FF8A3D"
        fontFamily="JetBrains Mono, monospace"
        fontSize="11"
        fontWeight="700"
      >
        R84
      </text>

      {/* CAD Title Block */}
      <g transform="translate(1248, 194)">
        <rect
          width="174"
          height="36"
          fill="rgba(10, 30, 80, 0.35)"
          stroke="#FFFFFF"
          strokeWidth="1.8"
        />
        <line x1="0" y1="18" x2="174" y2="18" stroke="#FFFFFF" strokeWidth="1.2" />
        <text
          x="8"
          y="13"
          fill="#FFFFFF"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
          fontWeight="700"
          letterSpacing="0.1em"
        >
          SETTINGS
        </text>
        <text
          x="8"
          y="30"
          fill="#9CC3FF"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="0.08em"
        >
          REV A · SCALE 1:1
        </text>
      </g>
    </svg>
  );
}

/** 10. ADMIN LOG — Approval Desk */
export function AdminLogScene(): ReactElement {
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id="hdr-adm-washi" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#F7EFDB" />
          <stop offset="60%" stopColor="#F1E2C0" />
          <stop offset="100%" stopColor="#E8D7B0" />
        </linearGradient>
        <pattern id="hdr-adm-shoji" width="72" height="58" patternUnits="userSpaceOnUse">
          <rect width="72" height="58" fill="#FBF3DF" />
          <path d="M72 0 L0 0 0 58" fill="none" stroke="#CBB58D" strokeWidth="2" />
        </pattern>
        <radialGradient id="hdr-adm-lantern-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE18C" stopOpacity="0.82" />
          <stop offset="60%" stopColor="#E8A250" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FBF3DF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Washi paper left background */}
      <rect width="1440" height="240" fill="url(#hdr-adm-washi)" />

      {/* Subtle vermilion Ensō circle watermark */}
      <path
        d="M612 124 A88 88 0 1 1 650 198"
        fill="none"
        stroke="#D8263E"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.16"
      />

      {/* Right Shoji screen */}
      <rect x="856" y="0" width="584" height="240" fill="#5B3D24" />
      <rect x="866" y="6" width="574" height="228" fill="url(#hdr-adm-shoji)" />

      {/* Two glowing red paper lanterns */}
      {(
        [
          [906, 66],
          [1030, 56],
        ] as const
      ).map(([lx, ly], idx) => (
        <g key={idx}>
          <circle cx={lx} cy={ly} r="44" fill="url(#hdr-adm-lantern-glow)" />
          <line x1={lx} y1="6" x2={lx} y2={ly - 22} stroke="#2B1B1B" strokeWidth="2" />
          <rect x={lx - 9} y={ly - 22} width="18" height="4" rx="1" fill="#2B1B1B" />
          <ellipse cx={lx} cy={ly} rx="16" ry="20" fill="#D8263E" />
          <path
            d={`M${lx - 15} ${ly - 6} Q${lx} ${ly - 2} ${lx + 15} ${ly - 6}`}
            fill="none"
            stroke="#9A1728"
            strokeWidth="1.4"
          />
          <path
            d={`M${lx - 15} ${ly + 6} Q${lx} ${ly + 10} ${lx + 15} ${ly + 6}`}
            fill="none"
            stroke="#9A1728"
            strokeWidth="1.4"
          />
          <rect x={lx - 9} y={ly + 18} width="18" height="4" rx="1" fill="#2B1B1B" />
          <line x1={lx} y1={ly + 22} x2={lx} y2={ly + 32} stroke="#CAA24B" strokeWidth="2" />
          <circle cx={lx} cy={ly + 34} r="2.5" fill="#CAA24B" />
        </g>
      ))}

      {/* Ledger book stack lower-left of shoji */}
      <g transform="translate(878, 174)">
        <rect
          x="0"
          y="0"
          width="76"
          height="16"
          rx="2"
          fill="#FBF3DF"
          stroke="#8A5A32"
          strokeWidth="1.5"
        />
        <rect x="10" y="16" width="84" height="18" rx="2" fill="#D8263E" />
        <rect x="6" y="34" width="106" height="20" rx="2" fill="#1D2B53" />
      </g>

      {/* Tilted Task Approval Scroll with Vermilion Hanko Seal */}
      <g transform="translate(954, 118) rotate(-5.5)">
        {/* Wooden rollers */}
        <rect x="-12" y="-6" width="16" height="106" rx="4" fill="#A6763E" />
        <rect x="342" y="-6" width="16" height="106" rx="4" fill="#A6763E" />
        {/* Scroll parchment */}
        <rect x="2" y="2" width="342" height="90" fill="#FFFDF6" stroke="#CBB58D" strokeWidth="2" />

        {/* Checklist rows */}
        {[0, 1, 2, 3].map((row) => {
          const ry = 18 + row * 17;
          const checked = row < 3;
          return (
            <g key={row}>
              <rect
                x="20"
                y={ry}
                width="11"
                height="11"
                rx="1.5"
                fill="#FFFFFF"
                stroke="#1D2B53"
                strokeWidth="1.8"
              />
              {checked ? (
                <polyline
                  points={`22,${ry + 5} 25,${ry + 9} 33,${ry - 1}`}
                  fill="none"
                  stroke="#D8263E"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              <line
                x1="42"
                y1={ry + 6}
                x2={row === 3 ? 168 : 210 + (row % 2) * 14}
                y2={ry + 6}
                stroke="#8D95A5"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Vermilion Hanko approval stamp */}
        <g transform="translate(292, 47)">
          <circle r="33" fill="#D8263E" />
          <circle r="27" fill="none" stroke="#FBF3DF" strokeWidth="2.2" />
          <polyline
            points="-12,0 -3,10 14,-10"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* Wooden Hanko stamp & stamp trajectory */}
      <line
        x1="1272"
        y1="118"
        x2="1338"
        y2="74"
        stroke="#D8263E"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
      <g transform="translate(1350, 32) rotate(14)">
        <rect
          x="-12"
          y="-32"
          width="24"
          height="48"
          rx="6"
          fill="#8A5A32"
          stroke="#5B3D24"
          strokeWidth="2"
        />
        <rect x="-10" y="-12" width="20" height="8" fill="#CAA24B" />
        <rect x="-22" y="16" width="44" height="14" rx="2" fill="#D8263E" />
      </g>
      {/* Motion accent lines */}
      <g stroke="#8D95A5" strokeWidth="2" strokeLinecap="round">
        <line x1="1374" y1="78" x2="1390" y2="70" />
        <line x1="1380" y1="92" x2="1398" y2="88" />
        <line x1="1384" y1="106" x2="1404" y2="104" />
      </g>

      {/* Vermilion Ink Pad */}
      <g transform="translate(1292, 196)">
        <rect width="100" height="24" rx="6" fill="#2B1B1B" />
        <rect x="7" y="5" width="86" height="14" rx="3" fill="#D8263E" />
        <line
          x1="14"
          y1="9"
          x2="86"
          y2="9"
          stroke="#FF7588"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>

      {/* Gold sparkles */}
      <path d="M962 18 L964 24 L970 26 L964 28 L962 34 L960 28 L954 26 L960 24 Z" fill="#CAA24B" />
      <path
        d="M1182 82 L1185 89 L1192 92 L1185 95 L1182 102 L1179 95 L1172 92 L1179 89 Z"
        fill="#CAA24B"
      />
      <path
        d="M1420 140 L1423 147 L1430 150 L1423 153 L1420 160 L1417 153 L1410 150 L1417 147 Z"
        fill="#CAA24B"
      />
    </svg>
  );
}
