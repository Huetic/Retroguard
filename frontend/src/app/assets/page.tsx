"use client";

import { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Download,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
} from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, useApi, type UiAsset } from "../../lib/api";

const highways = ["All", "NH-48", "NH-44", "NH-27", "NH-66", "DME"];
const statuses = ["All", "compliant", "warning", "critical"];
const types = [
  "All",
  "Regulatory Sign",
  "Road Marking",
  "Guide Sign",
  "Warning Sign",
  "Chevron Marker",
  "Delineator Post",
];

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [hwFilter, setHwFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const { data: assets, loading, error } = useApi<UiAsset[]>(
    () => api.listAssets(),
    []
  );
  const allAssets: UiAsset[] = assets ?? [];

  const filtered = useMemo(() => {
    return allAssets.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        q === "" ||
        a.id.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.highway.toLowerCase().includes(q) ||
        a.chainage.toLowerCase().includes(q);
      const matchesHw = hwFilter === "All" || a.highway === hwFilter;
      const matchesStatus = statusFilter === "All" || a.status === statusFilter;
      const matchesType = typeFilter === "All" || a.type === typeFilter;
      return matchesSearch && matchesHw && matchesStatus && matchesType;
    });
  }, [search, hwFilter, statusFilter, typeFilter, allAssets]);

  const counts = useMemo(
    () => ({
      total: allAssets.length,
      compliant: allAssets.filter((a) => a.status === "compliant").length,
      warning: allAssets.filter((a) => a.status === "warning").length,
      critical: allAssets.filter((a) => a.status === "critical").length,
    }),
    [allAssets]
  );

  const resetFilters = () => {
    setSearch("");
    setHwFilter("All");
    setStatusFilter("All");
    setTypeFilter("All");
  };
  const filtersActive =
    search !== "" ||
    hwFilter !== "All" ||
    statusFilter !== "All" ||
    typeFilter !== "All";

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar
        crumbs={[
          { label: "RetroGuard" },
          { label: "Asset registry · complete inventory · live sync" },
        ]}
      />

      {/* ======================================================
          Hero greeting
          ====================================================== */}
      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: "var(--color-orange)" }}
              />
              Asset registry
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Every asset, mapped.
              <span className="block text-ink/55 font-normal text-[26px] mt-1">
                {counts.total} monitored · 5 national corridors.
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusPill count={counts.compliant} label="Compliant" tone="go" />
            <StatusPill count={counts.warning} label="Warning" tone="caution" />
            <StatusPill count={counts.critical} label="Critical" tone="alarm" />
            <div className="w-px h-7 bg-ink/10 mx-1" />
            <button className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2">
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              Export
            </button>
            <button
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
              Add asset
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          Filter bar
          ====================================================== */}
      <div
        className="card p-3 mb-4 flex items-center gap-2 flex-wrap rise"
        style={{ animationDelay: "100ms" }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-ink/40 pointer-events-none"
            strokeWidth={1.8}
          />
          <input
            type="text"
            placeholder="Search by ID, type, highway, chainage…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "42px", paddingRight: "16px" }}
            className="w-full h-10 text-[13px] bg-cream/70 rounded-[11px] focus:outline-none focus:ring-2 focus:ring-orange/40 text-ink placeholder-ink/45 border border-ink/[0.04] focus:bg-paper transition"
          />
        </div>

        {/* Filter-group label */}
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
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={statuses}
          labelFor={(v) =>
            v === "All" ? "All statuses" : v.charAt(0).toUpperCase() + v.slice(1)
          }
        />
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={types}
          labelFor={(v) => (v === "All" ? "All types" : v)}
        />

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

      {/* ======================================================
          Result meta + sort
          ====================================================== */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-[11px] text-ink/55 font-mono tabular uppercase tracking-[0.14em]">
          Showing{" "}
          <span className="text-ink font-semibold">{filtered.length}</span> of{" "}
          <span className="text-ink font-semibold">{allAssets.length}</span>{" "}
          assets
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
            Last measured
            <ChevronDown className="w-3 h-3 text-ink/50" />
          </button>
        </div>
      </div>

      {/* ======================================================
          Table card
          ====================================================== */}
      <div
        className="card overflow-hidden rise"
        style={{ animationDelay: "160ms" }}
      >
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <div className="text-[14px] font-semibold text-alarm mb-1">
              Couldn&rsquo;t load assets
            </div>
            <div className="text-[12px] text-ink/55">{error.message}</div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onReset={resetFilters} hasFilters={filtersActive} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <colgroup>
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "60px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <Th>Asset ID</Th>
                    <Th>Type</Th>
                    <Th>Highway</Th>
                    <Th>Chainage</Th>
                    <Th align="right" sortable>
                      Current RL
                    </Th>
                    <Th align="right">IRC min</Th>
                    <Th align="center">Status</Th>
                    <Th sortable>Last measured</Th>
                    <Th align="center">{""}</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset) => {
                    const deficit = asset.currentRL - asset.ircMin;
                    const pct = (asset.currentRL / asset.ircMin) * 100;
                    const rlTone =
                      deficit < 0
                        ? "alarm"
                        : pct < 110
                        ? "caution"
                        : "go";
                    const rlColor =
                      rlTone === "alarm"
                        ? "var(--color-alarm)"
                        : rlTone === "caution"
                        ? "var(--color-caution)"
                        : "var(--color-ink)";
                    return (
                      <tr
                        key={asset.id}
                        className="group cursor-pointer hover:bg-cream/40 transition"
                      >
                        <Td first>
                          <span className="font-mono tabular text-[12px] font-semibold text-ink">
                            {asset.id}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-[13px] text-ink/85">
                            {asset.type}
                          </span>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center px-2 py-[3px] rounded-[6px] text-[10.5px] font-mono tabular font-semibold bg-ink/[0.06] text-ink/80 tracking-[0.08em]">
                            {asset.highway}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-ink/60 font-mono tabular text-[11.5px]">
                            {asset.chainage}
                          </span>
                        </Td>
                        <Td align="right">
                          <div className="inline-flex items-center gap-2 font-mono tabular">
                            {deficit < 0 ? (
                              <TrendingDown
                                className="w-[13px] h-[13px]"
                                style={{ color: "var(--color-alarm)" }}
                              />
                            ) : pct < 110 ? (
                              <TrendingDown
                                className="w-[13px] h-[13px]"
                                style={{ color: "var(--color-caution)" }}
                              />
                            ) : (
                              <TrendingUp
                                className="w-[13px] h-[13px]"
                                style={{ color: "var(--color-go)" }}
                              />
                            )}
                            <span
                              className="text-[15px] font-semibold"
                              style={{ color: rlColor }}
                            >
                              {asset.currentRL}
                            </span>
                          </div>
                        </Td>
                        <Td align="right">
                          <span className="font-mono tabular text-[11.5px] text-ink/45">
                            {asset.ircMin}
                          </span>
                        </Td>
                        <Td align="center">
                          <WarmStatusChip status={asset.status} />
                        </Td>
                        <Td>
                          <span className="text-ink/55 text-[11.5px] font-mono tabular">
                            {asset.lastMeasured}
                          </span>
                        </Td>
                        <Td align="center" last>
                          <div
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ink/[0.03] group-hover:bg-ink group-hover:text-paper-2 text-ink/40 transition"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination / footer ribbon */}
            <div
              className="flex items-center justify-between px-5 py-3.5 border-t border-ink/[0.06]"
              style={{ background: "rgba(246,241,229,0.35)" }}
            >
              <div className="text-[10.5px] font-mono tabular uppercase tracking-[0.14em] text-ink/50">
                Rows 1–{filtered.length} of {filtered.length}
              </div>
              <div className="flex items-center gap-1.5">
                <button className="h-7 w-7 rounded-[7px] flex items-center justify-center bg-ink/[0.04] text-ink/35 hover:text-ink hover:bg-ink/[0.08] transition">
                  <ChevronDown className="w-3 h-3 rotate-90" />
                </button>
                <span className="text-[11px] text-ink/60 font-mono tabular px-2">
                  page 1 / 1
                </span>
                <button className="h-7 w-7 rounded-[7px] flex items-center justify-center bg-ink/[0.04] text-ink/35 hover:text-ink hover:bg-ink/[0.08] transition">
                  <ChevronDown className="w-3 h-3 -rotate-90" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · asset registry</span>
        <span>last sync · 14:32 IST · {counts.total} nodes</span>
      </div>
    </div>
  );
}

/* ==========================================================
   Subcomponents
   ========================================================== */

function StatusPill({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "go" | "caution" | "alarm";
}) {
  const color =
    tone === "go"
      ? "var(--color-go)"
      : tone === "caution"
      ? "var(--color-caution)"
      : "var(--color-alarm)";
  const softBg =
    tone === "go"
      ? "rgba(63,163,100,0.10)"
      : tone === "caution"
      ? "rgba(217,139,20,0.10)"
      : "rgba(213,66,48,0.10)";
  return (
    <div
      className="pill border border-ink/5 gap-2"
      style={{ background: softBg, color: "var(--color-ink)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      <span className="font-mono tabular font-semibold">{count}</span>
      <span className="text-ink/60 font-medium">{label}</span>
    </div>
  );
}

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

function WarmStatusChip({ status }: { status: string }) {
  const cfg = {
    compliant: {
      label: "Compliant",
      bg: "rgba(63,163,100,0.12)",
      fg: "#2E7E4A",
    },
    warning: {
      label: "Warning",
      bg: "rgba(217,139,20,0.14)",
      fg: "#97580E",
    },
    critical: {
      label: "Critical",
      bg: "rgba(213,66,48,0.12)",
      fg: "#9E2E1C",
    },
  }[status] ?? {
    label: status,
    bg: "rgba(139,131,120,0.12)",
    fg: "#5B564D",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10.5px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: cfg.fg }}
      />
      {cfg.label}
    </span>
  );
}

function Th({
  children,
  align = "left",
  sortable,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";
  return (
    <th
      className={`${alignClass} px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-[0.14em] first:pl-6 last:pr-6 sticky top-0 border-b`}
      style={{
        background: "rgba(234,227,211,0.35)",
        borderBottomColor: "rgba(28,27,25,0.06)",
      }}
    >
      <span
        className={`inline-flex items-center gap-1.5 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${align === "center" ? "justify-center w-full" : ""}`}
      >
        {children}
        {sortable && (
          <ChevronDown className="w-3 h-3 text-ink/25" />
        )}
      </span>
    </th>
  );
}

function Td({
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
      className={`${alignClass} px-4 py-4 border-b border-ink/[0.035] ${
        first ? "pl-6" : ""
      } ${last ? "pr-6" : ""}`}
    >
      {children}
    </td>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-2 py-3 animate-pulse"
        >
          <div className="h-3 w-20 bg-ink/[0.06] rounded-full" />
          <div className="h-3 w-32 bg-ink/[0.06] rounded-full" />
          <div className="h-3 w-14 bg-ink/[0.06] rounded-full" />
          <div className="h-3 w-24 bg-ink/[0.06] rounded-full" />
          <div className="h-3 w-16 bg-ink/[0.06] rounded-full ml-auto" />
          <div className="h-3 w-16 bg-ink/[0.06] rounded-full" />
          <div className="h-5 w-20 bg-ink/[0.06] rounded-full" />
          <div className="h-3 w-20 bg-ink/[0.06] rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  onReset,
  hasFilters,
}: {
  onReset: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4"
        style={{
          background: "rgba(255,107,53,0.10)",
          color: "var(--color-orange-deep)",
        }}
      >
        <Database className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <div className="text-[15px] font-semibold text-ink mb-1">
        No assets match your filters.
      </div>
      <div className="text-[12.5px] text-ink/55 mb-5 text-center max-w-[320px]">
        Try loosening the search or clearing one of the filter chips above.
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
