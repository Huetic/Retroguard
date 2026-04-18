"use client";

import { useEffect, useState } from "react";
import { Printer, ScanLine, QrCode } from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, type UiAsset, useApi } from "../../lib/api";

/* ==========================================================
   /qr — Layer 6: QR deployment & scan-to-measurement
   ========================================================== */
export default function QrPage() {
  const { data: assets } = useApi<UiAsset[]>(() => api.listAssets({ limit: 500 }), []);
  const [highway, setHighway] = useState<string>("");
  const [previewId, setPreviewId] = useState<number | null>(null);

  useEffect(() => {
    if (!previewId && assets && assets.length) setPreviewId(assets[0].rawId);
  }, [assets, previewId]);

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar crumbs={[{ label: "RetroGuard" }, { label: "QR deployment & scan (Layer 6)" }]} />

      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div>
          <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-orange)" }} />
            Layer 6 · QR codes
          </div>
          <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
            Print. Stick. Scan.
            <span className="block text-ink/55 font-normal text-[22px] mt-1">
              Every sign gets a QR with its metadata. Field crews scan → log a measurement in one round-trip.
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Bulk print */}
        <section className="col-span-5 card p-5 rise" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <Printer className="w-4 h-4 text-ink/70" />
            <div className="text-[13px] font-semibold text-ink">Bulk QR print sheet</div>
          </div>
          <p className="text-[12.5px] text-ink/60 mb-4">
            Downloads a paginated A4 PDF — 12 QR codes per page with asset ID, highway, and chainage caption.
          </p>
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">Highway (optional)</span>
            <input
              className="w-full bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]"
              value={highway}
              onChange={(e) => setHighway(e.target.value)}
              placeholder="NH-48 — leave blank for all"
            />
          </label>
          <a
            href={api.bulkQrPdfUrl(highway || undefined)}
            className="pill text-white font-medium justify-center shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)]"
            style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
          >
            <Printer className="w-3.5 h-3.5" />
            Download PDF
          </a>
        </section>

        {/* Single preview */}
        <section className="col-span-3 card p-5 rise" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-4 h-4 text-ink/70" />
            <div className="text-[13px] font-semibold text-ink">Single asset preview</div>
          </div>
          <select
            value={previewId ?? ""}
            onChange={(e) => setPreviewId(parseInt(e.target.value, 10))}
            className="w-full bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px] mb-3"
          >
            {(assets ?? []).map((a) => (
              <option key={a.rawId} value={a.rawId}>{a.id} · {a.type}</option>
            ))}
          </select>
          {previewId && (
            <div className="flex items-center justify-center p-3 rounded-xl bg-paper/60 border border-ink/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={api.qrImageUrl(previewId)}
                alt="QR preview"
                className="w-full max-w-[220px] h-auto"
              />
            </div>
          )}
        </section>

        {/* Scan simulator */}
        <section className="col-span-4 card p-5 rise" style={{ animationDelay: "160ms" }}>
          <ScanSimulator assets={assets ?? []} />
        </section>
      </div>

      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · layer 6 · qr pipeline</span>
        <span>pdf is server-generated</span>
      </div>
    </div>
  );
}

function ScanSimulator({ assets }: { assets: UiAsset[] }) {
  const [assetId, setAssetId] = useState<string>("");
  const [rlValue, setRlValue] = useState<string>("180");
  const [confidence, setConfidence] = useState<string>("0.9");
  const [payloadOverride, setPayloadOverride] = useState<string>("");
  const [result, setResult] = useState<{ measurement_id: number; asset_id: number; rl_value: number; new_status: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setErr(null);
    setResult(null);
    setSubmitting(true);
    try {
      let payload = payloadOverride;
      if (!payload) {
        if (!assetId) throw new Error("pick an asset or paste a payload");
        const res = await fetch(api.qrPayloadUrl(parseInt(assetId, 10)));
        payload = await res.text();
      }
      const r = await api.qrScanMeasurement({
        payload,
        rl_value: parseFloat(rlValue),
        confidence: confidence ? parseFloat(confidence) : undefined,
        device_info: "qr-scan-simulator",
      });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <ScanLine className="w-4 h-4 text-ink/70" />
        <div className="text-[13px] font-semibold text-ink">Simulate scan → measurement</div>
      </div>
      <p className="text-[12px] text-ink/60 mb-3">
        Mimics a phone scanning a sign&rsquo;s QR. Fetches the asset&rsquo;s payload and submits a measurement in one call.
      </p>

      <label className="flex flex-col gap-1 mb-2">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">Asset</span>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]"
        >
          <option value="">Select…</option>
          {assets.map((a) => (
            <option key={a.rawId} value={a.rawId}>{a.id} · {a.type} · {a.highway}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">R_L value</span>
          <input className="bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]" value={rlValue} onChange={(e) => setRlValue(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">Confidence</span>
          <input className="bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px]" value={confidence} onChange={(e) => setConfidence(e.target.value)} />
        </label>
      </div>

      <details className="mb-3">
        <summary className="text-[11px] text-ink/50 cursor-pointer">Paste raw payload (advanced)</summary>
        <textarea
          value={payloadOverride}
          onChange={(e) => setPayloadOverride(e.target.value)}
          className="mt-2 w-full bg-paper/60 border border-ink/10 rounded-lg px-2 py-1 text-[11px] font-mono h-[80px]"
          placeholder='{"asset_id": 1, ...}'
        />
      </details>

      {err && <div className="mb-2 text-[12px] text-alarm">{err}</div>}

      <button
        onClick={submit}
        disabled={submitting || (!assetId && !payloadOverride)}
        className="w-full pill text-white font-medium justify-center shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
      >
        {submitting ? "Logging…" : "Log measurement"}
      </button>

      {result && (
        <div className="mt-3 rounded-xl bg-paper/60 border border-ink/5 p-3 text-[12px]">
          <div>Measurement <span className="font-mono">#{result.measurement_id}</span> logged for asset <span className="font-mono">#{result.asset_id}</span></div>
          <div>R_L: <span className="font-mono">{result.rl_value}</span></div>
          <div>New status: <span className="font-semibold uppercase">{result.new_status}</span></div>
        </div>
      )}
    </>
  );
}
