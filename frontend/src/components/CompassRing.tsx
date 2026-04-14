"use client";

import type { CSSProperties } from "react";

type Props = {
  value: number;              // 0 – 100
  size?: number;              // px
  stroke?: number;            // px
  label?: string;             // lower-case label under the number
  display?: string;           // overrides the big number shown (e.g. a count)
  suffix?: string;            // e.g. "%"
  palette?: "dark" | "light";
};

/**
 * Compass-style progress ring.  SVG, animated draw, with tick-mark
 * bezel reminiscent of a traffic gauge.  The big centred number uses
 * the italic-serif display face.
 */
export default function CompassRing({
  value,
  size = 220,
  stroke = 14,
  label = "compliant",
  display,
  suffix = "%",
  palette = "dark",
}: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  const bezelOpacity = palette === "dark" ? 0.07 : 0.12;
  const trackColor =
    palette === "dark" ? "rgba(255,255,255,0.07)" : "rgba(11,12,14,0.07)";
  const textColor = palette === "dark" ? "#FFFFFF" : "#0B0C0E";
  const subColor =
    palette === "dark" ? "rgba(255,255,255,0.42)" : "rgba(11,12,14,0.45)";

  // 60 minor tick marks at every 6°
  const ticks = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}${suffix} ${label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={trackColor}
          fill="none"
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke="url(#ringGrad)"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="animate-ring"
          style={{
            ["--ring-dash" as string]: c,
            ["--ring-offset" as string]: offset,
          } as CSSProperties}
        />

        {/* Tick bezel */}
        <g>
          {ticks.map((i) => {
            const angle = (i * 6 * Math.PI) / 180;
            const inner = r - stroke / 2 - (i % 5 === 0 ? 12 : 7);
            const outer = r - stroke / 2 - 2;
            const x1 = size / 2 + inner * Math.cos(angle);
            const y1 = size / 2 + inner * Math.sin(angle);
            const x2 = size / 2 + outer * Math.cos(angle);
            const y2 = size / 2 + outer * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={palette === "dark" ? "#fff" : "#000"}
                strokeOpacity={i % 5 === 0 ? bezelOpacity * 2 : bezelOpacity}
                strokeWidth={i % 5 === 0 ? 1.25 : 0.75}
              />
            );
          })}
        </g>

        {/* Gradient def for the progress stroke */}
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF7A44" />
            <stop offset="100%" stopColor="#FF5A1F" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center read-out */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="italic-serif leading-none"
          style={{ fontSize: size * 0.34, color: textColor }}
        >
          {display ?? clamped}
          <span
            className="italic-serif"
            style={{ fontSize: size * 0.18, color: subColor }}
          >
            {suffix}
          </span>
        </div>
        <div
          className="mt-2 uppercase tracking-[0.22em] font-medium"
          style={{ fontSize: size * 0.055, color: subColor }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
