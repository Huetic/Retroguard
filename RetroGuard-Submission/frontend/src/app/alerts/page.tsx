"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  OctagonAlert,
  TriangleAlert,
  Info,
  Bell,
  Clock,
  Download,
  Minus,
  X,
} from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, useApi, type UiAlert } from "../../lib/api";

const highways = ["All", "NH-48", "NH-44", "NH-27", "NH-66", "DME"];

export default function AlertsPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [hwFilter, setHwFilter] = useState("All");

  // Live alerts from backend
  const { data, loading, error, refetch } = useApi<UiAlert[]>(
    () => api.listAlerts({ is_resolved: false }),
    []
  );
  const [localAlerts, setLocalAlerts] = useState<UiAlert[] | null>(null);

  // Sync local state when backend returns new data
  useEffect(() => {
    if (data) setLocalAlerts(data);
  }, [data]);

  const alerts: UiAlert[] = localAlerts ?? [];

  // Optimistic resolve — drop locally, then PUT to backend, refetch on error
  const handleResolve = async (id: string) => {
    const target = alerts.find((a) => a.id === id);
    if (!target) return;
    setLocalAlerts((prev) =>
      prev ? prev.filter((a) => a.id !== id) : prev
    );
    try {
      await api.resolveAlert(target.rawId);
    } catch (e) {
      console.error("Failed to resolve alert:", e);
      // Re-fetch on failure to revert UI
      refetch();
    }
  };

  // Bulk "Resolve all critical" action
  const [resolvingAll, setResolvingAll] = useState(false);
  const handleResolveAllCritical = async () => {
    const criticals = alerts.filter((a) => a.severity === "critical");
    if (criticals.length === 0) return;
    if (!confirm(`Resolve ${criticals.length} critical alert${criticals.length > 1 ? "s" : ""}? This cannot be undone.`))
      return;
    setResolvingAll(true);
    // Optimistic drop
    setLocalAlerts((prev) =>
      prev ? prev.filter((a) => a.severity !== "critical") : prev
    );
    try {
      await Promise.all(criticals.map((a) => api.resolveAlert(a.rawId)));
    } catch (e) {
      console.error("Bulk resolve failed:", e);
      refetch();
    } finally {
      setResolvingAll(false);
    }
  };

  // Export active alerts as JSON download
  const handleExportQueue = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      total: alerts.length,
      counts: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
      },
      alerts: alerts.map((a) => ({
        id: a.id,
        severity: a.severity,
        highway: a.highway,
        chainage: a.chainage,
        message: a.message,
        timestamp: a.timestamp,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `retroguard-alerts-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(
    () => ({
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    }),
    [alerts]
  );

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        q === "" ||
        a.message.toLowerCase().includes(q) ||
        a.highway.toLowerCase().includes(q) ||
        a.chainage.toLowerCase().includes(q);
      const matchesSev =
        filterSeverity === "all" || a.severity === filterSeverity;
      const matchesHw = hwFilter === "All" || a.highway === hwFilter;
      return matchesSearch && matchesSev && matchesHw;
    });
  }, [alerts, search, filterSeverity, hwFilter]);

  const filtersActive =
    search !== "" || hwFilter !== "All" || filterSeverity !== "all";
  const resetFilters = () => {
    setSearch("");
    setFilterSeverity("all");
    setHwFilter("All");
  };

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar
        crumbs={[
          { label: "RetroGuard" },
          { label: "Alerts · live queue · auto-escalation on" },
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
              Alerts queue
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Requires your attention.
              <span className="block text-ink/55 font-normal text-[26px] mt-1">
                {counts.total} open · {counts.critical} critical to dispatch
                today.
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportQueue}
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
              title="Download the current alert queue as JSON"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              Export queue
            </button>
            <button
              onClick={handleResolveAllCritical}
              disabled={resolvingAll || alerts.filter((a) => a.severity === "critical").length === 0}
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #FF8B5A, #E85A26)",
              }}
              title="Mark every critical alert as resolved"
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.25} />
              {resolvingAll ? "Resolving…" : `Resolve all critical (${alerts.filter((a) => a.severity === "critical").length})`}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          Severity cards  —  act as toggleable filters
          ===================================================== */}
      <div
        className="gap-3 mb-5 rise"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          animationDelay: "100ms",
        }}
      >
        <SeverityCard
          active={filterSeverity === "all"}
          onClick={() => setFilterSeverity("all")}
          icon={Bell}
          count={counts.total}
          label="All alerts"
          tone="neutral"
        />
        <SeverityCard
          active={filterSeverity === "critical"}
          onClick={() =>
            setFilterSeverity(
              filterSeverity === "critical" ? "all" : "critical"
            )
          }
          icon={OctagonAlert}
          count={counts.critical}
          label="Critical"
          tone="alarm"
        />
        <SeverityCard
          active={filterSeverity === "warning"}
          onClick={() =>
            setFilterSeverity(filterSeverity === "warning" ? "all" : "warning")
          }
          icon={TriangleAlert}
          count={counts.warning}
          label="Warning"
          tone="caution"
        />
        <SeverityCard
          active={filterSeverity === "info"}
          onClick={() =>
            setFilterSeverity(filterSeverity === "info" ? "all" : "info")
          }
          icon={Info}
          count={counts.info}
          label="Informational"
          tone="info"
        />
      </div>

      {/* =====================================================
          Filter bar
          ===================================================== */}
      <div
        className="card p-3 mb-4 flex items-center gap-2 flex-wrap rise"
        style={{ animationDelay: "140ms" }}
      >
        <div className="relative flex-1 min-w-[260px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-ink/40 pointer-events-none"
            strokeWidth={1.8}
          />
          <input
            type="text"
            placeholder="Search by message, highway, chainage…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "42px", paddingRight: "16px" }}
            className="w-full h-10 text-[13px] bg-cream/70 rounded-[11px] focus:outline-none focus:ring-2 focus:ring-orange/40 text-ink placeholder-ink/45 border border-ink/[0.04] focus:bg-paper transition"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-ink/45 font-medium pl-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </div>

        <FilterSelect
          value={hwFilter}
          onChange={setHwFilter}
          options={highways}
          labelFor={(v) => (v === "All" ? "All highways" : v)}
        />

        <button className="h-9 px-3 rounded-full text-[12px] font-medium bg-cream/70 hover:bg-cream border border-ink/[0.06] text-ink/80 flex items-center gap-1.5 transition">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
          Last 24h
          <ChevronDown className="w-3 h-3 text-ink/45" />
        </button>

        {filtersActive && (
          <button
            onClick={resetFilters}
            className="pill bg-orange/[0.08] border border-orange/20 text-orange-deep gap-1.5 h-9 text-[11.5px] hover:bg-orange/15"
          >
            <Minus className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Result meta */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-[11px] text-ink/55 font-mono tabular uppercase tracking-[0.14em]">
          Showing{" "}
          <span className="text-ink font-semibold">{filtered.length}</span> of{" "}
          <span className="text-ink font-semibold">{alerts.length}</span> alerts
          {filtersActive && (
            <span
              className="ml-2 text-[9.5px] normal-case tracking-normal px-1.5 py-0.5 rounded-[4px] font-medium"
              style={{
                background: "rgba(255,107,53,0.12)",
                color: "var(--color-orange-deep)",
              }}
            >
              filtered
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink/55">
          <span>Sort</span>
          <button className="flex items-center gap-1.5 text-[11px] font-medium text-ink/80 bg-paper/60 hover:bg-paper border border-ink/5 rounded-full h-8 px-3 transition">
            Newest first
            <ChevronDown className="w-3 h-3 text-ink/50" />
          </button>
        </div>
      </div>

      {/* =====================================================
          Alerts list
          ===================================================== */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="card p-4 flex items-center gap-4 animate-pulse"
              >
                <div className="w-11 h-11 rounded-[12px] bg-ink/[0.06] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 bg-ink/[0.06] rounded-full w-1/4" />
                  <div className="h-3 bg-ink/[0.06] rounded-full w-3/4" />
                </div>
                <div className="h-8 w-20 bg-ink/[0.06] rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-6 text-center">
            <div className="text-[15px] font-semibold text-alarm mb-1">
              Couldn&rsquo;t load alerts
            </div>
            <div className="text-[12.5px] text-ink/55 mb-4">{error.message}</div>
            <button
              onClick={() => refetch()}
              className="pill bg-orange/10 border border-orange/20 text-orange-deep gap-1.5 h-9"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasAnyAlerts={alerts.length > 0}
            onReset={resetFilters}
            hasFilters={filtersActive}
          />
        ) : (
          filtered.map((alert, i) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onResolve={handleResolve}
              delay={180 + i * 40}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · alerts queue</span>
        <span>auto-refresh 60s · {counts.total} open</span>
      </div>
    </div>
  );
}

/* =========================================================
   Severity toggle card
   ========================================================= */

type Tone = "neutral" | "alarm" | "caution" | "info";

function SeverityCard({
  active,
  onClick,
  icon: Icon,
  count,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  count: number;
  label: string;
  tone: Tone;
}) {
  const cfg = {
    neutral: {
      badgeBg:
        "linear-gradient(140deg, rgba(168,160,148,0.22), rgba(139,131,120,0.14))",
      badgeFg: "#6A645A",
      ring: "rgba(139,131,120,0.28)",
      accent: "var(--color-ink)",
    },
    alarm: {
      badgeBg:
        "linear-gradient(140deg, rgba(232,90,38,0.24), rgba(213,66,48,0.16))",
      badgeFg: "#B33420",
      ring: "rgba(213,66,48,0.28)",
      accent: "var(--color-alarm)",
    },
    caution: {
      badgeBg:
        "linear-gradient(140deg, rgba(255,139,90,0.26), rgba(217,139,20,0.18))",
      badgeFg: "#B06A12",
      ring: "rgba(217,139,20,0.28)",
      accent: "var(--color-caution)",
    },
    info: {
      badgeBg:
        "linear-gradient(140deg, rgba(255,181,140,0.30), rgba(255,107,53,0.18))",
      badgeFg: "#B05A28",
      ring: "rgba(255,107,53,0.28)",
      accent: "var(--color-orange)",
    },
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left transition-all w-full min-w-0 ${
        active
          ? "shadow-[0_14px_28px_-14px_rgba(28,27,25,0.15)]"
          : "hover:shadow-[0_10px_22px_-14px_rgba(28,27,25,0.12)]"
      }`}
      style={{
        borderColor: active ? cfg.ring : "rgba(0,0,0,0.04)",
        boxShadow: active ? `0 0 0 2px ${cfg.ring}` : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: cfg.badgeBg, color: cfg.badgeFg }}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[30px] font-semibold leading-none tabular text-ink">
              {count}
            </span>
            {active && (
              <span
                className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: cfg.badgeBg,
                  color: cfg.badgeFg,
                }}
              >
                active
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-ink/55 font-medium mt-1 truncate">
            {label}
          </div>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   Alert row
   ========================================================= */

function AlertRow({
  alert,
  onResolve,
  delay,
}: {
  alert: UiAlert;
  onResolve: (id: string) => void;
  delay: number;
}) {
  const severityStyle = {
    critical: {
      Icon: OctagonAlert,
      label: "Critical",
      badgeBg:
        "linear-gradient(140deg, rgba(232,90,38,0.22), rgba(213,66,48,0.14))",
      badgeFg: "#B33420",
      chipBg: "rgba(213,66,48,0.12)",
      chipFg: "#9E2E1C",
    },
    warning: {
      Icon: TriangleAlert,
      label: "Warning",
      badgeBg:
        "linear-gradient(140deg, rgba(255,139,90,0.26), rgba(217,139,20,0.18))",
      badgeFg: "#B06A12",
      chipBg: "rgba(217,139,20,0.14)",
      chipFg: "#97580E",
    },
    info: {
      Icon: Info,
      label: "Info",
      badgeBg:
        "linear-gradient(140deg, rgba(168,160,148,0.22), rgba(139,131,120,0.14))",
      badgeFg: "#6A645A",
      chipBg: "rgba(139,131,120,0.12)",
      chipFg: "#5B564D",
    },
  }[alert.severity];
  const { Icon } = severityStyle;

  return (
    <div
      className="card p-4 flex items-center gap-4 group hover:shadow-[0_14px_28px_-14px_rgba(28,27,25,0.15)] transition rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Warm icon badge */}
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
        style={{
          background: severityStyle.badgeBg,
          color: severityStyle.badgeFg,
        }}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-mono tabular uppercase tracking-[0.12em] text-ink/55 font-medium">
            {alert.highway} · {alert.chainage}
          </span>
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-[2px] rounded-[4px] leading-none"
            style={{
              background: severityStyle.chipBg,
              color: severityStyle.chipFg,
            }}
          >
            {severityStyle.label}
          </span>
          <span className="text-[10.5px] text-ink/40 font-mono tabular ml-auto shrink-0">
            {alert.timestamp}
          </span>
        </div>
        <div className="text-[13.5px] text-ink/85 leading-snug">
          {alert.message}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={`/assets?focus=${alert.assetId}`}
          className="h-9 px-3 rounded-full text-[11.5px] font-medium text-ink/65 hover:text-ink hover:bg-ink/[0.04] border border-ink/[0.06] transition flex items-center gap-1.5"
          title={`View asset #${alert.assetId}`}
        >
          View
          <ArrowUpRight className="w-3 h-3" />
        </a>
        <button
          onClick={() => onResolve(alert.id)}
          className="h-9 px-3 rounded-full text-[11.5px] font-medium text-ink/65 hover:text-white transition flex items-center gap-1.5 hover:shadow-[0_6px_14px_-6px_rgba(255,107,53,0.7)]"
          style={{
            background: "rgba(255,107,53,0.08)",
            color: "var(--color-orange-deep)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              "linear-gradient(135deg, #FF8B5A, #E85A26)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(255,107,53,0.08)")
          }
        >
          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
          Resolve
        </button>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink/35 hover:text-ink hover:bg-ink/[0.04] transition"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Reusable filter select + empty state
   ========================================================= */

function FilterSelect({
  value,
  onChange,
  options,
  labelFor,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labelFor: (v: string) => string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-9 pl-3 pr-8 rounded-full text-[12px] font-medium bg-cream/70 hover:bg-cream border border-ink/[0.06] text-ink/80 focus:outline-none focus:ring-2 focus:ring-orange/40 cursor-pointer transition"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labelFor(o)}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink/45 pointer-events-none" />
    </div>
  );
}

function EmptyState({
  hasAnyAlerts,
  onReset,
  hasFilters,
}: {
  hasAnyAlerts: boolean;
  onReset: () => void;
  hasFilters: boolean;
}) {
  const iconBg = hasAnyAlerts
    ? "rgba(255,107,53,0.10)"
    : "rgba(63,163,100,0.12)";
  const iconFg = hasAnyAlerts
    ? "var(--color-orange-deep)"
    : "var(--color-go)";
  const Icon = hasAnyAlerts ? Bell : CheckCircle2;

  return (
    <div className="card flex flex-col items-center justify-center py-16">
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4"
        style={{ background: iconBg, color: iconFg }}
      >
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <div className="text-[15px] font-semibold text-ink mb-1">
        {hasAnyAlerts ? "No alerts match your filters." : "Queue is clear."}
      </div>
      <div className="text-[12.5px] text-ink/55 mb-5 text-center max-w-[340px]">
        {hasAnyAlerts
          ? "Try loosening the severity, corridor, or search filter."
          : "Every reported issue has been resolved. Nice work."}
      </div>
      {hasFilters && (
        <button
          onClick={onReset}
          className="pill text-white font-medium gap-2 h-10 px-4"
          style={{
            background: "linear-gradient(135deg, #FF8B5A, #E85A26)",
          }}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
