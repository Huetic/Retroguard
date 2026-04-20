"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ArrowUpRight,
  OctagonAlert,
  TriangleAlert,
  Info,
} from "lucide-react";
import { api, type UiAlert } from "../lib/api";

/* =========================================================
   Notifications dropdown (live alerts at a glance)
   ---------------------------------------------------------
   - Opens on bell click
   - Fetches 5 most-recent unresolved alerts
   - Each row: severity badge + metadata + message + resolve
   - "See all →" footer links to /alerts
   - Auto-refreshes every 30s while open
   ========================================================= */

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<UiAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  /* Poll the unread count every 60s (cheap summary endpoint) */
  useEffect(() => {
    let cancelled = false;
    const pull = () => {
      api
        .alertSummary()
        .then((s) => {
          if (!cancelled) setUnresolvedCount(s.total);
        })
        .catch(() => {
          /* keep previous count */
        });
    };
    pull();
    const id = setInterval(pull, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  /* Fetch the full list only when the dropdown opens */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .listAlerts({ is_resolved: false, limit: 5 })
      .then((list) => {
        if (!cancelled) setAlerts(list);
      })
      .catch(() => {
        /* no-op */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* Click-outside to dismiss */
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

  const handleResolve = async (a: UiAlert) => {
    // Optimistic: drop from local list
    setAlerts((prev) => prev.filter((x) => x.id !== a.id));
    setUnresolvedCount((c) => (c !== null ? Math.max(0, c - 1) : c));
    try {
      await api.resolveAlert(a.rawId);
    } catch {
      // Refetch if the call failed
      api.listAlerts({ is_resolved: false, limit: 5 }).then(setAlerts);
      api.alertSummary().then((s) => setUnresolvedCount(s.total));
    }
  };

  const severityCfg = (sev: string) => {
    if (sev === "critical") {
      return {
        Icon: OctagonAlert,
        bg: "linear-gradient(140deg, rgba(232,90,38,0.22), rgba(213,66,48,0.14))",
        fg: "#B33420",
      };
    }
    if (sev === "warning") {
      return {
        Icon: TriangleAlert,
        bg: "linear-gradient(140deg, rgba(255,139,90,0.26), rgba(217,139,20,0.18))",
        fg: "#B06A12",
      };
    }
    return {
      Icon: Info,
      bg: "linear-gradient(140deg, rgba(168,160,148,0.22), rgba(139,131,120,0.14))",
      fg: "#6A645A",
    };
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 w-10 !px-0 relative"
        title={
          unresolvedCount
            ? `${unresolvedCount} active alert${unresolvedCount > 1 ? "s" : ""}`
            : "Notifications"
        }
      >
        <Bell className="w-[15px] h-[15px]" strokeWidth={1.8} />
        {unresolvedCount && unresolvedCount > 0 ? (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-semibold text-white flex items-center justify-center tabular"
            style={{
              background: "linear-gradient(135deg, #FF8B5A, #E85A26)",
              boxShadow: "0 0 0 2px var(--color-paper)",
            }}
          >
            {unresolvedCount > 99 ? "99+" : unresolvedCount}
          </span>
        ) : (
          <span
            className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--color-orange)" }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-[2100] w-[380px] rounded-[16px] bg-paper shadow-[0_22px_44px_-14px_rgba(28,27,25,0.22)] border border-ink/[0.06] p-2 animate-fade-in-up"
          style={{ animationDuration: "160ms" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-1.5 pb-3 border-b border-ink/[0.05]">
            <div>
              <div className="text-[9.5px] uppercase tracking-[0.22em] text-ink/45 font-medium flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot"
                  style={{ background: "var(--color-orange)" }}
                />
                Notifications
              </div>
              <div className="text-[14px] font-semibold text-ink mt-0.5">
                {unresolvedCount ?? "—"} active alert
                {unresolvedCount === 1 ? "" : "s"}
              </div>
            </div>
            <a
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-[11px] text-ink/55 hover:text-ink font-medium flex items-center gap-1"
            >
              See all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {/* Body */}
          <div className="py-1.5 max-h-[360px] overflow-y-auto">
            {loading && alerts.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] text-ink/50 font-mono tabular uppercase tracking-[0.14em]">
                loading…
              </div>
            )}
            {!loading && alerts.length === 0 && (
              <div className="flex flex-col items-center px-3 py-8 text-center">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-2"
                  style={{ background: "rgba(63,163,100,0.12)" }}
                >
                  <CheckCircle2
                    className="w-5 h-5"
                    style={{ color: "var(--color-go)" }}
                    strokeWidth={2}
                  />
                </div>
                <div className="text-[13px] font-semibold text-ink">
                  Queue is clear
                </div>
                <div className="text-[11.5px] text-ink/50 mt-0.5">
                  No active alerts — good night&rsquo;s work.
                </div>
              </div>
            )}
            {alerts.map((a) => {
              const s = severityCfg(a.severity);
              const Icon = s.Icon;
              return (
                <div
                  key={a.id}
                  className="group flex items-start gap-3 px-3 py-2.5 rounded-[11px] hover:bg-ink/[0.03] transition"
                >
                  <div
                    className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background: s.bg, color: s.fg }}
                  >
                    <Icon className="w-[14px] h-[14px]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-mono tabular uppercase tracking-[0.12em] text-ink/55 mb-0.5">
                      <span className="font-semibold text-ink/70">
                        {a.highway}
                      </span>
                      <span className="text-ink/25">·</span>
                      <span>{a.chainage}</span>
                      <span className="ml-auto text-ink/40 normal-case tracking-normal">
                        {a.timestamp.split(" ")[1] || ""}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink/80 leading-snug line-clamp-2">
                      {a.message}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve(a)}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-ink/40 hover:text-white hover:bg-[color:var(--color-go)] transition opacity-0 group-hover:opacity-100"
                    title="Mark resolved"
                  >
                    <CheckCircle2
                      className="w-3.5 h-3.5"
                      strokeWidth={2.2}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="px-3 pt-2 pb-1 border-t border-ink/[0.05] flex items-center justify-between text-[10px] font-mono tabular uppercase tracking-[0.14em] text-ink/45">
              <span>auto-refresh · 60s</span>
              <a
                href="/alerts"
                onClick={() => setOpen(false)}
                className="text-orange-deep hover:text-orange font-semibold normal-case tracking-normal"
              >
                Triage queue →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
