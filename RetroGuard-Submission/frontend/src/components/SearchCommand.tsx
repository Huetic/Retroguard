"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  LayoutGrid,
  MapPin,
  Boxes,
  BellRing,
  ScrollText,
  Smartphone,
  TriangleAlert,
  OctagonAlert,
  Radio,
} from "lucide-react";
import {
  api,
  type UiAsset,
  type UiAlert,
  type AssetStatus,
} from "../lib/api";

/* =========================================================
   Global command-palette search
   ---------------------------------------------------------
   - Trigger: click the Search pill in TopBar OR press ⌘K / Ctrl+K
   - Searches across: pages, assets, alerts
   - Data is fetched once on first open and cached for the session
   - Keyboard: ↑ ↓ to navigate, Enter to select, Esc to close
   ========================================================= */

interface SearchResult {
  kind: "page" | "asset" | "alert";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  accent?: string;
}

const PAGES: SearchResult[] = [
  { kind: "page", id: "p-overview",    title: "Overview",       subtitle: "Dashboard · network health",  href: "/",             Icon: LayoutGrid },
  { kind: "page", id: "p-map",         title: "Corridor map",   subtitle: "Live GIS · every asset",      href: "/map",          Icon: MapPin },
  { kind: "page", id: "p-assets",      title: "Asset registry", subtitle: "Full inventory",              href: "/assets",       Icon: Boxes },
  { kind: "page", id: "p-alerts",      title: "Live alerts",    subtitle: "Triage queue",                href: "/alerts",       Icon: BellRing },
  { kind: "page", id: "p-measure",     title: "Field capture",  subtitle: "Smartphone retroreflectometer", href: "/measure",    Icon: Smartphone },
  { kind: "page", id: "p-reports",     title: "Compliance",     subtitle: "IRC 67 / IRC 35 reports",     href: "/reports",      Icon: ScrollText },
  { kind: "page", id: "p-forecast",    title: "Forecast",       subtitle: "Predictive risk register",    href: "/forecast",     Icon: TriangleAlert },
  { kind: "page", id: "p-ingest",      title: "Video ingest",   subtitle: "Layer-2 CCTV mining",         href: "/ingest",       Icon: Radio },
  { kind: "page", id: "p-patches",     title: "Ref. patches",   subtitle: "Calibration targets",         href: "/patches",      Icon: Radio },
  { kind: "page", id: "p-contributors",title: "Contributors",   subtitle: "API-key management",          href: "/contributors", Icon: Radio },
  { kind: "page", id: "p-qr",          title: "QR pipeline",    subtitle: "Scan-based verification",     href: "/qr",           Icon: Radio },
];

function statusAccent(s: AssetStatus): string {
  if (s === "critical") return "var(--color-alarm)";
  if (s === "warning") return "var(--color-caution)";
  return "var(--color-go)";
}

/* Module-level event bus so the trigger button (anywhere in the tree)
   can tell the modal (mounted once in the root layout) to open. */
const SEARCH_EVENT = "retroguard:open-search";
export function openGlobalSearch() {
  document.dispatchEvent(new CustomEvent(SEARCH_EVENT));
}

/** Trigger button — put this wherever you need a "Search" UI entry.
    Does not render the modal. */
export function SearchTrigger({
  className = "pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 gap-2 !px-3",
}: {
  className?: string;
}) {
  return (
    <button
      onClick={() => openGlobalSearch()}
      aria-label="Search"
      title="Search (⌘K)"
      className={className}
    >
      <Search className="w-[15px] h-[15px]" strokeWidth={1.8} />
      <span className="text-[10.5px] font-mono tabular text-ink/35 border border-ink/10 rounded-[5px] px-1 py-[1px] leading-none">
        ⌘K
      </span>
    </button>
  );
}

/** Modal — mount this exactly once in the root layout. Handles ⌘K
    keybind and the `retroguard:open-search` event. */
export default function SearchCommand() {
  const [open, setOpen] = useState(false);

  /* Listen for the "open search" custom event */
  useEffect(() => {
    const onEvent = () => setOpen(true);
    document.addEventListener(SEARCH_EVENT, onEvent);
    return () => document.removeEventListener(SEARCH_EVENT, onEvent);
  }, []);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [assets, setAssets] = useState<UiAsset[]>([]);
  const [alerts, setAlerts] = useState<UiAlert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Global ⌘K / Ctrl+K keybind */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* Fetch assets + alerts once on first open */
  useEffect(() => {
    if (!open || loaded) return;
    Promise.all([api.listAssets(), api.listAlerts({ is_resolved: false, limit: 200 })])
      .then(([as, al]) => {
        setAssets(as);
        setAlerts(al);
        setLoaded(true);
      })
      .catch(() => {
        /* keep empty list; user can still navigate pages */
        setLoaded(true);
      });
  }, [open, loaded]);

  /* Focus input on open */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  /* Build filtered result list */
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();

    // No query → show top pages + first few alerts
    if (!q) {
      const topAlerts = alerts.slice(0, 3).map<SearchResult>((a) => ({
        kind: "alert",
        id: `a-${a.id}`,
        title: a.message,
        subtitle: `${a.highway} · ${a.chainage}`,
        href: "/alerts",
        Icon: a.severity === "critical" ? OctagonAlert : TriangleAlert,
        accent:
          a.severity === "critical"
            ? "var(--color-alarm)"
            : "var(--color-caution)",
      }));
      return [...PAGES.slice(0, 6), ...topAlerts];
    }

    const matches = (s: string) => s.toLowerCase().includes(q);

    const pageHits = PAGES.filter(
      (p) => matches(p.title) || matches(p.subtitle)
    );

    const assetHits = assets
      .filter(
        (a) =>
          matches(a.id) ||
          matches(a.type) ||
          matches(a.highway) ||
          matches(a.chainage) ||
          (a.materialGrade && matches(a.materialGrade))
      )
      .slice(0, 10)
      .map<SearchResult>((a) => ({
        kind: "asset",
        id: `as-${a.rawId}`,
        title: `${a.type} · ${a.id}`,
        subtitle: `${a.highway} · ${a.chainage} · RL ${a.currentRL} / ${a.ircMin}`,
        href: `/assets`,
        Icon: Boxes,
        accent: statusAccent(a.status),
      }));

    const alertHits = alerts
      .filter(
        (a) =>
          matches(a.message) ||
          matches(a.highway) ||
          matches(a.chainage) ||
          matches(a.id)
      )
      .slice(0, 8)
      .map<SearchResult>((a) => ({
        kind: "alert",
        id: `al-${a.rawId}`,
        title: a.message,
        subtitle: `${a.highway} · ${a.chainage} · ${a.timestamp}`,
        href: "/alerts",
        Icon: a.severity === "critical" ? OctagonAlert : TriangleAlert,
        accent:
          a.severity === "critical"
            ? "var(--color-alarm)"
            : a.severity === "warning"
            ? "var(--color-caution)"
            : "var(--color-mute)",
      }));

    return [...pageHits, ...assetHits, ...alertHits];
  }, [query, assets, alerts]);

  /* Reset active index when the result list changes */
  useEffect(() => {
    setActiveIndex(0);
  }, [query, loaded]);

  /* Keyboard nav */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = results[activeIndex];
        if (r) {
          setOpen(false);
          window.location.href = r.href;
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, results, activeIndex]);

  /* Scroll active item into view */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-start justify-center pt-[14vh] px-4 animate-fade-in-up"
          style={{
            animationDuration: "140ms",
            background: "rgba(28, 27, 25, 0.35)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-[640px] rounded-[18px] bg-paper shadow-[0_28px_80px_-18px_rgba(28,27,25,0.45)] border border-ink/[0.08] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-ink/[0.06]">
              <Search
                className="w-[18px] h-[18px] text-ink/50 shrink-0"
                strokeWidth={1.8}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search asset ID, highway, chainage, alert message…"
                className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink/35 focus:outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 w-7 h-7 rounded-full bg-ink/[0.04] hover:bg-ink/[0.08] text-ink/45 hover:text-ink flex items-center justify-center transition"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto py-2"
            >
              {!loaded && (
                <div className="px-5 py-8 text-center text-[12px] text-ink/50 font-mono tabular uppercase tracking-[0.14em]">
                  loading index…
                </div>
              )}
              {loaded && results.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <div className="text-[14px] font-semibold text-ink mb-1">
                    No matches for &ldquo;{query}&rdquo;
                  </div>
                  <div className="text-[12px] text-ink/55">
                    Try an asset ID, highway code, or a keyword from an alert.
                  </div>
                </div>
              )}
              {results.map((r, i) => {
                const active = i === activeIndex;
                return (
                  <a
                    key={r.id}
                    href={r.href}
                    data-idx={i}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex items-center gap-3 px-5 py-2.5 transition ${
                      active ? "bg-orange/[0.08]" : "hover:bg-ink/[0.025]"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                      style={{
                        background: r.accent
                          ? `${r.accent}22`
                          : "rgba(139,131,120,0.10)",
                        color: r.accent ?? "var(--color-ink)",
                      }}
                    >
                      <r.Icon className="w-[15px] h-[15px]" strokeWidth={1.9} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-ink/50 truncate mt-0.5">
                        {r.subtitle}
                      </div>
                    </div>
                    <div className="text-[9.5px] font-mono tabular uppercase tracking-[0.14em] text-ink/40 shrink-0">
                      {r.kind}
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Footer hints */}
            <div
              className="flex items-center justify-between px-5 py-2.5 border-t border-ink/[0.06] text-[10px] font-mono tabular uppercase tracking-[0.14em] text-ink/45"
              style={{ background: "rgba(246,241,229,0.35)" }}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-[4px] bg-paper border border-ink/10 text-[9px]">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-[4px] bg-paper border border-ink/10 text-[9px]">
                    ↵
                  </kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-[4px] bg-paper border border-ink/10 text-[9px]">
                    Esc
                  </kbd>
                  close
                </span>
              </div>
              <span>{results.length} matches</span>
            </div>
          </div>
    </div>
  );
}
