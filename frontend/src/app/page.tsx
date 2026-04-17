"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Plus,
  MoreHorizontal,
  Play,
  OctagonAlert,
  TriangleAlert,
  Info,
  Smartphone,
  Truck,
  FileDown,
  CalendarPlus,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { api, useApi, type UiAlert } from "../lib/api";

/* =========================================================
   Sparkline — responsive SVG (scales to container)
   ========================================================= */
function Sparkline({
  values,
  color = "var(--color-orange)",
  className = "",
  showDots = false,
  gradientId,
}: {
  values: number[];
  color?: string;
  className?: string;
  showDots?: boolean;
  gradientId: string;
}) {
  const vbW = 200;
  const vbH = 80;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = vbW / (values.length - 1);
  const pts = values.map(
    (v, i) =>
      [i * step, vbH - ((v - min) / range) * (vbH - pad * 2) - pad] as const
  );
  const pointsStr = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${vbH} ${pointsStr} ${vbW},${vbH}`;
  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showDots && (
        <>
          {/* Start point */}
          <circle
            cx={pts[0][0]}
            cy={pts[0][1]}
            r={2}
            fill={color}
            fillOpacity={0.35}
            vectorEffect="non-scaling-stroke"
          />
          {/* End point emphasized */}
          <circle
            cx={pts[pts.length - 1][0]}
            cy={pts[pts.length - 1][1]}
            r={3}
            fill="#FFFEF7"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}

/* =========================================================
   Hero visual — SVG volumetric orange orb + corridor nodes
   ========================================================= */
function HeroVisual() {
  return (
    <section
      className="relative col-span-6 rounded-[24px] overflow-hidden rise"
      style={{
        background:
          "radial-gradient(120% 90% at 72% 50%, #1A0F08 0%, #0A0806 55%, #080503 100%)",
        minHeight: 340,
        animationDelay: "100ms",
      }}
    >
      {/* --------------- SVG scene --------------- */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 600 340"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          {/* Warm gradient sphere core */}
          <radialGradient id="heroCore" cx="50%" cy="45%" r="55%">
            <stop offset="0%"  stopColor="#FFEBD4" />
            <stop offset="10%" stopColor="#FFD0A4" />
            <stop offset="28%" stopColor="#FF9A5E" />
            <stop offset="50%" stopColor="#FF6B35" />
            <stop offset="72%" stopColor="#B63C13" />
            <stop offset="90%" stopColor="#3A1406" />
            <stop offset="100%" stopColor="#140502" />
          </radialGradient>

          {/* Soft orange halo behind the sphere */}
          <radialGradient id="heroHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#FF6B35" stopOpacity={0.55} />
            <stop offset="30%" stopColor="#FF6B35" stopOpacity={0.26} />
            <stop offset="70%" stopColor="#FF6B35" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
          </radialGradient>

          {/* Specular highlight */}
          <radialGradient id="heroSpec" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={0.55} />
            <stop offset="60%"  stopColor="#FFE2CA" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#FFE2CA" stopOpacity={0} />
          </radialGradient>

          {/* Rim highlight arc */}
          <linearGradient id="heroRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#FFD6B3" stopOpacity={0} />
            <stop offset="50%"  stopColor="#FFD6B3" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#FFD6B3" stopOpacity={0} />
          </linearGradient>

          <filter id="heroBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="heroBlurLg" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Outer halo */}
        <circle cx="420" cy="170" r="300" fill="url(#heroHalo)" />

        {/* Decorative orbits */}
        <g>
          <ellipse cx="420" cy="170" rx="240" ry="82" fill="none" stroke="#FFFFFF" strokeOpacity="0.05" strokeWidth="1" transform="rotate(-18 420 170)" />
          <ellipse cx="420" cy="170" rx="205" ry="60" fill="none" stroke="#FF6B35" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="3 6" transform="rotate(-18 420 170)" />
          <ellipse cx="420" cy="170" rx="170" ry="40" fill="none" stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="1" transform="rotate(22 420 170)" />
        </g>

        {/* Thin concentric rings */}
        <circle cx="420" cy="170" r="190" fill="none" stroke="#FFFFFF" strokeOpacity="0.045" strokeWidth="1" strokeDasharray="1 8" />
        <circle cx="420" cy="170" r="158" fill="none" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="1" />

        {/* Sphere core */}
        <circle cx="420" cy="170" r="128" fill="url(#heroCore)" />

        {/* Rim highlight on sphere edge */}
        <circle cx="420" cy="170" r="127" fill="none" stroke="url(#heroRim)" strokeWidth="1.5" transform="rotate(-30 420 170)" />

        {/* Specular highlight (upper-left of sphere) */}
        <ellipse cx="386" cy="138" rx="44" ry="26" fill="url(#heroSpec)" filter="url(#heroBlur)" />

        {/* Small sparks */}
        <circle cx="372" cy="122" r="2.5" fill="#FFE2CA" />
        <circle cx="396" cy="118" r="1.5" fill="#FFD0A4" fillOpacity="0.8" />

        {/* Satellite / node markers around the sphere */}
        <g>
          <circle cx="235" cy="126" r="8"   fill="#FF6B35" fillOpacity="0.18" filter="url(#heroBlur)" />
          <circle cx="235" cy="126" r="3"   fill="#FF8B5A" />
          <circle cx="235" cy="126" r="1.2" fill="#FFFFFF" />

          <circle cx="585" cy="238" r="8"   fill="#FFB58C" fillOpacity="0.22" filter="url(#heroBlur)" />
          <circle cx="585" cy="238" r="2.5" fill="#FFB58C" />

          <circle cx="180" cy="268" r="6"   fill="#FFD0A4" fillOpacity="0.16" filter="url(#heroBlur)" />
          <circle cx="180" cy="268" r="2"   fill="#FFD0A4" />
        </g>

        {/* Connecting signal lines from nodes toward sphere */}
        <g stroke="#FF6B35" strokeWidth="0.75" strokeOpacity="0.25" strokeDasharray="2 3" fill="none">
          <path d="M 245 130 Q 330 150 310 160" />
          <path d="M 575 232 Q 510 210 520 200" />
          <path d="M 190 260 Q 280 230 310 210" />
        </g>

        {/* Soft bottom shadow to ground the sphere */}
        <ellipse cx="420" cy="310" rx="120" ry="12" fill="#000" opacity="0.5" filter="url(#heroBlurLg)" />
      </svg>

      {/* --------------- Foreground chrome --------------- */}

      {/* Top-left badge */}
      <div className="absolute top-5 left-5 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-paper-2/60 z-10">
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
          style={{ background: "var(--color-orange)" }}
        />
        Live signal
      </div>

      {/* Top-right stat */}
      <div className="absolute top-5 right-5 z-10 flex items-center gap-3 text-[10.5px] font-mono tabular text-paper-2/55 uppercase tracking-[0.12em]">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-paper-2/40" />
          205 · nodes
        </div>
        <div className="w-px h-3 bg-paper-2/15" />
        <div className="flex items-center gap-1.5">
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: "var(--color-go-2, #5EC486)" }}
          />
          uplink
        </div>
      </div>

      {/* Data annotations floating near satellites */}
      <div
        className="absolute z-10 hidden md:block text-[9.5px] font-mono tabular text-paper-2/55 uppercase tracking-[0.1em]"
        style={{ top: "26%", left: "29%" }}
      >
        <div className="text-paper-2/75 font-semibold">NH-48</div>
        <div className="text-paper-2/40">RL 142 mcd</div>
      </div>
      <div
        className="absolute z-10 hidden md:block text-[9.5px] font-mono tabular text-paper-2/55 uppercase tracking-[0.1em] text-right"
        style={{ top: "63%", right: "6%" }}
      >
        <div className="text-paper-2/75 font-semibold">DME</div>
        <div className="text-paper-2/40">RL 158 mcd</div>
      </div>

      {/* Text overlay card — bottom-left */}
      <div
        className="absolute bottom-5 left-5 right-5 md:right-auto md:max-w-[320px] rounded-[18px] p-5 z-10"
        style={{
          background: "rgba(12, 10, 8, 0.68)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div className="text-[24px] font-semibold leading-[1.08] text-paper-2 tracking-[-0.01em]">
          Keep every corridor
          <br />
          <span style={{ color: "var(--color-orange-soft)" }}>signal-ready.</span>
        </div>
        <div className="text-[12px] text-paper-2/65 mt-2.5 leading-relaxed">
          Retroreflectivity intelligence across 5 national highways —
          continuous, predictive, ready before the monsoon.
        </div>

        {/* CTA row */}
        <div className="mt-4 flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-paper-2 text-ink text-[11.5px] font-semibold hover:brightness-105 transition"
          >
            <Play className="w-2.5 h-2.5 fill-ink" strokeWidth={0} />
            Watch tour
          </button>
          <a
            href="/retroguard-paper.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 h-8 px-3 rounded-full text-[11.5px] text-paper-2/70 hover:text-paper-2 border border-paper-2/10 hover:border-paper-2/25 transition"
          >
            Read paper <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Bottom-right stat block */}
      <div className="absolute bottom-5 right-5 z-10 text-right hidden lg:block">
        <div className="text-[9.5px] uppercase tracking-[0.2em] text-paper-2/45 font-mono">
          avg RL · network
        </div>
        <div className="mt-1 text-[32px] font-semibold text-paper-2 leading-none tabular">
          142
          <span className="text-[16px] text-paper-2/50 font-medium ml-1">
            mcd
          </span>
        </div>
        <div className="mt-1 flex items-center justify-end gap-1 text-[9.5px] font-mono tabular text-orange-soft">
          <TrendingUp className="w-2.5 h-2.5" />
          +3.1% 30d
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Calendar mini widget
   ========================================================= */
function CalendarMini() {
  // April 2026 begins on Wednesday
  const monthLabel = "April 2026";
  const firstDayOfWeek = 3; // 0=Sun
  const daysInMonth = 30;
  const today = 14;

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
  const grid: (number | null)[] = [];
  // pre-padding (Mon-start)
  const padStart = (firstDayOfWeek + 6) % 7;
  for (let i = 0; i < padStart; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7) grid.push(null);

  return (
    <section
      className="col-span-3 card p-5 flex flex-col rise"
      style={{ animationDelay: "140ms" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13.5px] font-semibold text-ink">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-ink/5 transition">
            <ChevronLeft className="w-3.5 h-3.5 text-ink/60" />
          </button>
          <button className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-ink/5 transition">
            <ChevronRight className="w-3.5 h-3.5 text-ink/60" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekdays.map((d, i) => (
          <div
            key={i}
            className="h-6 flex items-center justify-center text-[10px] uppercase tracking-[0.1em] text-ink/40 font-medium"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((d, i) => {
          const isToday = d === today;
          return (
            <div
              key={i}
              className={`h-7 flex items-center justify-center text-[11.5px] rounded-[7px] transition ${
                isToday
                  ? "text-white font-semibold"
                  : d
                  ? "text-ink/75 hover:bg-ink/5 cursor-pointer"
                  : "text-transparent"
              }`}
              style={
                isToday
                  ? {
                      background: "var(--color-orange)",
                      boxShadow: "0 6px 16px -6px rgba(255,107,53,0.6)",
                    }
                  : undefined
              }
            >
              {d ?? "·"}
            </div>
          );
        })}
      </div>

      {/* Upcoming events */}
      <div className="mt-5 space-y-2.5 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-9 shrink-0">
            <div className="text-[10px] text-ink/45 uppercase font-medium">Thu</div>
            <div className="text-[16px] font-semibold text-ink leading-none mt-0.5">17</div>
          </div>
          <div className="flex-1 min-w-0 border-l border-ink/10 pl-3">
            <div className="text-[12.5px] font-medium text-ink leading-tight">
              Compliance review · NH-48
            </div>
            <div className="text-[10.5px] text-ink/50 mt-0.5">10:30 — 11:45 IST</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-9 shrink-0">
            <div className="text-[10px] text-ink/45 uppercase font-medium">Fri</div>
            <div className="text-[16px] font-semibold text-ink leading-none mt-0.5">18</div>
          </div>
          <div className="flex-1 min-w-0 border-l border-ink/10 pl-3">
            <div className="text-[12.5px] font-medium text-ink leading-tight">
              Crew dispatch · NH-44 km 80+200
            </div>
            <div className="text-[10.5px] text-ink/50 mt-0.5">Sign replacement · Alpha crew</div>
          </div>
        </div>
      </div>

      <button
        className="mt-4 h-10 rounded-[12px] text-white font-medium text-[12.5px] flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110 transition"
        style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
        Schedule inspection
      </button>
    </section>
  );
}

/* =========================================================
   Weekly workload heatmap — orange intensity grid
   ========================================================= */
function WorkloadHeatmap() {
  // 5 days × 10 weeks, deterministic pseudo-random
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const weeks = 10;
  const cells: number[][] = days.map((_, d) =>
    Array.from({ length: weeks }, (_, w) => {
      const x = Math.sin(d * 7.3 + w * 13.11) * 10000;
      return Math.abs(x - Math.floor(x));
    })
  );

  const bucket = (v: number) => {
    if (v < 0.25) return 0;
    if (v < 0.5) return 1;
    if (v < 0.75) return 2;
    return 3;
  };
  const tones = [
    "rgba(255, 107, 53, 0.16)",
    "rgba(255, 107, 53, 0.36)",
    "rgba(255, 107, 53, 0.62)",
    "rgba(255, 107, 53, 0.92)",
  ];

  return (
    <section
      className="col-span-6 card p-6 rise"
      style={{ animationDelay: "260ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink/45 mb-1">
            Measurement load
          </div>
          <div className="text-[20px] font-semibold text-ink leading-tight">
            Weekly crew workload
          </div>
        </div>
        <a href="/measure" className="text-[12px] text-ink/55 hover:text-ink flex items-center gap-1 font-medium">
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-5 text-[10.5px] text-ink/60 font-medium tracking-wide">
        {[
          { label: "Low", tone: tones[0] },
          { label: "Medium", tone: tones[1] },
          { label: "High", tone: tones[2] },
          { label: "Fully Occupied", tone: tones[3] },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[4px]" style={{ background: l.tone }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 items-stretch">
        {/* Day labels */}
        <div className="flex flex-col justify-around text-[10px] font-medium text-ink/45 tracking-[0.1em]">
          {days.map((d) => (
            <div key={d} className="h-6 flex items-center">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-10 grid-rows-5 gap-1.5">
          {cells.flatMap((row, d) =>
            row.map((v, w) => (
              <div
                key={`${d}-${w}`}
                className="rounded-[6px] transition-all hover:scale-110"
                style={{
                  background: tones[bucket(v)],
                  aspectRatio: "1 / 1",
                }}
                title={`${days[d]} · Week ${w + 1}`}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Tiny KPI card factory
   ========================================================= */
function KPI({
  label,
  value,
  unit,
  delta,
  deltaPositive,
  spark,
  goal,
  goalLabel,
  className = "col-span-3",
  delay = 0,
  viewAll = true,
  idKey,
}: {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  deltaPositive: boolean;
  spark: number[];
  goal?: { target: number; current: number; unit?: string }; // optional progress-to-goal
  goalLabel?: string;
  className?: string;
  delay?: number;
  viewAll?: boolean;
  idKey: string;
}) {
  const min = Math.min(...spark);
  const max = Math.max(...spark);
  const latest = spark[spark.length - 1];
  const prev = spark[spark.length - 2];
  const lineColor = deltaPositive
    ? "var(--color-orange)"       // trending up = hero orange (positive)
    : "var(--color-alarm)";       // trending down = warm alarm

  // Progress-to-goal %, if provided
  const goalPct = goal ? Math.round((goal.current / goal.target) * 100) : null;

  return (
    <section
      className={`${className} card p-5 rise flex flex-col`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] font-semibold text-ink">{label}</div>
        {viewAll && (
          <button className="text-[11px] text-ink/45 hover:text-ink font-medium flex items-center gap-0.5">
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Metric + delta */}
      <div className="mt-3 flex items-end gap-2 flex-wrap">
        <span className="text-[44px] font-semibold text-ink leading-[0.95] tabular tracking-[-0.02em]">
          {value}
        </span>
        {unit && (
          <span className="text-[13.5px] text-ink/50 font-medium mb-1">
            {unit}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11.5px]">
        {deltaPositive ? (
          <TrendingUp
            className="w-3.5 h-3.5"
            style={{ color: "var(--color-go)" }}
          />
        ) : (
          <TrendingDown
            className="w-3.5 h-3.5"
            style={{ color: "var(--color-alarm)" }}
          />
        )}
        <span
          className="font-medium"
          style={{
            color: deltaPositive ? "var(--color-go)" : "var(--color-alarm)",
          }}
        >
          {delta}
        </span>
        <span className="text-ink/40">from previous week</span>
      </div>

      {/* Optional goal / progress sub-line */}
      {goal && (
        <div className="mt-4 pb-1">
          <div className="flex items-center justify-between text-[10.5px] text-ink/50 font-medium mb-1.5">
            <span>{goalLabel ?? "Progress to goal"}</span>
            <span className="font-mono tabular">
              {goal.current}
              <span className="text-ink/35">/{goal.target}</span>
              {goal.unit && <span className="text-ink/35"> {goal.unit}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ink/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, goalPct!)}%`,
                background:
                  "linear-gradient(90deg, var(--color-orange-soft), var(--color-orange))",
              }}
            />
          </div>
        </div>
      )}

      {/* Chart fills remaining vertical space */}
      <div className="flex-1 mt-5 flex flex-col justify-end min-h-[110px]">
        {/* Min/Max scale markers */}
        <div className="flex items-center justify-between text-[9.5px] text-ink/40 font-mono tabular mb-1">
          <span>
            <span className="text-ink/30">min</span> {min.toFixed(min < 10 ? 1 : 0)}
          </span>
          <span>
            <span className="text-ink/30">max</span> {max.toFixed(max < 10 ? 1 : 0)}
          </span>
        </div>

        {/* Big responsive sparkline */}
        <div className="relative flex-1 min-h-[72px]">
          <Sparkline
            values={spark}
            color={lineColor}
            className="absolute inset-0 w-full h-full"
            showDots
            gradientId={`spark-${idKey}`}
          />
          {/* Latest value callout */}
          <div
            className="absolute top-1 right-1 flex items-center gap-1 text-[9.5px] font-mono tabular px-1.5 py-0.5 rounded-[5px]"
            style={{
              background: "rgba(28,27,25,0.04)",
              color: "var(--color-ink)",
            }}
          >
            <span className="text-ink/50">now</span>
            <span className="font-semibold">
              {typeof latest === "number"
                ? latest.toFixed(latest < 10 ? 1 : 0)
                : latest}
            </span>
            <span
              className="text-[9px]"
              style={{
                color:
                  latest >= prev
                    ? "var(--color-go)"
                    : "var(--color-alarm)",
              }}
            >
              {latest >= prev ? "▲" : "▼"}
            </span>
          </div>
        </div>

        {/* Week labels */}
        <div className="flex items-center justify-between mt-2 text-[9px] text-ink/40 font-mono tabular uppercase tracking-[0.1em]">
          <span>W1</span>
          <span className="opacity-60">W3</span>
          <span className="opacity-60">W5</span>
          <span className="opacity-60">W7</span>
          <span>W{spark.length}</span>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Updates / Measurements card (wide progress)
   ========================================================= */
function UpdatesCard() {
  const total = 1892;
  const compliant = 1382;
  const warning = 340;
  const critical = 170;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <section className="col-span-3 card p-5 rise" style={{ animationDelay: "60ms" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-ink">Measurements</div>
        <button className="text-[11px] text-ink/45 hover:text-ink font-medium flex items-center gap-0.5">
          View all <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-end gap-2 mb-1">
        <span className="text-[42px] font-semibold text-ink leading-none tabular">
          {total.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="text-[11.5px] text-ink/50 mb-4">
        Total measurements logged this quarter
      </div>

      {/* Compliance pill */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded-full text-white text-[10px] font-semibold tracking-wider uppercase"
            style={{ background: "var(--color-orange)" }}
          >
            Compliant
          </span>
          <span className="font-semibold text-ink text-[14px] tabular">
            {compliant.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Stacked bar */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink/[0.05]">
          <div className="h-full" style={{ width: `${pct(compliant)}%`, background: "var(--color-orange)" }} />
          <div className="h-full" style={{ width: `${pct(warning)}%`, background: "var(--color-orange-soft)" }} />
          <div className="h-full" style={{ width: `${pct(critical)}%`, background: "rgba(28,27,25,0.25)" }} />
        </div>

        <div className="flex items-center justify-between mt-2 text-[10.5px] text-ink/55 font-medium">
          <span>{pct(compliant)}%</span>
          <span>{pct(warning)}%</span>
          <span>{pct(critical)}%</span>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Live alerts feed — warm icon badges, theme-harmonious
   ========================================================= */
function AlertsFeed() {
  const { data: alerts, loading, error } = useApi(
    () => api.listAlerts({ is_resolved: false, limit: 8 }),
    []
  );
  const items: UiAlert[] = (alerts ?? []).slice(0, 4);

  /* Warm, theme-aligned severity palette — all in the orange/amber family */
  const severityStyle = (sev: string) => {
    if (sev === "critical") {
      return {
        Icon: OctagonAlert,
        label: "Critical",
        badgeBg:
          "linear-gradient(140deg, rgba(232,90,38,0.22), rgba(213,66,48,0.14))",
        badgeFg: "#B33420",
        chipBg: "rgba(213,66,48,0.12)",
        chipFg: "#9E2E1C",
      };
    }
    if (sev === "warning") {
      return {
        Icon: TriangleAlert,
        label: "Warning",
        badgeBg:
          "linear-gradient(140deg, rgba(255,139,90,0.26), rgba(217,139,20,0.18))",
        badgeFg: "#B06A12",
        chipBg: "rgba(217,139,20,0.14)",
        chipFg: "#97580E",
      };
    }
    return {
      Icon: Info,
      label: "Info",
      badgeBg:
        "linear-gradient(140deg, rgba(168,160,148,0.22), rgba(139,131,120,0.14))",
      badgeFg: "#6A645A",
      chipBg: "rgba(139,131,120,0.12)",
      chipFg: "#5B564D",
    };
  };

  return (
    <section
      className="col-span-6 card p-6 rise"
      style={{ animationDelay: "340ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink/45 mb-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--color-orange-deep)" }}
            />
            Live alerts
          </div>
          <div className="text-[20px] font-semibold text-ink leading-tight">
            Requires your attention
          </div>
        </div>
        <a
          href="/alerts"
          className="text-[12px] text-ink/55 hover:text-ink flex items-center gap-1 font-medium"
        >
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="space-y-1.5">
        {loading && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3.5 px-3 py-2.5 -mx-2 animate-pulse">
                <div className="w-10 h-10 rounded-[11px] bg-ink/[0.05] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 bg-ink/[0.05] rounded-full w-1/3" />
                  <div className="h-2.5 bg-ink/[0.05] rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </>
        )}
        {error && !loading && (
          <div className="text-[12px] text-alarm/85 px-3 py-4 rounded-[12px] bg-alarm/[0.05]">
            Failed to load alerts · {error.message}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="text-[12.5px] text-ink/50 px-3 py-6 text-center">
            Queue is clear — no active alerts.
          </div>
        )}
        {!loading && items.map((a, i) => {
          const s = severityStyle(a.severity);
          const Icon = s.Icon;
          return (
            <div
              key={a.id}
              className="group flex items-center gap-3.5 px-3 py-2.5 -mx-2 rounded-[14px] hover:bg-ink/[0.025] transition cursor-pointer slide-right"
              style={{ animationDelay: `${420 + i * 80}ms` }}
            >
              {/* Warm icon badge replaces the vertical bar */}
              <div
                className="relative w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0"
                style={{ background: s.badgeBg, color: s.badgeFg }}
              >
                <Icon className="w-[17px] h-[17px]" strokeWidth={2} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono tabular uppercase tracking-[0.12em] text-ink/55 font-medium">
                    {a.highway} · {a.chainage}
                  </span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-[2px] rounded-[4px] leading-none"
                    style={{ background: s.chipBg, color: s.chipFg }}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="text-[13px] text-ink/85 leading-snug line-clamp-1">
                  {a.message}
                </div>
              </div>

              <div className="text-[10.5px] font-mono tabular text-ink/40 shrink-0 w-12 text-right">
                {a.timestamp.split(" ")[1]}
              </div>

              <button className="w-8 h-8 rounded-full bg-ink/[0.04] group-hover:bg-ink group-hover:text-paper-2 text-ink/45 flex items-center justify-center transition shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================
   PAGE
   ========================================================= */
export default function DashboardPage() {
  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      {/* ---------- top bar ---------- */}
      <TopBar />

      {/* ---------- hero greeting ---------- */}
      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[48px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Hi, Madhav!
              <span className="block text-ink/55 font-normal">
                Let&rsquo;s keep India&rsquo;s highways safe today.
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <QuickActionsMenu />
            <button
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
              Dispatch crew
            </button>
          </div>
        </div>
      </div>

      {/* ---------- bento grid ---------- */}
      <div className="grid grid-cols-12 gap-3 auto-rows-[minmax(120px,auto)]">
        {/* Row 1 */}
        <UpdatesCard />
        <HeroVisual />
        <CalendarMini />

        {/* Row 2 */}
        <KPI
          idKey="alerts"
          label="Alerts cleared"
          value="282"
          delta="+18.22%"
          deltaPositive
          spark={[10, 12, 9, 16, 18, 15, 20, 22, 26, 28]}
          goal={{ target: 320, current: 282 }}
          goalLabel="Quarterly target"
          className="col-span-3"
          delay={180}
        />
        <KPI
          idKey="rl"
          label="Avg RL score"
          value="3.78"
          unit="× IRC min"
          delta="−5.48"
          deltaPositive={false}
          spark={[22, 20, 24, 21, 18, 19, 17, 16, 15, 14]}
          goal={{ target: 5, current: 3.78, unit: "×" }}
          goalLabel="Safe operating margin"
          className="col-span-3"
          delay={220}
        />
        <WorkloadHeatmap />

        {/* Row 3 */}
        <KPI
          idKey="hours"
          label="Inspection hours"
          value="4.8"
          unit="h avg"
          delta="+29.36%"
          deltaPositive
          spark={[3, 3.5, 3.2, 3.8, 4, 4.2, 4.4, 4.5, 4.7, 4.8]}
          goal={{ target: 6, current: 4.8, unit: "h" }}
          goalLabel="Weekly capacity"
          className="col-span-3"
          delay={300}
        />
        <KPI
          idKey="qa"
          label="QA pass rate"
          value="94"
          unit="%"
          delta="+1.25%"
          deltaPositive
          spark={[90, 91, 92, 91.5, 92.5, 93, 93.5, 93.2, 93.8, 94]}
          goal={{ target: 98, current: 94, unit: "%" }}
          goalLabel="IRC benchmark"
          className="col-span-3"
          delay={340}
        />
        <AlertsFeed />
      </div>

      {/* Footer line */}
      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard v0.9 · 6th nhai innovation hackathon</span>
        <span>sync · 14:32 IST · 205 nodes · uplink healthy</span>
      </div>
    </div>
  );
}

/* =========================================================
   Quick actions dropdown
   ========================================================= */

function QuickActionsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const actions = [
    {
      icon: Smartphone,
      label: "New measurement",
      sub: "Launch field-capture tool",
      href: "/measure",
    },
    {
      icon: Truck,
      label: "Dispatch crew",
      sub: "Assign to critical asset",
      href: "/alerts",
    },
    {
      icon: CalendarPlus,
      label: "Schedule inspection",
      sub: "Add a corridor sweep",
      href: "#",
    },
    {
      icon: FileDown,
      label: "Export compliance report",
      sub: "IRC 67 / IRC 35 · PDF",
      href: "/reports",
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/70 gap-2"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
        Quick actions
        <ChevronRight
          className={`w-3 h-3 rotate-90 opacity-60 transition ${
            open ? "rotate-[270deg]" : ""
          }`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-[2100] min-w-[280px] rounded-[16px] bg-paper shadow-[0_22px_44px_-14px_rgba(28,27,25,0.22)] border border-ink/[0.06] p-1.5 animate-fade-in-up"
          style={{ animationDuration: "160ms" }}
        >
          <div className="px-3 pt-1.5 pb-2 text-[9.5px] uppercase tracking-[0.22em] text-ink/45 font-medium">
            Quick actions
          </div>
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <a
                key={i}
                href={a.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-[11px] hover:bg-ink/[0.04] transition group"
              >
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-orange-deep"
                  style={{ background: "rgba(255,107,53,0.08)" }}
                >
                  <Icon className="w-[15px] h-[15px]" strokeWidth={1.9} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-ink leading-tight">
                    {a.label}
                  </div>
                  <div className="text-[10.5px] text-ink/50 mt-0.5">
                    {a.sub}
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-ink/30 group-hover:text-ink mt-2 transition" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
