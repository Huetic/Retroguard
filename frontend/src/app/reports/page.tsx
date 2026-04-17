"use client";

import { useState, useMemo } from "react";
import {
  Download,
  CheckCircle2,
  OctagonAlert,
  FileText,
  ArrowUpRight,
  Calendar,
  Printer,
  Share2,
  TrendingDown,
  ChevronDown,
} from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, useApi, type UiHighwayReport } from "../../lib/api";

const highwayOptions = ["NH-48", "NH-44", "NH-27", "NH-66", "DME"];

const highwayNames: Record<string, string> = {
  "NH-48": "Mumbai — Ahmedabad",
  "NH-44": "Delhi — Chennai",
  "NH-27": "Porbandar — Silchar",
  "NH-66": "Mumbai — Kochi",
  "DME": "Delhi — Meerut Expressway",
};

// Empty placeholder used while data is loading
const EMPTY_REPORT: UiHighwayReport = {
  totalAssets: 0,
  compliantPct: 0,
  warningPct: 0,
  criticalPct: 0,
  breakdown: [],
  criticalAssets: [],
};

export default function ReportsPage() {
  const [selectedHighway, setSelectedHighway] = useState(highwayOptions[0]);
  const [showToast, setShowToast] = useState(false);

  // Reports fetch per selected highway
  const {
    data: liveReport,
    loading,
    error,
  } = useApi<UiHighwayReport>(
    () => api.complianceReport(selectedHighway),
    [selectedHighway]
  );
  const report = liveReport ?? EMPTY_REPORT;

  // Also fetch highway totals for the selector badges
  const { data: highwayHealth } = useApi(
    () => api.highwayHealth(),
    []
  );
  const highwayTotals = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    (highwayHealth ?? []).forEach((h) => {
      m[h.highway] = h.total;
    });
    return m;
  }, [highwayHealth]);

  const counts = useMemo(() => {
    const totalCompliant = report.breakdown.reduce(
      (s, r) => s + r.compliant,
      0
    );
    const totalWarning = report.breakdown.reduce((s, r) => s + r.warning, 0);
    const totalCritical = report.breakdown.reduce((s, r) => s + r.critical, 0);
    return { totalCompliant, totalWarning, totalCritical };
  }, [report]);

  const handleExport = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-[2000] animate-fade-in-up">
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-[14px] shadow-[0_16px_40px_-12px_rgba(63,163,100,0.45)] text-white"
            style={{
              background: "linear-gradient(135deg, #5EC486, #3FA364)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[13px] font-semibold">
                Report generated successfully
              </p>
              <p className="text-[11px] font-mono tabular text-white/80">
                {selectedHighway.toLowerCase()}_compliance_apr2026.pdf
              </p>
            </div>
          </div>
        </div>
      )}

      <TopBar
        crumbs={[
          { label: "RetroGuard" },
          { label: "Compliance reports · IRC 67 & IRC 35 · auditable" },
        ]}
      />

      {/* =====================================================
          Hero greeting
          ===================================================== */}
      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: "var(--color-orange)" }}
              />
              Compliance reports
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Audit-ready, by corridor.
              <span className="block text-ink/55 font-normal text-[26px] mt-1">
                {selectedHighway} · {highwayNames[selectedHighway]}.
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
              April 2026
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <button
              onClick={() => window.print()}
              aria-label="Print report"
              title="Print this report"
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 w-10 !px-0"
            >
              <Printer className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
            <button className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 w-10 !px-0">
              <Share2 className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
            <button
              onClick={handleExport}
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #FF8B5A, #E85A26)",
              }}
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          Highway selector
          ===================================================== */}
      <div
        className="card p-3 mb-5 flex items-center gap-2 flex-wrap rise"
        style={{ animationDelay: "100ms" }}
      >
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink/45 font-medium px-2">
          Select corridor
        </div>
        {highwayOptions.map((hw) => {
          const active = selectedHighway === hw;
          return (
            <button
              key={hw}
              onClick={() => setSelectedHighway(hw)}
              className={`h-9 px-4 rounded-full text-[12px] font-medium flex items-center gap-2 transition ${
                active
                  ? "text-white shadow-[0_8px_18px_-8px_rgba(255,107,53,0.75)]"
                  : "bg-cream/70 hover:bg-cream border border-ink/[0.06] text-ink/80"
              }`}
              style={{
                background: active
                  ? "linear-gradient(135deg, #FF8B5A, #E85A26)"
                  : undefined,
              }}
            >
              <span className="font-mono tabular tracking-wider">{hw}</span>
              <span
                className={`text-[10px] font-mono tabular ${
                  active ? "text-white/75" : "text-ink/45"
                }`}
              >
                {highwayTotals[hw] ?? "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {error && !loading && (
        <div className="card p-4 mb-4 border-l-4" style={{ borderLeftColor: "var(--color-alarm)" }}>
          <div className="text-[13px] font-semibold text-alarm">
            Couldn&rsquo;t load report for {selectedHighway}
          </div>
          <div className="text-[11.5px] text-ink/55 mt-0.5 font-mono">
            {error.message}
          </div>
        </div>
      )}

      {/* Loading ribbon (subtle so it doesn't flash on every corridor switch) */}
      {loading && (
        <div className="flex items-center gap-2 mb-3 text-[10.5px] font-mono tabular uppercase tracking-[0.14em] text-ink/50 px-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-orange)" }} />
          Loading {selectedHighway} report…
        </div>
      )}

      {/* =====================================================
          Summary trio
          ===================================================== */}
      <div
        className="gap-3 mb-5 rise"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          animationDelay: "160ms",
          opacity: loading && !liveReport ? 0.4 : 1,
          transition: "opacity 200ms",
        }}
      >
        {/* Total Assets */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/50 font-medium">
              Total assets
            </div>
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{
                background: "rgba(139,131,120,0.12)",
                color: "#5B564D",
              }}
            >
              <FileText className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[44px] font-semibold text-ink leading-none tabular">
              {report.totalAssets}
            </span>
            <span className="text-[12px] text-ink/50 font-medium">
              monitored
            </span>
          </div>
          <div className="mt-2 text-[11.5px] text-ink/55">
            On {selectedHighway} · {highwayNames[selectedHighway]}
          </div>
        </div>

        {/* Compliance Rate */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/50 font-medium">
              Compliance rate
            </div>
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{
                background: "rgba(63,163,100,0.14)",
                color: "#2E7E4A",
              }}
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[44px] font-semibold leading-none tabular"
              style={{ color: "var(--color-go)" }}
            >
              {report.compliantPct}
            </span>
            <span className="text-[20px] text-ink/40 font-medium">%</span>
          </div>
          <div className="mt-3 h-2 w-full bg-ink/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${report.compliantPct}%`,
                background:
                  "linear-gradient(90deg, #5EC486, var(--color-go))",
              }}
            />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/50 font-medium">
              Status breakdown
            </div>
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(140deg, rgba(63,163,100,0.16), rgba(213,66,48,0.12))",
                color: "var(--color-ink)",
              }}
            >
              <div className="flex gap-0.5">
                <span
                  className="w-1 h-3 rounded-full"
                  style={{ background: "var(--color-go)" }}
                />
                <span
                  className="w-1 h-3 rounded-full"
                  style={{ background: "var(--color-caution)" }}
                />
                <span
                  className="w-1 h-3 rounded-full"
                  style={{ background: "var(--color-alarm)" }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <BreakdownRow
              color="var(--color-go)"
              label="Compliant"
              value={counts.totalCompliant}
              pct={report.compliantPct}
            />
            <BreakdownRow
              color="var(--color-caution)"
              label="Warning"
              value={counts.totalWarning}
              pct={report.warningPct}
            />
            <BreakdownRow
              color="var(--color-alarm)"
              label="Critical"
              value={counts.totalCritical}
              pct={report.criticalPct}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          Compliance by Asset Type table
          ===================================================== */}
      <div
        className="card overflow-hidden mb-4 rise"
        style={{ animationDelay: "220ms" }}
      >
        <div className="px-6 py-4 border-b border-ink/[0.05] flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-1 font-medium">
              Compliance by asset type
            </div>
            <div className="text-[17px] font-semibold text-ink leading-tight">
              Breakdown · {selectedHighway}
            </div>
          </div>
          <div className="text-[10.5px] font-mono tabular uppercase tracking-[0.14em] text-ink/45">
            {report.breakdown.length} categories
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "auto" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "200px" }} />
            </colgroup>
            <thead>
              <tr>
                <ThRep>Asset type</ThRep>
                <ThRep align="center">Total</ThRep>
                <ThRep align="center" tone="go">
                  Compliant
                </ThRep>
                <ThRep align="center" tone="caution">
                  Warning
                </ThRep>
                <ThRep align="center" tone="alarm">
                  Critical
                </ThRep>
                <ThRep align="right">Compliance %</ThRep>
              </tr>
            </thead>
            <tbody>
              {report.breakdown.map((row) => {
                const pct = Math.round((row.compliant / row.total) * 100);
                const barColor =
                  pct >= 80
                    ? "var(--color-go)"
                    : pct >= 60
                    ? "var(--color-caution)"
                    : "var(--color-alarm)";
                return (
                  <tr
                    key={row.type}
                    className="group hover:bg-cream/40 transition"
                  >
                    <TdRep first>
                      <span className="text-[13px] font-medium text-ink/85">
                        {row.type}
                      </span>
                    </TdRep>
                    <TdRep align="center">
                      <span className="font-mono tabular text-[13px] text-ink/75">
                        {row.total}
                      </span>
                    </TdRep>
                    <TdRep align="center">
                      <span
                        className="font-mono tabular text-[13px] font-semibold"
                        style={{ color: "var(--color-go)" }}
                      >
                        {row.compliant}
                      </span>
                    </TdRep>
                    <TdRep align="center">
                      <span
                        className="font-mono tabular text-[13px] font-semibold"
                        style={{ color: "var(--color-caution)" }}
                      >
                        {row.warning}
                      </span>
                    </TdRep>
                    <TdRep align="center">
                      <span
                        className="font-mono tabular text-[13px] font-semibold"
                        style={{ color: "var(--color-alarm)" }}
                      >
                        {row.critical}
                      </span>
                    </TdRep>
                    <TdRep align="right" last>
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-28 h-1.5 bg-ink/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                        <span className="text-[12px] font-semibold text-ink tabular w-9 text-right">
                          {pct}%
                        </span>
                      </div>
                    </TdRep>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          Critical Assets table
          ===================================================== */}
      <div
        className="card overflow-hidden rise"
        style={{ animationDelay: "280ms" }}
      >
        <div className="px-6 py-4 border-b border-ink/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(140deg, rgba(232,90,38,0.22), rgba(213,66,48,0.14))",
                color: "#B33420",
              }}
            >
              <OctagonAlert className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-0.5 font-medium">
                Immediate attention required
              </div>
              <div className="text-[17px] font-semibold text-ink leading-tight">
                Critical assets · dispatch first.
              </div>
            </div>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-[10.5px] font-mono tabular font-semibold uppercase tracking-[0.12em]"
            style={{
              background: "rgba(213,66,48,0.12)",
              color: "#9E2E1C",
            }}
          >
            {report.criticalAssets.length} assets
          </span>
        </div>

        {report.criticalAssets.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3"
              style={{
                background: "rgba(63,163,100,0.12)",
                color: "var(--color-go)",
              }}
            >
              <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="text-[15px] font-semibold text-ink mb-0.5">
              No critical assets on {selectedHighway}.
            </div>
            <div className="text-[12.5px] text-ink/55">
              Corridor is in full compliance.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: "120px" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "60px" }} />
              </colgroup>
              <thead>
                <tr>
                  <ThRep>Asset ID</ThRep>
                  <ThRep>Type</ThRep>
                  <ThRep>Chainage</ThRep>
                  <ThRep align="right">Current RL</ThRep>
                  <ThRep align="right">IRC min</ThRep>
                  <ThRep align="right">Deficit</ThRep>
                  <ThRep align="center">{""}</ThRep>
                </tr>
              </thead>
              <tbody>
                {report.criticalAssets.map((asset) => {
                  const deficit = asset.ircMin - asset.currentRL;
                  const deficitPct = Math.round(
                    (deficit / asset.ircMin) * 100
                  );
                  return (
                    <tr
                      key={asset.id}
                      className="group hover:bg-cream/40 transition cursor-pointer"
                    >
                      <TdRep first>
                        <span className="font-mono tabular text-[12px] font-semibold text-ink">
                          {asset.id}
                        </span>
                      </TdRep>
                      <TdRep>
                        <span className="text-[13px] text-ink/85">
                          {asset.type}
                        </span>
                      </TdRep>
                      <TdRep>
                        <span className="font-mono tabular text-[11.5px] text-ink/65">
                          {asset.chainage}
                        </span>
                      </TdRep>
                      <TdRep align="right">
                        <span
                          className="font-mono tabular text-[14px] font-semibold"
                          style={{ color: "var(--color-alarm)" }}
                        >
                          {asset.currentRL}
                        </span>
                      </TdRep>
                      <TdRep align="right">
                        <span className="font-mono tabular text-[11.5px] text-ink/45">
                          {asset.ircMin}
                        </span>
                      </TdRep>
                      <TdRep align="right">
                        <span
                          className="inline-flex items-center gap-1.5 font-mono tabular text-[12px] font-semibold px-2 py-[2px] rounded-[5px]"
                          style={{
                            background: "rgba(213,66,48,0.10)",
                            color: "#9E2E1C",
                          }}
                        >
                          <TrendingDown className="w-3 h-3" />−{deficit} ·{" "}
                          {deficitPct}%
                        </span>
                      </TdRep>
                      <TdRep align="center" last>
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ink/[0.03] group-hover:bg-ink group-hover:text-paper-2 text-ink/40 transition">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      </TdRep>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · compliance reports</span>
        <span>
          generated · 14:32 IST · {selectedHighway.toLowerCase()}_apr2026.pdf
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   Shared table cells + small parts
   ========================================================= */

function ThRep({
  children,
  align = "left",
  tone,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  tone?: "go" | "caution" | "alarm";
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";
  const color =
    tone === "go"
      ? "var(--color-go)"
      : tone === "caution"
      ? "var(--color-caution)"
      : tone === "alarm"
      ? "var(--color-alarm)"
      : "var(--color-ink)";
  return (
    <th
      className={`${alignClass} px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] first:pl-6 last:pr-6 border-b`}
      style={{
        background: "rgba(234,227,211,0.35)",
        borderBottomColor: "rgba(28,27,25,0.06)",
        color: tone ? color : "var(--color-mute)",
      }}
    >
      {children}
    </th>
  );
}

function TdRep({
  children,
  align = "left",
  first,
  last,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  first?: boolean;
  last?: boolean;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";
  return (
    <td
      className={`${alignClass} px-4 py-3.5 border-b border-ink/[0.035] ${
        first ? "pl-6" : ""
      } ${last ? "pr-6" : ""}`}
    >
      {children}
    </td>
  );
}

function BreakdownRow({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: number;
  pct: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
        <span className="text-[12px] text-ink/65">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular text-[13px] font-semibold text-ink">
          {value}
        </span>
        <span className="text-[10px] font-mono tabular text-ink/45">
          {pct}%
        </span>
      </div>
    </div>
  );
}
