"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, RefreshCw, Film, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, type ApiJobRun, type UiAsset, useApi } from "../../lib/api";

/* ==========================================================
   /ingest — Data ingestion hub
   ----------------------------------------------------------
   - Upload a CCTV / dashcam video against an asset
   - Backend returns a JobRun id immediately (async)
   - Poll jobs table every 3s to show live progress
   ========================================================== */
export default function IngestPage() {
  // Asset dropdown source
  const { data: assets } = useApi<UiAsset[]>(() => api.listAssets({ limit: 500 }), []);

  // Jobs list (polled)
  const [jobs, setJobs] = useState<ApiJobRun[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const data = await api.listJobs(50);
      setJobs(data);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const id = setInterval(loadJobs, 3000);
    return () => clearInterval(id);
  }, []);

  // Upload form state
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [assetId, setAssetId] = useState<string>("");
  const [sourceLayer, setSourceLayer] = useState<"cctv" | "dashcam">("cctv");
  const [everyN, setEveryN] = useState("2");
  const [maxFrames, setMaxFrames] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!file || !assetId) {
      setErr("Pick a video file and an asset.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await api.enqueueVideoIngest({
        file,
        asset_id: parseInt(assetId, 10),
        source_layer: sourceLayer,
        every_n_seconds: parseFloat(everyN),
        max_frames: parseInt(maxFrames, 10),
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadJobs();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = useMemo(
    () => jobs.filter((j) => j.status === "queued" || j.status === "running").length,
    [jobs]
  );

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar
        crumbs={[
          { label: "RetroGuard" },
          { label: "Ingest · CCTV & dashcam video pipelines" },
        ]}
      />

      {/* Hero */}
      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-orange)" }} />
              Ingest pipeline
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Bulk data in. Measurements out.
              <span className="block text-ink/55 font-normal text-[22px] mt-1">
                Upload a CCTV or dashcam video — frames are sampled, R_L estimated, measurements logged.
              </span>
            </h1>
          </div>
          <div className="text-[11px] text-ink/55 font-mono tabular uppercase tracking-[0.18em]">
            {activeCount} active · {jobs.length} total
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Upload form */}
        <section className="col-span-5 card p-5 rise" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-4 h-4 text-ink/70" />
            <div className="text-[13px] font-semibold text-ink">New video ingestion</div>
          </div>

          <label className="flex flex-col gap-1 mb-3">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">Asset</span>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]"
            >
              <option value="">Select an asset…</option>
              {(assets ?? []).map((a) => (
                <option key={a.rawId} value={a.rawId}>
                  {a.id} · {a.type} · {a.highway} · {a.chainage}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">Source</span>
              <select
                value={sourceLayer}
                onChange={(e) => setSourceLayer(e.target.value as "cctv" | "dashcam")}
                className="bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]"
              >
                <option value="cctv">CCTV</option>
                <option value="dashcam">Dashcam</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">Every N seconds</span>
              <input
                value={everyN}
                onChange={(e) => setEveryN(e.target.value)}
                className="bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]"
              />
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">Max frames to sample</span>
              <input
                value={maxFrames}
                onChange={(e) => setMaxFrames(e.target.value)}
                className="bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]"
              />
            </label>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="border border-dashed border-ink/20 rounded-xl p-6 cursor-pointer hover:bg-paper/40 text-center mb-3"
          >
            <Upload className="w-5 h-5 text-ink/50 mx-auto mb-2" />
            <div className="text-[13px] text-ink/70">
              {file ? file.name : "Click to choose a video file"}
            </div>
            <div className="text-[10.5px] text-ink/45 mt-1">
              MP4 / MOV / AVI
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {err && <div className="mb-3 text-[12px] text-alarm">{err}</div>}

          <button
            onClick={submit}
            disabled={!file || !assetId || submitting}
            className="w-full pill text-white font-medium justify-center shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
          >
            {submitting ? "Queueing…" : "Queue ingestion job"}
          </button>
        </section>

        {/* Jobs table */}
        <section className="col-span-7 card p-5 rise" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-semibold text-ink">Recent jobs</div>
            <button
              onClick={loadJobs}
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-1.5 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${jobsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-ink/55">
              No jobs yet — queue one from the form.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[560px] divide-y divide-ink/5">
              {jobs.map((j) => (
                <JobRow key={j.id} job={j} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · layer 2 cctv · layer 4 dashcam</span>
        <span>async · polling 3s</span>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: ApiJobRun }) {
  const result = job.result_json ? JSON.parse(job.result_json) : null;
  const params = job.params_json ? JSON.parse(job.params_json) : null;

  const statusBadge = () => {
    switch (job.status) {
      case "queued":
        return <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-ink/10 text-ink/60 uppercase tracking-wider">queued</span>;
      case "running":
        return (
          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-orange/20 text-orange uppercase tracking-wider inline-flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> running
          </span>
        );
      case "done":
        return (
          <span className="text-[10.5px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1" style={{ background: "rgba(94,196,134,0.18)", color: "#3f8e5b" }}>
            <CheckCircle2 className="w-2.5 h-2.5" /> done
          </span>
        );
      case "failed":
        return (
          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-alarm/15 text-alarm uppercase tracking-wider inline-flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" /> failed
          </span>
        );
    }
  };

  return (
    <div className="py-3 px-1 flex items-start gap-4">
      <div className="text-[11px] font-mono text-ink/50 w-10 shrink-0 pt-0.5">#{job.id}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {statusBadge()}
          <span className="text-[11px] text-ink/55 font-mono uppercase">{job.source_type}</span>
          {job.asset_id !== null && (
            <span className="text-[11px] text-ink/55">Asset #{job.asset_id}</span>
          )}
        </div>
        {params?.original_filename && (
          <div className="text-[12px] text-ink/70 truncate">{params.original_filename}</div>
        )}
        {result && (
          <div className="text-[11px] text-ink/55 mt-1">
            {result.measurements_created} measurements · avg R_L {result.avg_rl} · status{" "}
            <span className="font-medium text-ink/80">{result.final_asset_status}</span>
          </div>
        )}
        {job.error && (
          <div className="text-[11px] text-alarm mt-1">{job.error}</div>
        )}
      </div>
      <div className="text-[10.5px] font-mono text-ink/45 shrink-0 text-right">
        {new Date(job.created_at).toLocaleTimeString()}
      </div>
    </div>
  );
}
