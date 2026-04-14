"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import {
  Layers,
  Locate,
  Maximize2,
  Plus,
  ArrowUpRight,
  Search,
  Bell,
  Moon,
  Radio,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { mapAssets } from "../../data/sampleData";

const MapComponent = dynamic(() => import("../../components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center w-full h-full"
      style={{ background: "var(--color-cream)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--color-orange)" }}
        />
        <p className="text-[12px] text-ink/50 font-mono uppercase tracking-[0.15em]">
          Loading corridor map…
        </p>
      </div>
    </div>
  ),
});

const highwayNames: Record<string, string> = {
  "NH-48": "Mumbai — Ahmedabad",
  "NH-44": "Delhi — Chennai",
  "NH-27": "Porbandar — Silchar",
  "NH-66": "Mumbai — Kochi",
  "DME":   "Delhi — Meerut Exp.",
};

export default function MapPage() {
  const [activeHighway, setActiveHighway] = useState<string>("all");

  const filteredAssets = useMemo(() => {
    if (activeHighway === "all") return mapAssets;
    return mapAssets.filter((a) => a.highway === activeHighway);
  }, [activeHighway]);

  const compliant = filteredAssets.filter((a) => a.status === "compliant").length;
  const warning   = filteredAssets.filter((a) => a.status === "warning").length;
  const critical  = filteredAssets.filter((a) => a.status === "critical").length;
  const total     = filteredAssets.length;
  const compliancePct = total ? Math.round((compliant / total) * 100) : 0;

  const highwayStats = useMemo(() => {
    const codes = ["NH-48", "NH-44", "NH-27", "NH-66", "DME"];
    return codes.map((code) => {
      const a = mapAssets.filter((x) => x.highway === code);
      const c = a.filter((x) => x.status === "compliant").length;
      const w = a.filter((x) => x.status === "warning").length;
      const cr = a.filter((x) => x.status === "critical").length;
      const t = a.length || 1;
      return {
        code,
        name: highwayNames[code],
        total: a.length,
        compliant: c,
        warning: w,
        critical: cr,
        compliantPct: Math.round((c / t) * 100),
        warningPct:   Math.round((w / t) * 100),
        criticalPct:  Math.round((cr / t) * 100),
      };
    });
  }, []);

  const spotlight = useMemo(
    () =>
      [...mapAssets]
        .filter((a) => a.status === "critical")
        .sort((a, b) => (a.currentRL - a.ircMin) - (b.currentRL - b.ircMin))
        .slice(0, 3),
    []
  );

  return (
    <div
      className="relative rounded-[22px] overflow-hidden"
      style={{ height: "calc(100vh - 24px)" }}
    >
      {/* =================== MAP FILLS BACKGROUND =================== */}
      <div className="absolute inset-0">
        <MapComponent assets={filteredAssets} />
      </div>

      {/* =================== GLASS OVERLAYS =================== */}

      {/* ----- Top bar (glass) — search + account ----- */}
      <div className="absolute top-4 left-4 right-4 z-[1500] flex items-start justify-between gap-4 rise">
        {/* Left: breadcrumb + search */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="glass-chip h-10 px-4 rounded-full flex items-center gap-2 text-[12px] text-ink/70 font-medium shrink-0">
            <span className="font-semibold text-ink">RetroGuard</span>
            <span className="text-ink/30">/</span>
            <span className="truncate">Corridor map</span>
          </div>

          <button className="glass-chip h-10 px-4 rounded-full flex items-center gap-2 text-[12px] text-ink/60 min-w-[220px] hover:text-ink transition">
            <Search className="w-[15px] h-[15px]" strokeWidth={1.8} />
            <span>Search asset, km, highway…</span>
          </button>
        </div>

        {/* Right: tools + account */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="glass-chip w-10 h-10 rounded-full flex items-center justify-center text-ink/65 hover:text-ink transition">
            <Moon className="w-[15px] h-[15px]" strokeWidth={1.8} />
          </button>
          <button className="glass-chip w-10 h-10 rounded-full flex items-center justify-center text-ink/65 hover:text-ink transition relative">
            <Bell className="w-[15px] h-[15px]" strokeWidth={1.8} />
            <span
              className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--color-orange)" }}
            />
          </button>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-semibold text-ink shadow-[0_4px_12px_-4px_rgba(255,107,53,0.6)]"
            style={{ background: "linear-gradient(135deg, #FFB58C, #FF6B35)" }}
          >
            MD
          </div>
        </div>
      </div>

      {/* ----- Hero glass panel (top-left) ----- */}
      <div
        className="absolute top-20 left-4 z-[1500] glass rounded-[22px] p-6 max-w-[420px] rise"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/55 mb-3">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: "var(--color-orange)" }}
          />
          Corridor map
        </div>
        <h1 className="text-[36px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
          Geography,
          <br />
          <span className="text-ink/65 font-normal">at a glance.</span>
        </h1>

        {/* Status counts inline */}
        <div className="mt-5 pt-5 border-t border-ink/10 grid grid-cols-3 gap-3">
          <InlineStat tone="go"      value={compliant} label="Compliant" />
          <InlineStat tone="caution" value={warning}   label="Warning" />
          <InlineStat tone="alarm"   value={critical}  label="Critical" />
        </div>
      </div>

      {/* ----- Corridor filter chips (below hero, left column) ----- */}
      <div
        className="absolute left-4 z-[1500] flex flex-wrap gap-1.5 max-w-[420px] rise"
        style={{ top: "calc(50% - 20px)", animationDelay: "160ms" }}
      >
        <CorridorChip
          label="All corridors"
          count={mapAssets.length}
          active={activeHighway === "all"}
          onClick={() => setActiveHighway("all")}
        />
        {highwayStats.map((h) => (
          <CorridorChip
            key={h.code}
            label={h.code}
            count={h.total}
            active={activeHighway === h.code}
            onClick={() =>
              setActiveHighway(activeHighway === h.code ? "all" : h.code)
            }
          />
        ))}
      </div>

      {/* ----- Right sidebar glass column ----- */}
      <div
        className="absolute top-20 right-4 bottom-4 z-[1500] w-[320px] flex flex-col gap-3 rise"
        style={{ animationDelay: "120ms" }}
      >
        {/* Network snapshot */}
        <div className="glass rounded-[22px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/55 mb-1">
                Network snapshot
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-semibold text-ink leading-none tabular">
                  {compliancePct}
                </span>
                <span className="text-[13px] text-ink/50 font-medium">%</span>
                <span className="text-[12px] text-ink/50 ml-1">compliant</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-ink/50 uppercase tracking-[0.15em]">
                assets
              </div>
              <div className="text-[14px] font-semibold text-ink tabular">
                {total}
              </div>
            </div>
          </div>

          <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink/[0.08]">
            <div
              className="h-full"
              style={{
                width: total ? `${(compliant / total) * 100}%` : 0,
                background: "var(--color-go)",
              }}
            />
            <div
              className="h-full"
              style={{
                width: total ? `${(warning / total) * 100}%` : 0,
                background: "var(--color-caution)",
              }}
            />
            <div
              className="h-full"
              style={{
                width: total ? `${(critical / total) * 100}%` : 0,
                background: "var(--color-alarm)",
              }}
            />
          </div>
        </div>

        {/* Corridor list */}
        <div className="glass rounded-[22px] p-5 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/55 mb-1 flex items-center gap-1.5">
                <Radio className="w-3 h-3" strokeWidth={2} />
                Corridors
              </div>
              <div className="text-[16px] font-semibold text-ink leading-tight">
                Five active routes
              </div>
            </div>
            <button className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-ink/50 hover:text-ink transition">
              expand →
            </button>
          </div>

          <div className="overflow-y-auto min-h-0 -mx-1 pr-1">
            {highwayStats.map((h, i) => {
              const active = activeHighway === h.code;
              return (
                <button
                  key={h.code}
                  onClick={() =>
                    setActiveHighway(active ? "all" : h.code)
                  }
                  className={`group w-full text-left p-3 rounded-[12px] transition mb-1 slide-right ${
                    active
                      ? "bg-orange/10 ring-1 ring-orange/25"
                      : "hover:bg-ink/[0.04]"
                  }`}
                  style={{ animationDelay: `${200 + i * 50}ms` }}
                >
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span
                        className={`font-mono tabular text-[10.5px] uppercase tracking-[0.1em] ${
                          active ? "text-orange-deep" : "text-ink/55"
                        }`}
                      >
                        {h.code}
                      </span>
                      <span className="text-[12px] text-ink/75 truncate">
                        {h.name}
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold text-ink tabular shrink-0">
                      {h.compliantPct}%
                    </span>
                  </div>
                  <div className="flex h-[4px] w-full overflow-hidden rounded-full bg-ink/[0.08]">
                    <div
                      className="h-full"
                      style={{
                        width: `${h.compliantPct}%`,
                        background: "var(--color-go)",
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${h.warningPct}%`,
                        background: "var(--color-caution)",
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${h.criticalPct}%`,
                        background: "var(--color-alarm)",
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono tabular text-ink/50">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: "var(--color-go)" }}
                      />
                      {h.compliant}
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: "var(--color-caution)" }}
                      />
                      {h.warning}
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: "var(--color-alarm)" }}
                      />
                      {h.critical}
                    </span>
                    <ChevronRight
                      className={`ml-auto w-3 h-3 transition ${
                        active ? "text-orange" : "text-ink/25 group-hover:text-ink/50"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Critical spotlight */}
        <div className="glass-dark rounded-[22px] p-5 text-paper-2">
          <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-paper-2/55 mb-3">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--color-orange)" }}
            />
            Critical spotlight
          </div>
          <div className="space-y-2.5">
            {spotlight.map((a) => {
              const deficit = a.ircMin - a.currentRL;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 cursor-pointer hover:translate-x-0.5 transition"
                >
                  <div
                    className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 text-[13px] font-semibold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #FF7A44, #D54230)",
                    }}
                  >
                    !
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[9.5px] font-mono tabular uppercase tracking-[0.12em] text-paper-2/55 mb-0.5">
                      <span className="font-semibold text-paper-2/85">
                        {a.highway}
                      </span>
                      <span>·</span>
                      <span className="truncate">{a.chainage}</span>
                    </div>
                    <div className="text-[12px] text-paper-2/90 truncate">
                      {a.type}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-semibold tabular text-paper-2 leading-none">
                      {a.currentRL}
                    </div>
                    <div className="flex items-center justify-end gap-0.5 text-[9.5px] font-mono tabular mt-0.5" style={{ color: "#FFB58C" }}>
                      <TrendingDown className="w-2.5 h-2.5" />
                      −{deficit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ----- Map tools (bottom-left floating buttons) ----- */}
      <div
        className="absolute bottom-4 left-4 z-[1500] flex flex-col gap-1.5 rise"
        style={{ animationDelay: "200ms" }}
      >
        <MapTool icon={Layers}    label="Layers" />
        <MapTool icon={Locate}    label="Center on India" />
        <MapTool icon={Maximize2} label="Fullscreen" />
      </div>

      {/* ----- Add asset CTA (bottom-center, hero button) ----- */}
      <div
        className="absolute bottom-4 z-[1500] rise"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          animationDelay: "240ms",
        }}
      >
        <button
          className="pill text-white font-medium gap-2 h-12 px-6 text-[13px] shadow-[0_12px_30px_-10px_rgba(255,107,53,0.7)] hover:brightness-110 transition"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.25} />
          Add asset
          <span className="mx-1 h-4 w-px bg-white/30" />
          <span className="text-[11px] font-mono tabular text-white/80">
            {activeHighway === "all" ? "any corridor" : activeHighway}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
        </button>
      </div>
    </div>
  );
}

/* ==========================================================
   Small shared pieces
   ========================================================== */

function InlineStat({
  tone,
  value,
  label,
}: {
  tone: "go" | "caution" | "alarm";
  value: number;
  label: string;
}) {
  const color =
    tone === "go"
      ? "var(--color-go)"
      : tone === "caution"
      ? "var(--color-caution)"
      : "var(--color-alarm)";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-ink/55 font-medium mb-1">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
        {label}
      </div>
      <div className="text-[22px] font-semibold text-ink leading-none tabular">
        {value}
      </div>
    </div>
  );
}

function CorridorChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-3.5 rounded-full text-[12px] font-medium flex items-center gap-2 transition ${
        active
          ? "text-white shadow-[0_8px_20px_-8px_rgba(255,107,53,0.75)]"
          : "glass-chip text-ink/75 hover:text-ink"
      }`}
      style={{
        background: active
          ? "linear-gradient(135deg, #FF8B5A, #E85A26)"
          : undefined,
      }}
    >
      {label}
      <span
        className={`text-[10px] font-mono tabular ${
          active ? "text-white/75" : "text-ink/45"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function MapTool({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className="glass-chip w-10 h-10 rounded-[12px] flex items-center justify-center text-ink/65 hover:text-ink transition"
    >
      <Icon className="w-[16px] h-[16px]" strokeWidth={1.8} />
    </button>
  );
}
