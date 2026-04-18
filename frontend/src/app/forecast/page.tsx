"use client";

import { useEffect, useState } from "react";
import { RefreshCw, PlayCircle, TrendingDown } from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, type ApiRiskRow } from "../../lib/api";

/* ==========================================================
   /forecast — Layer 5: Predictive Digital Twin risk register
   ========================================================== */
export default function ForecastPage() {
  const [rows, setRows] = useState<ApiRiskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [withinDays, setWithinDays] = useState<string>("");
  const [highway, setHighway] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(
        await api.riskRegister({
          highway_id: highway || undefined,
          within_days: withinDays ? parseInt(withinDays, 10) : undefined,
          limit: 200,
        })
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const refreshAll = async () => {
    setRefreshing(true);
    setErr(null);
    try {
      const job = await api.refreshForecasts(highway || undefined);
      // Poll the job until done (or 15 s)
      const start = Date.now();
      while (Date.now() - start < 15000) {
        await new Promise((r) => setTimeout(r, 1200));
        const j = await api.getJob(job.id);
        if (j.status === "done" || j.status === "failed") break;
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const fmtDays = (d: number | null) => (d == null ? "—" : d < 1 ? "< 1" : Math.round(d).toLocaleString());
  const fmtDate = (d: string | null) => (d ? d.slice(0, 10) : "—");

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar crumbs={[{ label: "RetroGuard" }, { label: "Forecast · predictive digital twin (Layer 5)" }]} />

      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-orange)" }} />
              Layer 5 · Digital twin
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Fix before it fails.
              <span className="block text-ink/55 font-normal text-[22px] mt-1">
                Exponential decay × environmental factors → ranked list of assets predicted to fall below IRC minimum.
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              placeholder="Highway filter"
              value={highway}
              onChange={(e) => setHighway(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              className="pill bg-paper/60 border border-ink/5 text-ink/80 h-9 px-3 text-[12.5px] w-[140px] focus:outline-none focus:ring-2 focus:ring-orange/40"
            />
            <input
              placeholder="Within N days"
              value={withinDays}
              onChange={(e) => setWithinDays(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              inputMode="numeric"
              className="pill bg-paper/60 border border-ink/5 text-ink/80 h-9 px-3 text-[12.5px] w-[120px] focus:outline-none focus:ring-2 focus:ring-orange/40"
            />
            <button onClick={load} className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Reload
            </button>
            <button
              onClick={refreshAll}
              disabled={refreshing}
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {refreshing ? "Forecasting…" : "Refresh forecasts"}
            </button>
          </div>
        </div>
      </div>

      {err && <div className="mb-4 text-[12px] text-alarm">{err}</div>}

      <div className="card overflow-hidden rise" style={{ animationDelay: "120ms" }}>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <TrendingDown className="w-5 h-5 text-ink/40 mx-auto mb-3" />
            <div className="text-[14px] font-semibold text-ink mb-1">No forecasts yet</div>
            <div className="text-[12px] text-ink/55 mb-4">
              Assets need ≥ 2 measurements before a forecast can be computed. Click <span className="font-medium">Refresh forecasts</span> once you have enough data.
            </div>
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-[0.18em] text-ink/50">
                <th className="text-left px-4 py-3 font-medium">Asset</th>
                <th className="text-left px-4 py-3 font-medium">Highway · km</th>
                <th className="text-right px-4 py-3 font-medium">R_L</th>
                <th className="text-right px-4 py-3 font-medium">IRC min</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Days to failure</th>
                <th className="text-left px-4 py-3 font-medium">Predicted failure</th>
                <th className="text-right px-4 py-3 font-medium">Forecast age</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.asset_id} className="text-[13px] border-t border-ink/5 hover:bg-paper/40">
                  <td className="px-4 py-3 font-mono">#{r.asset_id} · {r.asset_type}</td>
                  <td className="px-4 py-3 text-ink/70">{r.highway_id} · {r.chainage_km}</td>
                  <td className="px-4 py-3 text-right font-mono tabular">{r.current_rl ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular">{r.irc_minimum_rl}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular">{fmtDays(r.days_to_failure)}</td>
                  <td className="px-4 py-3 text-ink/70 font-mono text-[11.5px]">{fmtDate(r.predicted_failure_date)}</td>
                  <td className="px-4 py-3 text-right text-ink/55 font-mono text-[11px]">
                    {r.forecast_age_hours == null ? "stale" : `${r.forecast_age_hours}h`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · layer 5 · risk register</span>
        <span>{rows.length} rows</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style: Record<string, { bg: string; color: string }> = {
    compliant: { bg: "rgba(94,196,134,0.18)", color: "#3f8e5b" },
    warning:   { bg: "rgba(243,173,60,0.18)", color: "#b37618" },
    critical:  { bg: "rgba(255,122,106,0.18)", color: "#c2473a" },
  };
  const s = style[status] ?? { bg: "rgba(0,0,0,0.08)", color: "#555" };
  return (
    <span className="text-[10.5px] px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}
