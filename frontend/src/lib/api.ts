/* =========================================================
   RetroGuard API client
   ---------------------------------------------------------
   - Talks to the FastAPI backend on :8000
   - Mirrors backend Pydantic schemas as snake_case TS types
   - Exposes UI-shaped types (camelCase + formatted strings)
   - Provides transformer functions and a tiny useApi hook
   ========================================================= */

import { useEffect, useState, useCallback } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ---------------------------------------------------------
   Backend wire types  (mirror schemas.py exactly)
   --------------------------------------------------------- */

export type AssetStatus = "compliant" | "warning" | "critical";
export type AlertType = "critical" | "warning" | "info";
export type SourceLayer = "smartphone" | "cctv" | "dashcam" | "qr_code";

export interface ApiAsset {
  id: number;
  asset_type: string;
  highway_id: string;
  chainage_km: number;
  gps_lat: number;
  gps_lon: number;
  material_grade: string | null;
  installation_date: string | null;
  orientation: string | null;
  current_rl: number | null;
  irc_minimum_rl: number;
  status: AssetStatus;
  last_measured: string | null;
  predicted_failure_date: string | null;
  created_at: string;
}

export interface ApiAlert {
  id: number;
  asset_id: number;
  alert_type: AlertType;
  message: string;
  highway_id: string;
  chainage_km: number;
  is_resolved: boolean;
  created_at: string;
}

export interface ApiMeasurement {
  id: number;
  asset_id: number;
  rl_value: number;
  confidence: number | null;
  source_layer: SourceLayer;
  conditions_json: string | null;
  device_info: string | null;
  measured_at: string;
  image_path: string | null;
}

export interface ApiDashboardStats {
  total_assets: number;
  compliant_count: number;
  warning_count: number;
  critical_count: number;
  measurements_today: number;
  alerts_active: number;
}

export interface ApiHighwayHealth {
  highway_id: string;
  total_assets: number;
  compliant: number;
  warning: number;
  critical: number;
  compliance_pct: number;
}

export interface ApiAlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export interface ApiComplianceReport {
  highway_id: string;
  generated_at: string;
  total_assets: number;
  compliant: number;
  warning: number;
  critical: number;
  compliance_pct: number;
  assets_by_type: Record<
    string,
    { total: number; compliant: number; warning: number; critical: number }
  >;
  critical_assets: ApiAsset[];
}

/* ---------------------------------------------------------
   UI-shaped types  (camelCase, pretty strings, used by pages)
   --------------------------------------------------------- */

export interface UiAsset {
  id: string;             // formatted "NH48-001"
  rawId: number;          // numeric backend id (for API calls)
  type: string;           // friendly e.g. "Regulatory Sign"
  highway: string;
  chainage: string;       // "KM 12+500"
  lat: number;
  lng: number;
  currentRL: number;
  ircMin: number;
  status: AssetStatus;
  lastMeasured: string;   // "2026-04-08"
  materialGrade?: string | null;
}

export interface UiAlert {
  id: string;             // "ALT-012"
  rawId: number;
  severity: AlertType;
  message: string;
  highway: string;
  chainage: string;
  timestamp: string;      // "2026-04-08 09:15"
  assetId: number;
}

export interface UiHighwayBreakdown {
  highway: string;
  compliant: number;
  warning: number;
  critical: number;
  total: number;
  compliantPct: number;
}

export interface UiHighwayReport {
  totalAssets: number;
  compliantPct: number;
  warningPct: number;
  criticalPct: number;
  breakdown: {
    type: string;
    total: number;
    compliant: number;
    warning: number;
    critical: number;
  }[];
  criticalAssets: {
    id: string;
    type: string;
    chainage: string;
    currentRL: number;
    ircMin: number;
  }[];
}

/* ---------------------------------------------------------
   Transformers (backend → UI shape)
   --------------------------------------------------------- */

const ASSET_TYPE_LABELS: Record<string, string> = {
  sign: "Regulatory Sign",
  marking: "Road Marking",
  rpm: "Chevron Marker",
  delineator: "Delineator Post",
};

function prettyAssetType(a: { asset_type: string; material_grade: string | null }): string {
  if (a.asset_type === "sign") {
    if (a.material_grade?.toLowerCase().includes("yellow")) return "Warning Sign";
    if (a.material_grade?.toLowerCase().includes("green")) return "Guide Sign";
    return "Regulatory Sign";
  }
  return ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type;
}

export function formatChainage(km: number): string {
  const whole = Math.floor(km);
  const meters = Math.round((km - whole) * 1000);
  return `KM ${whole}+${meters.toString().padStart(3, "0")}`;
}

function formatAssetId(highway: string, id: number): string {
  return `${highway.replace(/-/g, "")}-${String(id).padStart(3, "0")}`;
}

function formatAlertId(id: number): string {
  return `ALT-${String(id).padStart(3, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function formatDateTime(iso: string): string {
  // "2026-04-08T09:15:23.123Z" → "2026-04-08 09:15"
  const d = iso.replace("T", " ");
  return d.slice(0, 16);
}

export function toUiAsset(a: ApiAsset): UiAsset {
  return {
    id: formatAssetId(a.highway_id, a.id),
    rawId: a.id,
    type: prettyAssetType(a),
    highway: a.highway_id,
    chainage: formatChainage(a.chainage_km),
    lat: a.gps_lat,
    lng: a.gps_lon,
    currentRL: Math.round(a.current_rl ?? 0),
    ircMin: Math.round(a.irc_minimum_rl),
    status: a.status,
    lastMeasured: formatDate(a.last_measured),
    materialGrade: a.material_grade,
  };
}

export function toUiAlert(a: ApiAlert): UiAlert {
  return {
    id: formatAlertId(a.id),
    rawId: a.id,
    severity: a.alert_type,
    message: a.message.replace(/^(CRITICAL|WARNING|INFO):\s*/i, ""),
    highway: a.highway_id,
    chainage: formatChainage(a.chainage_km),
    timestamp: formatDateTime(a.created_at),
    assetId: a.asset_id,
  };
}

export function toUiHighway(h: ApiHighwayHealth): UiHighwayBreakdown {
  return {
    highway: h.highway_id,
    compliant: h.compliant,
    warning: h.warning,
    critical: h.critical,
    total: h.total_assets,
    compliantPct: Math.round(h.compliance_pct),
  };
}

export function toUiReport(r: ApiComplianceReport): UiHighwayReport {
  const total = r.total_assets || 1;
  const breakdown = Object.entries(r.assets_by_type).map(([typeKey, b]) => ({
    type:
      ASSET_TYPE_LABELS[typeKey] ??
      typeKey.charAt(0).toUpperCase() + typeKey.slice(1),
    total: b.total,
    compliant: b.compliant,
    warning: b.warning,
    critical: b.critical,
  }));

  const criticalAssets = r.critical_assets.map((a) => ({
    id: formatAssetId(a.highway_id, a.id),
    type: prettyAssetType(a),
    chainage: formatChainage(a.chainage_km),
    currentRL: Math.round(a.current_rl ?? 0),
    ircMin: Math.round(a.irc_minimum_rl),
  }));

  return {
    totalAssets: r.total_assets,
    compliantPct: Math.round((r.compliant / total) * 100),
    warningPct: Math.round((r.warning / total) * 100),
    criticalPct: Math.round((r.critical / total) * 100),
    breakdown,
    criticalAssets,
  };
}

/* ---------------------------------------------------------
   Fetch wrapper
   --------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const j = await res.json();
      detail = j.detail ?? j.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(
      `${path} → ${res.status}${detail ? ` · ${detail}` : ""}`,
      res.status
    );
  }
  return res.json() as Promise<T>;
}

function qs(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== null
  );
  if (!entries.length) return "";
  return (
    "?" +
    entries
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&")
  );
}

/* ---------------------------------------------------------
   Endpoint surface
   --------------------------------------------------------- */

export const api = {
  // Assets
  async listAssets(filters?: {
    highway_id?: string;
    status?: AssetStatus;
    asset_type?: string;
    limit?: number;
  }): Promise<UiAsset[]> {
    const data = await fetchJson<ApiAsset[]>(
      `/api/assets${qs({ limit: 500, ...filters })}`
    );
    return data.map(toUiAsset);
  },
  async getAsset(id: number): Promise<UiAsset> {
    const data = await fetchJson<ApiAsset>(`/api/assets/${id}`);
    return toUiAsset(data);
  },

  // Alerts
  async listAlerts(filters?: {
    highway_id?: string;
    alert_type?: AlertType;
    is_resolved?: boolean;
    limit?: number;
  }): Promise<UiAlert[]> {
    const data = await fetchJson<ApiAlert[]>(
      `/api/alerts${qs({ limit: 200, ...filters })}`
    );
    return data.map(toUiAlert);
  },
  async resolveAlert(id: number): Promise<UiAlert> {
    const data = await fetchJson<ApiAlert>(`/api/alerts/${id}/resolve`, {
      method: "PUT",
    });
    return toUiAlert(data);
  },
  alertSummary: () =>
    fetchJson<ApiAlertSummary>(`/api/alerts/summary`),

  // Dashboard
  dashboardStats: () =>
    fetchJson<ApiDashboardStats>(`/api/dashboard/stats`),
  async highwayHealth(): Promise<UiHighwayBreakdown[]> {
    const data = await fetchJson<ApiHighwayHealth[]>(
      `/api/dashboard/highway-health`
    );
    return data.map(toUiHighway);
  },

  // Measurements
  async createMeasurement(payload: {
    asset_id: number;
    rl_value: number;
    confidence?: number;
    source_layer: SourceLayer;
    device_info?: string;
  }): Promise<ApiMeasurement> {
    return fetchJson<ApiMeasurement>(`/api/measurements`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Reports
  async complianceReport(highwayId: string): Promise<UiHighwayReport> {
    const data = await fetchJson<ApiComplianceReport>(
      `/api/reports/compliance${qs({ highway_id: highwayId })}`
    );
    return toUiReport(data);
  },
};

/* ---------------------------------------------------------
   Tiny data-fetching hook
   --------------------------------------------------------- */

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize the fetcher so we can call it from outside the effect (refetch)
  // but still re-run the effect when deps change.
  const stableFetcher = useCallback(fetcher, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await stableFetcher();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [stableFetcher]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    stableFetcher()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stableFetcher]);

  return { data, loading, error, refetch: run };
}
