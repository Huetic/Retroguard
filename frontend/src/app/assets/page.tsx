"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Upload,
  X,
  FileSpreadsheet,
  RefreshCw,
  Check,
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

type SortKey =
  | "measured_desc"
  | "measured_asc"
  | "rl_asc"
  | "rl_desc"
  | "id_asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "measured_desc", label: "Last measured · newest" },
  { key: "measured_asc", label: "Last measured · oldest" },
  { key: "rl_asc", label: "Current RL · lowest first" },
  { key: "rl_desc", label: "Current RL · highest first" },
  { key: "id_asc", label: "Asset ID · A → Z" },
];

const PAGE_SIZE = 25;

export default function AssetsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const focusParam = searchParams.get("focus");
  const focusId = focusParam ? Number(focusParam) : null;

  const [search, setSearch] = useState("");
  const [hwFilter, setHwFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("measured_desc");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

  const { data: assets, loading, error, refetch } = useApi<UiAsset[]>(
    () => api.listAssets(),
    []
  );
  const allAssets: UiAsset[] = assets ?? [];

  // Close sort menu on outside click
  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen]);

  // Reset to page 1 whenever filters / sort / focus change
  useEffect(() => {
    setPage(1);
  }, [search, hwFilter, statusFilter, typeFilter, sortKey, focusId]);

  const focusedAsset =
    focusId !== null ? allAssets.find((a) => a.rawId === focusId) : null;

  const filtered = useMemo(() => {
    const rows = allAssets.filter((a) => {
      if (focusId !== null) return a.rawId === focusId;
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
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "measured_desc":
          return b.lastMeasured.localeCompare(a.lastMeasured);
        case "measured_asc":
          return a.lastMeasured.localeCompare(b.lastMeasured);
        case "rl_asc":
          return a.currentRL - b.currentRL;
        case "rl_desc":
          return b.currentRL - a.currentRL;
        case "id_asc":
          return a.id.localeCompare(b.id);
      }
    });
    return sorted;
  }, [search, hwFilter, statusFilter, typeFilter, allAssets, sortKey, focusId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const paged = filtered.slice(pageStart, pageEnd);
  const activeSort =
    SORT_OPTIONS.find((o) => o.key === sortKey) ?? SORT_OPTIONS[0];

  const clearFocus = () => {
    router.replace("/assets");
  };

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

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Export currently-filtered rows as CSV
  const handleExport = () => {
    const headers = ["asset_id", "type", "highway", "chainage", "current_rl", "irc_min", "status", "last_measured"];
    const rows = filtered.map((a) => [
      a.id, a.type, a.highway, a.chainage, a.currentRL, a.ircMin, a.status, a.lastMeasured,
    ]);
    const csv = [headers, ...rows].map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <button
              onClick={() => refetch()}
              title="Refresh"
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
              Refresh
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.8} />
              Import
            </button>
            <button
              onClick={handleExport}
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              Export
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
              Add asset
            </button>
          </div>
        </div>
      </div>

      {focusId !== null && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-[12px] border border-orange/25 bg-orange/[0.07] px-4 py-2.5 rise"
          style={{ animationDelay: "60ms" }}
        >
          <div className="text-[12.5px] text-orange-deep font-medium">
            Showing asset from alert ·{" "}
            <span className="font-mono tabular">
              {focusedAsset ? focusedAsset.id : `#${focusId}`}
            </span>
          </div>
          <button
            onClick={clearFocus}
            className="pill bg-paper/60 hover:bg-paper border border-ink/5 text-ink/70 gap-1.5 text-[11.5px] h-8"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

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
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              className="flex items-center gap-1.5 text-[11px] font-medium text-ink/80 bg-paper/60 hover:bg-paper border border-ink/5 rounded-full h-8 px-3 transition"
            >
              {activeSort.label}
              <ChevronDown
                className={`w-3 h-3 text-ink/50 transition ${
                  sortOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {sortOpen && (
              <div
                role="menu"
                className="absolute top-[calc(100%+6px)] right-0 z-[1500] min-w-[220px] rounded-[12px] bg-paper shadow-[0_18px_40px_-14px_rgba(28,27,25,0.2)] border border-ink/[0.06] p-1.5"
              >
                {SORT_OPTIONS.map((opt) => {
                  const active = opt.key === sortKey;
                  return (
                    <button
                      key={opt.key}
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        setSortKey(opt.key);
                        setSortOpen(false);
                      }}
                      className={`flex items-center justify-between w-full h-9 px-3 rounded-[9px] text-[12px] text-left transition ${
                        active
                          ? "bg-orange/[0.08] text-orange-deep font-medium"
                          : "text-ink/75 hover:bg-ink/[0.04]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                  {paged.map((asset) => {
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
                Rows {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of{" "}
                {filtered.length}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="h-7 w-7 rounded-[7px] flex items-center justify-center bg-ink/[0.04] text-ink/35 hover:text-ink hover:bg-ink/[0.08] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronDown className="w-3 h-3 rotate-90" />
                </button>
                <span className="text-[11px] text-ink/60 font-mono tabular px-2">
                  page {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="h-7 w-7 rounded-[7px] flex items-center justify-center bg-ink/[0.04] text-ink/35 hover:text-ink hover:bg-ink/[0.08] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next page"
                >
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

      {showAdd && (
        <AddAssetModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}
      {showImport && (
        <ImportCsvModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================
   Add asset modal
   ========================================================== */
function AddAssetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    asset_type: "sign",
    highway_id: "NH-48",
    chainage_km: "",
    gps_lat: "",
    gps_lon: "",
    irc_minimum_rl: "250",
    material_grade: "",
    installation_date: "",
    orientation: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const update = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      await api.createAsset({
        asset_type: form.asset_type,
        highway_id: form.highway_id,
        chainage_km: parseFloat(form.chainage_km),
        gps_lat: parseFloat(form.gps_lat),
        gps_lon: parseFloat(form.gps_lon),
        irc_minimum_rl: parseFloat(form.irc_minimum_rl),
        material_grade: form.material_grade || null,
        installation_date: form.installation_date
          ? new Date(form.installation_date).toISOString()
          : null,
        orientation: form.orientation || null,
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Add asset" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Asset type">
          <select
            className="w-full bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]"
            value={form.asset_type}
            onChange={update("asset_type")}
          >
            <option value="sign">Sign</option>
            <option value="marking">Marking</option>
            <option value="rpm">RPM</option>
            <option value="delineator">Delineator</option>
          </select>
        </Field>
        <Field label="Highway ID">
          <input className={inputCls} value={form.highway_id} onChange={update("highway_id")} />
        </Field>
        <Field label="Chainage (km)">
          <input className={inputCls} value={form.chainage_km} onChange={update("chainage_km")} placeholder="234.5" />
        </Field>
        <Field label="IRC minimum R_L">
          <input className={inputCls} value={form.irc_minimum_rl} onChange={update("irc_minimum_rl")} />
        </Field>
        <Field label="GPS lat">
          <input className={inputCls} value={form.gps_lat} onChange={update("gps_lat")} placeholder="21.1700" />
        </Field>
        <Field label="GPS lon">
          <input className={inputCls} value={form.gps_lon} onChange={update("gps_lon")} placeholder="72.8311" />
        </Field>
        <Field label="Material grade">
          <input className={inputCls} value={form.material_grade} onChange={update("material_grade")} placeholder="high_intensity" />
        </Field>
        <Field label="Installation date">
          <input type="date" className={inputCls} value={form.installation_date} onChange={update("installation_date")} />
        </Field>
        <Field label="Orientation">
          <input className={inputCls} value={form.orientation} onChange={update("orientation")} placeholder="left / right / overhead" />
        </Field>
      </div>
      {err && <div className="mt-3 text-[12px] text-alarm">{err}</div>}
      <div className="mt-5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75">
          Cancel
        </button>
        <button
          disabled={submitting}
          onClick={submit}
          className="pill text-white font-medium shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          {submitting ? "Creating…" : "Create asset"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ==========================================================
   Import CSV modal
   ========================================================== */
function ImportCsvModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; reason: string }[];
    duplicates: {
      row: number;
      matched_asset_id: number | null;
      data: Record<string, unknown>;
    }[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dupSelected, setDupSelected] = useState<Set<number>>(new Set());
  const [forcing, setForcing] = useState(false);

  const submit = async () => {
    if (!file) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await api.importAssetsCsv(file);
      setResult(res);
      setDupSelected(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDup = (row: number) => {
    setDupSelected((s) => {
      const next = new Set(s);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  };

  const forceInsertSelected = async () => {
    if (!result || dupSelected.size === 0) return;
    setForcing(true);
    setErr(null);
    try {
      const rows = result.duplicates
        .filter((d) => dupSelected.has(d.row))
        .map((d) => d.data);
      const res = await api.forceImportAssets(rows);
      // Update result locally so the UI reflects success
      setResult({
        ...result,
        created: result.created + res.created,
        duplicates: result.duplicates.filter((d) => !dupSelected.has(d.row)),
      });
      setDupSelected(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setForcing(false);
    }
  };

  return (
    <ModalShell title="Import assets from CSV" onClose={onClose}>
      {!result ? (
        <>
          <p className="text-[12.5px] text-ink/65 mb-3">
            Upload a CSV with one row per asset. Invalid rows are skipped, not blocking.
          </p>
          <a
            href={api.assetImportTemplateUrl()}
            className="inline-flex items-center gap-1.5 text-[12px] text-orange hover:underline mb-4"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download CSV template
          </a>
          <div
            onClick={() => fileInput.current?.click()}
            className="border border-dashed border-ink/20 rounded-xl p-6 cursor-pointer hover:bg-paper/40 text-center"
          >
            <Upload className="w-5 h-5 text-ink/50 mx-auto mb-2" />
            <div className="text-[13px] text-ink/70">
              {file ? file.name : "Click to choose a .csv file"}
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {err && <div className="mt-3 text-[12px] text-alarm">{err}</div>}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button onClick={onClose} className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!file || submitting}
              className="pill text-white font-medium shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              {submitting ? "Uploading…" : "Upload"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <StatBlock label="Created" value={result.created} tone="go" />
            <StatBlock label="Duplicates" value={result.duplicates.length} tone="caution" />
            <StatBlock label="Errors" value={result.errors.length} tone="caution" />
          </div>

          {result.duplicates.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] text-ink/70 font-medium">
                  Duplicates — review and override if needed
                </div>
                <button
                  onClick={forceInsertSelected}
                  disabled={dupSelected.size === 0 || forcing}
                  className="pill text-white text-[11px] font-medium disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
                >
                  {forcing
                    ? "Inserting…"
                    : `Insert selected (${dupSelected.size})`}
                </button>
              </div>
              <div className="max-h-[240px] overflow-y-auto border border-ink/10 rounded-lg divide-y divide-ink/5">
                {result.duplicates.map((d) => (
                  <label
                    key={d.row}
                    className="flex items-start gap-2 px-3 py-2 text-[12px] cursor-pointer hover:bg-paper/40"
                  >
                    <input
                      type="checkbox"
                      checked={dupSelected.has(d.row)}
                      onChange={() => toggleDup(d.row)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-ink/60">row {d.row}</span>
                        {d.matched_asset_id !== null ? (
                          <span className="text-ink/60">
                            matches existing asset{" "}
                            <span className="font-mono">#{d.matched_asset_id}</span>
                          </span>
                        ) : (
                          <span className="text-ink/60">duplicate within file</span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink/50 truncate">
                        {String(d.data.asset_type)} · {String(d.data.highway_id)} · km{" "}
                        {String(d.data.chainage_km)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-[10.5px] text-ink/45">
                Tick a row only if you&rsquo;re sure it&rsquo;s a separate physical asset.
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <>
              <div className="text-[12px] text-ink/70 mb-2 font-medium">Row errors</div>
              <div className="max-h-[160px] overflow-y-auto border border-ink/10 rounded-lg divide-y divide-ink/5">
                {result.errors.map((e) => (
                  <div key={e.row} className="px-3 py-2 text-[12px]">
                    <span className="font-mono text-ink/60">row {e.row}</span>
                    <span className="text-ink/80 ml-2">{e.reason}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {err && <div className="mt-3 text-[12px] text-alarm">{err}</div>}

          <div className="mt-5 flex items-center justify-end">
            <button
              onClick={onImported}
              className="pill text-white font-medium shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)]"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              Done
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ==========================================================
   Modal shell + small helpers
   ========================================================== */
const inputCls =
  "w-full bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px] focus:outline-none focus:border-orange/60";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-ink/5 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-ink">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ink/5 flex items-center justify-center text-ink/60">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">{label}</span>
      {children}
    </label>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: "go" | "caution" }) {
  const color = tone === "go" ? "#5EC486" : "#F3AD3C";
  return (
    <div className="flex-1 rounded-xl bg-paper/60 border border-ink/5 p-3">
      <div className="text-[11px] text-ink/55 uppercase tracking-[0.14em]">{label}</div>
      <div className="text-[28px] font-semibold" style={{ color }}>{value}</div>
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
