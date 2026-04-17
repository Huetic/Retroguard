"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crosshair,
  Camera,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Zap,
  MapPin,
  Gauge,
  ShieldCheck,
  Smartphone,
  ArrowUpRight,
  Info,
  BellRing,
} from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, type UiAsset, type AssetStatus } from "../../lib/api";

type Step = 1 | 2 | 3;

interface MeasurementResult {
  measurementId: number;
  rlValue: number;
  confidence: number;
  newStatus: AssetStatus;
  oldStatus: AssetStatus;
  statusChanged: boolean;
}

interface ToastState {
  kind: "success" | "alarm";
  title: string;
  detail: string;
}

export default function MeasurePage() {
  const [step, setStep] = useState<Step>(1);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [measured, setMeasured] = useState(false);

  // ---- Real-API wiring ----
  const [targetAsset, setTargetAsset] = useState<UiAsset | null>(null);
  const [pickingTarget, setPickingTarget] = useState(true);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [measurementResult, setMeasurementResult] =
    useState<MeasurementResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  /** Strategically pick an asset whose status will flip on our next
      measurement — prefer 'warning' (→ drops to critical, creates alarm),
      then 'compliant' (→ drops to warning, creates warning alert). */
  const pickNewTarget = useCallback(async () => {
    setPickingTarget(true);
    setTargetError(null);
    setTargetAsset(null);
    try {
      let candidates = await api.listAssets({ status: "warning", limit: 30 });
      if (candidates.length === 0) {
        candidates = await api.listAssets({ status: "compliant", limit: 30 });
      }
      if (candidates.length === 0) {
        setTargetError("No suitable assets found to measure.");
      } else {
        const picked =
          candidates[Math.floor(Math.random() * candidates.length)];
        setTargetAsset(picked);
      }
    } catch (e) {
      setTargetError(
        e instanceof Error ? e.message : "Failed to load target asset"
      );
    } finally {
      setPickingTarget(false);
    }
  }, []);

  // Pick a target on mount
  useEffect(() => {
    void pickNewTarget();
  }, [pickNewTarget]);

  const handleCalibrate = useCallback(() => {
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrated(true);
    }, 2000);
  }, []);

  const handleMeasure = useCallback(async () => {
    if (!targetAsset) return;
    setMeasuring(true);
    setShowFlash(true);
    setSaveError(null);
    setTimeout(() => setShowFlash(false), 600);

    // Generate a realistic-looking RL value that's 82–90 % of the IRC
    // minimum for this asset — guaranteed to land in "critical" territory,
    // which makes the backend auto-generate a new alert on save.
    const targetRl =
      Math.round(
        targetAsset.ircMin * (0.82 + Math.random() * 0.08) * 10
      ) / 10;
    const confidence =
      Math.round((0.84 + Math.random() * 0.08) * 100) / 100;

    try {
      // Hold on the viewfinder spinner briefly before the API completes
      await new Promise((r) => setTimeout(r, 1500));

      const response = await api.createMeasurement({
        asset_id: targetAsset.rawId,
        rl_value: targetRl,
        confidence,
        source_layer: "smartphone",
        device_info: "Pixel 7a · Android 14",
      });

      // Recompute status from ratio so we can show what the row
      // transitioned to without another GET.
      const ratio = targetRl / targetAsset.ircMin;
      const newStatus: AssetStatus =
        ratio >= 1.2 ? "compliant" : ratio >= 1.0 ? "warning" : "critical";
      const statusChanged = newStatus !== targetAsset.status;

      setMeasurementResult({
        measurementId: response.id,
        rlValue: targetRl,
        confidence,
        newStatus,
        oldStatus: targetAsset.status,
        statusChanged,
      });
      setMeasured(true);

      setToast({
        kind:
          statusChanged && newStatus === "critical" ? "alarm" : "success",
        title: statusChanged
          ? `Status shifted · ${newStatus.toUpperCase()} · alert raised`
          : "Measurement saved to registry",
        detail: `${targetAsset.id} · reading #${response.id}`,
      });
      setTimeout(() => setToast(null), 6000);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Failed to save measurement"
      );
    } finally {
      setMeasuring(false);
    }
  }, [targetAsset]);

  const handleReset = useCallback(() => {
    setStep(1);
    setCalibrating(false);
    setCalibrated(false);
    setMeasuring(false);
    setShowFlash(false);
    setMeasured(false);
    setMeasurementResult(null);
    setSaveError(null);
    void pickNewTarget();
  }, [pickNewTarget]);

  useEffect(() => {
    if (calibrated && step === 1) {
      const t = setTimeout(() => setStep(2), 1200);
      return () => clearTimeout(t);
    }
  }, [calibrated, step]);

  const stepLabels = [
    { title: "Calibration", subtitle: "reference patch" },
    { title: "Aim at target", subtitle: "frame the sign" },
    { title: "Capture & results", subtitle: "RL reading" },
  ];

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar
        crumbs={[
          { label: "RetroGuard" },
          { label: "Field capture · smartphone retroreflectometer · beta" },
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
              Field capture
              <span
                className="ml-1 px-1.5 py-0.5 rounded-[4px] text-[9px] font-semibold tracking-[0.14em]"
                style={{
                  background: "rgba(255,107,53,0.12)",
                  color: "var(--color-orange-deep)",
                }}
              >
                BETA
              </span>
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Measure in the field.
              <span className="block text-ink/55 font-normal text-[26px] mt-1">
                Smartphone-based retroreflectometer · walkthrough.
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReset}
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
              Reset walkthrough
            </button>
            <button
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #FF8B5A, #E85A26)",
              }}
            >
              <Smartphone className="w-3.5 h-3.5" strokeWidth={2.25} />
              Install the app
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Flash overlay */}
      {showFlash && (
        <div
          className="fixed inset-0 z-[2000] pointer-events-none flash-animation"
          style={{ background: "rgba(255, 255, 255, 0.85)" }}
        />
      )}

      {/* =====================================================
          Main 2-col grid: Progress/steps column  +  Stage
          ===================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* ================ Left: Step progress + tips ================ */}
        <div
          className="lg:col-span-4 flex flex-col gap-3 rise"
          style={{ animationDelay: "100ms" }}
        >
          {/* Step nav card */}
          <div className="card p-5">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-4 font-medium">
              Walkthrough
            </div>
            <div className="space-y-2">
              {stepLabels.map((s, i) => {
                const stepNum = (i + 1) as Step;
                const isActive = step === stepNum;
                const isDone =
                  step > stepNum || (stepNum === 3 && measured);
                return (
                  <div
                    key={s.title}
                    className={`relative flex items-start gap-3 p-3 -mx-2 rounded-[12px] transition ${
                      isActive
                        ? "bg-orange/[0.08] ring-1 ring-orange/20"
                        : "hover:bg-ink/[0.02]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold tabular shrink-0 transition-all ${
                        isDone
                          ? "text-white"
                          : isActive
                          ? "text-white shadow-[0_4px_12px_-4px_rgba(255,107,53,0.6)]"
                          : "bg-ink/[0.06] text-ink/45"
                      }`}
                      style={
                        isDone
                          ? { background: "var(--color-go)" }
                          : isActive
                          ? {
                              background:
                                "linear-gradient(135deg, #FF8B5A, #E85A26)",
                            }
                          : undefined
                      }
                    >
                      {isDone ? (
                        <CheckCircle2
                          className="w-4 h-4"
                          strokeWidth={2.2}
                        />
                      ) : (
                        stepNum
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[13px] font-medium leading-tight ${
                          isActive
                            ? "text-ink"
                            : isDone
                            ? "text-ink/75"
                            : "text-ink/55"
                        }`}
                      >
                        {s.title}
                      </div>
                      <div className="text-[10.5px] text-ink/45 mt-0.5 uppercase tracking-[0.12em] font-mono">
                        {s.subtitle}
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-orange-deep mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specs card */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-4 font-medium">
              <Info className="w-3 h-3" strokeWidth={2} />
              Capture specs
            </div>
            <div className="space-y-2.5">
              <SpecRow label="Mode" value="IRC 67 · Signs" />
              <SpecRow label="Camera" value="Rear · f/2.0" />
              <SpecRow label="Exposure" value="1/60s · ISO 100" />
              <SpecRow
                label="Calibration"
                value={calibrated ? "K = 0.0847" : "—"}
                highlight={calibrated}
              />
              <SpecRow label="Target" value="Red regulatory · 80" />
              <SpecRow label="GPS lock" value="19.076° N · 72.877° E" />
            </div>
          </div>

          {/* Tips card */}
          <div className="card p-5 hidden lg:block">
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3 font-medium">
              <Zap className="w-3 h-3" strokeWidth={2} />
              Field tips
            </div>
            <ul className="space-y-2 text-[12px] text-ink/65 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-orange mt-0.5">•</span>
                Stand 30 m from the asset for sign measurement.
              </li>
              <li className="flex gap-2">
                <span className="text-orange mt-0.5">•</span>
                Keep the phone steady — 3-frame average improves accuracy.
              </li>
              <li className="flex gap-2">
                <span className="text-orange mt-0.5">•</span>
                Calibrate against the reference patch before each corridor.
              </li>
            </ul>
          </div>
        </div>

        {/* ================ Right: Stage ================ */}
        <div
          className="lg:col-span-8 rise"
          style={{ animationDelay: "160ms" }}
        >
          <div
            className="card overflow-hidden relative"
            style={{ minHeight: 560 }}
          >
            {/* Stage header */}
            <div
              className="px-6 py-4 flex items-center justify-between border-b border-ink/[0.05]"
              style={{ background: "rgba(246,241,229,0.4)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #FF8B5A, #E85A26)",
                  }}
                >
                  <Smartphone className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-ink leading-tight">
                    {stepLabels[step - 1].title}
                  </div>
                  <div className="text-[10.5px] text-ink/50 font-mono uppercase tracking-[0.12em]">
                    Step {step} of 3 · {stepLabels[step - 1].subtitle}
                  </div>
                </div>
              </div>

              {/* Target asset pill — always visible so the demo narrative is clear */}
              {targetAsset ? (
                <div
                  className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-full border border-ink/[0.06]"
                  style={{ background: "rgba(255,107,53,0.06)" }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #FF8B5A, #E85A26)",
                    }}
                  >
                    ·
                  </span>
                  <div className="flex items-baseline gap-2 text-[11px] font-mono tabular uppercase tracking-[0.1em]">
                    <span className="text-orange-deep font-semibold">
                      target
                    </span>
                    <span className="text-ink/75">{targetAsset.id}</span>
                    <span className="text-ink/25">·</span>
                    <span className="text-ink/60">{targetAsset.highway}</span>
                    <span className="text-ink/25">·</span>
                    <span className="text-ink/60">{targetAsset.chainage}</span>
                  </div>
                </div>
              ) : pickingTarget ? (
                <div className="text-[10.5px] text-ink/45 font-mono tabular uppercase tracking-[0.12em] flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot"
                    style={{ background: "var(--color-orange)" }}
                  />
                  Picking target asset…
                </div>
              ) : targetError ? (
                <div className="text-[10.5px] text-alarm/85 font-mono tabular">
                  {targetError}
                </div>
              ) : (
                <div className="text-[10.5px] text-ink/45 font-mono tabular">
                  device · pixel 7a · android 14
                </div>
              )}
            </div>

            {/* Stage body */}
            <div className="px-6 py-8">
              {step === 1 && (
                <StageCalibration
                  calibrating={calibrating}
                  calibrated={calibrated}
                  onCalibrate={handleCalibrate}
                />
              )}
              {step === 2 && <StageAim onNext={() => setStep(3)} />}
              {step === 3 && (
                <StageCapture
                  measuring={measuring}
                  measured={measured}
                  onMeasure={handleMeasure}
                  onReset={handleReset}
                  targetAsset={targetAsset}
                  result={measurementResult}
                  saveError={saveError}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          Toast (bottom-right, shown for ~6s after save)
          ===================================================== */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[2000] rise pointer-events-auto"
          style={{ animation: "rise 0.45s cubic-bezier(0.2,0.7,0.2,1) both" }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] shadow-[0_18px_40px_-14px_rgba(28,27,25,0.4)] text-white max-w-[360px]"
            style={{
              background:
                toast.kind === "alarm"
                  ? "linear-gradient(135deg, #FF7A44, #D54230)"
                  : "linear-gradient(135deg, #5EC486, #3FA364)",
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              {toast.kind === "alarm" ? (
                <BellRing className="w-4 h-4" strokeWidth={2.2} />
              ) : (
                <CheckCircle2 className="w-4 h-4" strokeWidth={2.4} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight">
                {toast.title}
              </div>
              <div className="text-[11px] font-mono tabular text-white/85 mt-0.5 truncate">
                {toast.detail}{" "}
                {toast.kind === "alarm" && (
                  <a
                    href="/alerts"
                    className="underline underline-offset-2 hover:text-white"
                  >
                    see /alerts →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · field capture · walkthrough</span>
        <span>irc 67 compliant · ref-patch calibrated</span>
      </div>
    </div>
  );
}

/* =========================================================
   Stages
   ========================================================= */

function StageCalibration({
  calibrating,
  calibrated,
  onCalibrate,
}: {
  calibrating: boolean;
  calibrated: boolean;
  onCalibrate: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6 max-w-[440px]">
        <h2 className="text-[22px] font-semibold text-ink leading-tight mb-1">
          Calibrate against the reference patch.
        </h2>
        <p className="text-[13px] text-ink/60 leading-relaxed">
          Place the phone camera against the{" "}
          <strong className="text-ink">white reference patch</strong> — the app
          derives a camera constant <code className="font-mono">K</code> so
          brightness can be translated into RL value.
        </p>
      </div>

      {/* Phone mockup with reference patch */}
      <div className="relative mb-8">
        <PhoneFrame>
          <div
            className={`w-full h-full rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-500 ${
              calibrated
                ? "border-[color:var(--color-go)] bg-[rgba(63,163,100,0.08)]"
                : calibrating
                ? "border-[color:var(--color-orange)] bg-[rgba(255,107,53,0.05)]"
                : "border-ink/20 bg-cream/40"
            }`}
          >
            {calibrating ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 border-[3px] border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--color-orange)" }}
                />
                <p className="text-[13px] font-semibold text-ink">
                  Calibrating…
                </p>
                <p className="text-[10.5px] text-ink/50 font-mono uppercase tracking-[0.12em]">
                  Analyzing reference patch
                </p>
              </div>
            ) : calibrated ? (
              <div className="flex flex-col items-center gap-3 animate-fade-in-up">
                <div
                  className="w-14 h-14 rounded-[16px] flex items-center justify-center"
                  style={{ background: "rgba(63,163,100,0.14)" }}
                >
                  <CheckCircle2
                    className="w-7 h-7"
                    style={{ color: "var(--color-go)" }}
                    strokeWidth={2.2}
                  />
                </div>
                <p
                  className="text-[13px] font-bold"
                  style={{ color: "var(--color-go)" }}
                >
                  Calibration complete
                </p>
                <div className="bg-paper rounded-[10px] px-4 py-2 border border-ink/5 text-center">
                  <div className="text-[9px] text-ink/45 uppercase tracking-[0.14em] font-medium">
                    camera constant
                  </div>
                  <div className="text-[18px] font-mono tabular font-semibold text-ink mt-0.5">
                    K = 0.0847
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-[14px] bg-gradient-to-br from-paper to-cream-2 border border-ink/10 flex items-center justify-center shadow-inner">
                  <div className="w-16 h-16 rounded-[9px] bg-paper-2 border border-ink/8 shadow-[inset_0_0_0_3px_rgba(0,0,0,0.02)]" />
                </div>
                <p className="text-[11px] text-ink/45 font-mono uppercase tracking-[0.14em]">
                  reference patch · white
                </p>
              </div>
            )}
          </div>
        </PhoneFrame>
      </div>

      {!calibrated && (
        <button
          onClick={onCalibrate}
          disabled={calibrating}
          className="pill text-white font-medium gap-2 h-12 px-6 text-[13px] shadow-[0_12px_30px_-10px_rgba(255,107,53,0.7)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          <Zap className="w-4 h-4" strokeWidth={2.2} />
          {calibrating ? "Calibrating…" : "Calibrate now"}
        </button>
      )}
    </div>
  );
}

function StageAim({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6 max-w-[440px]">
        <h2 className="text-[22px] font-semibold text-ink leading-tight mb-1">
          Frame the retroreflective asset.
        </h2>
        <p className="text-[13px] text-ink/60 leading-relaxed">
          Centre the sign in the viewfinder. The app locks on automatically once
          the sign covers more than 60% of the frame.
        </p>
      </div>

      <div className="mb-8">
        <PhoneFrame>
          <div
            className="w-full h-full rounded-[24px] overflow-hidden relative"
            style={{
              background:
                "linear-gradient(180deg, #1C1B19 0%, #0B0C0E 100%)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(50,45,38,0.4) 0%, transparent 70%)",
              }}
            />

            {/* Sign mockup */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative z-10 w-28 h-28 rounded-[14px] bg-[#D54230] border-[3px] border-white flex items-center justify-center shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]">
                <div className="w-20 h-20 rounded-full border-[3px] border-white flex items-center justify-center">
                  <span className="text-white text-[26px] font-black tabular">
                    80
                  </span>
                </div>
              </div>
              <Crosshair
                className="absolute w-16 h-16 z-20"
                style={{ color: "rgba(255,181,140,0.9)" }}
              />
            </div>

            {/* Corner brackets */}
            <div
              className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2"
              style={{ borderColor: "rgba(255,181,140,0.6)" }}
            />
            <div
              className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2"
              style={{ borderColor: "rgba(255,181,140,0.6)" }}
            />
            <div
              className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2"
              style={{ borderColor: "rgba(255,181,140,0.6)" }}
            />
            <div
              className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2"
              style={{ borderColor: "rgba(255,181,140,0.6)" }}
            />

            {/* Status bars */}
            <div className="absolute top-0 left-0 right-0 bg-black/40 backdrop-blur-md px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1 h-1 rounded-full animate-pulse-dot"
                  style={{ background: "#FF8B5A" }}
                />
                <span
                  className="text-[9px] font-mono tabular uppercase tracking-[0.12em]"
                  style={{ color: "rgba(255,181,140,0.9)" }}
                >
                  LOCKED ON TARGET
                </span>
              </div>
              <span className="text-[9px] font-mono tabular text-white/55">
                IRC 67
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md px-3 py-2 flex items-center justify-between">
              <span className="text-[9px] font-mono tabular text-white/55">
                K=0.0847
              </span>
              <span className="text-[9px] font-mono tabular text-white/55">
                f/2.0 · 1/60s · ISO 100
              </span>
            </div>
          </div>
        </PhoneFrame>
      </div>

      <button
        onClick={onNext}
        className="pill text-white font-medium gap-2 h-12 px-6 text-[13px] shadow-[0_12px_30px_-10px_rgba(255,107,53,0.7)] hover:brightness-110 transition"
        style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
      >
        <Camera className="w-4 h-4" strokeWidth={2.2} />
        Ready to measure
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StageCapture({
  measuring,
  measured,
  onMeasure,
  onReset,
  targetAsset,
  result,
  saveError,
}: {
  measuring: boolean;
  measured: boolean;
  onMeasure: () => void;
  onReset: () => void;
  targetAsset: UiAsset | null;
  result: MeasurementResult | null;
  saveError: string | null;
}) {
  const noTarget = !targetAsset;

  if (!measured) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-center mb-6 max-w-[440px]">
          <h2 className="text-[22px] font-semibold text-ink leading-tight mb-1">
            Capture the reading.
          </h2>
          <p className="text-[13px] text-ink/60 leading-relaxed">
            {targetAsset ? (
              <>
                Measuring{" "}
                <strong className="text-ink">{targetAsset.type}</strong> at{" "}
                <code className="font-mono text-[11.5px]">
                  {targetAsset.highway} · {targetAsset.chainage}
                </code>
                . Press <strong className="text-ink">Measure</strong> to flash
                and compute the RL — the reading will post to the registry and
                may raise an alert.
              </>
            ) : (
              <>Waiting for a target asset to be selected…</>
            )}
          </p>
        </div>

        <div className="mb-8">
          <PhoneFrame>
            <div
              className="w-full h-full rounded-[24px] overflow-hidden relative flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(180deg, #1C1B19 0%, #0B0C0E 100%)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 50%, rgba(50,45,38,0.4) 0%, transparent 70%)",
                }}
              />
              <div className="relative z-10 w-28 h-28 rounded-[14px] bg-[#D54230] border-[3px] border-white flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-[3px] border-white flex items-center justify-center">
                  <span className="text-white text-[26px] font-black tabular">
                    80
                  </span>
                </div>
              </div>
              <Crosshair
                className="absolute w-16 h-16 z-20"
                style={{ color: "rgba(255,181,140,0.9)" }}
              />
              {measuring && (
                <div className="absolute inset-0 bg-white/20 z-30 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-12 h-12 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </PhoneFrame>
        </div>

        {saveError && (
          <div className="mb-4 text-[12px] text-alarm/85 bg-alarm/[0.06] border border-alarm/15 px-3 py-2 rounded-full font-mono">
            {saveError}
          </div>
        )}

        <button
          onClick={onMeasure}
          disabled={measuring || noTarget}
          className="pill text-white font-medium gap-2 h-12 px-8 text-[13px] shadow-[0_12px_30px_-10px_rgba(63,163,100,0.65)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
          style={{
            background: "linear-gradient(135deg, #5EC486, #3FA364)",
          }}
        >
          <Zap className="w-4 h-4" strokeWidth={2.2} />
          {measuring ? "Measuring & saving…" : noTarget ? "Loading target…" : "Measure & save"}
        </button>
      </div>
    );
  }

  // ---- measured=true view (driven by real API response) ----
  if (!targetAsset || !result) {
    return null;
  }

  const statusCfg: Record<
    AssetStatus,
    { label: string; bg: string; fg: string; Icon: typeof CheckCircle2 }
  > = {
    compliant: {
      label: "Compliant",
      bg: "rgba(63,163,100,0.12)",
      fg: "#2E7E4A",
      Icon: CheckCircle2,
    },
    warning: {
      label: "Warning",
      bg: "rgba(217,139,20,0.14)",
      fg: "#97580E",
      Icon: CheckCircle2,
    },
    critical: {
      label: "Critical",
      bg: "rgba(213,66,48,0.12)",
      fg: "#9E2E1C",
      Icon: CheckCircle2,
    },
  };
  const sCfg = statusCfg[result.newStatus];

  const headerIconBg =
    result.newStatus === "critical"
      ? "rgba(213,66,48,0.12)"
      : result.newStatus === "warning"
      ? "rgba(217,139,20,0.14)"
      : "rgba(63,163,100,0.12)";
  const headerIconFg =
    result.newStatus === "critical"
      ? "var(--color-alarm)"
      : result.newStatus === "warning"
      ? "var(--color-caution)"
      : "var(--color-go)";

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-6">
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
          style={{ background: headerIconBg }}
        >
          <CheckCircle2
            className="w-6 h-6"
            style={{ color: headerIconFg }}
            strokeWidth={2.2}
          />
        </div>
        <h2 className="text-[22px] font-semibold text-ink leading-tight mb-1">
          {result.statusChanged
            ? "Reading saved · status changed."
            : "Measurement complete."}
        </h2>
        <p className="text-[12.5px] text-ink/55">
          Reading #{result.measurementId} logged to the corridor registry
          {result.statusChanged && (
            <>
              {" "}— <a href="/alerts" className="text-orange-deep hover:underline">a new alert was raised</a>.
            </>
          )}
        </p>
      </div>

      {/* Results card */}
      <div className="max-w-[520px] mx-auto rounded-[18px] overflow-hidden border border-ink/[0.05]">
        {/* Detection header */}
        <div
          className="px-5 py-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1C1B19, #26241F)",
          }}
        >
          <div
            aria-hidden
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-40"
            style={{ background: "var(--color-orange)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-paper-2/55 mb-1">
              <ShieldCheck className="w-3 h-3" />
              Detected asset · auto-matched
            </div>
            <p className="text-paper-2 font-semibold text-[17px] leading-tight">
              {targetAsset.type}
              {targetAsset.materialGrade && (
                <span className="text-paper-2/55 font-normal">
                  {" "}
                  · {targetAsset.materialGrade}
                </span>
              )}
            </p>
            <div className="mt-1.5 text-[11px] font-mono tabular text-paper-2/55">
              {targetAsset.highway} · {targetAsset.chainage} · asset{" "}
              {targetAsset.id}
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div className="bg-paper p-5 space-y-3.5">
          <ResultRow
            icon={<Gauge className="w-4 h-4" />}
            label="Measured RL"
            value={
              <span className="tabular">
                <span
                  className="text-[20px] font-semibold"
                  style={{
                    color:
                      result.newStatus === "critical"
                        ? "var(--color-alarm)"
                        : result.newStatus === "warning"
                        ? "var(--color-caution)"
                        : "var(--color-ink)",
                  }}
                >
                  {result.rlValue.toFixed(1)}
                </span>
                <span className="text-[11px] text-ink/45 ml-1">
                  mcd/lx/m²
                </span>
              </span>
            }
          />
          <ResultRow
            label="IRC minimum"
            value={
              <span className="font-mono tabular text-ink/70 text-[13px]">
                {targetAsset.ircMin}{" "}
                <span className="text-[10.5px] text-ink/40">mcd/lx/m²</span>
              </span>
            }
          />
          <div className="h-px bg-ink/[0.06]" />
          <ResultRow
            label="Status"
            value={
              <span className="inline-flex items-center gap-2">
                {result.statusChanged && (
                  <span className="text-[10px] font-mono tabular uppercase tracking-[0.1em] text-ink/40">
                    {result.oldStatus} →
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ background: sCfg.bg, color: sCfg.fg }}
                >
                  <sCfg.Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                  {sCfg.label}
                </span>
              </span>
            }
          />
          <ResultRow
            icon={<MapPin className="w-4 h-4" />}
            label="GPS lock"
            value={
              <span className="font-mono tabular text-[12px] text-ink/75">
                {targetAsset.lat.toFixed(4)}° N ·{" "}
                {targetAsset.lng.toFixed(4)}° E
              </span>
            }
          />
          <ResultRow
            label="Confidence"
            value={
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-ink/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(result.confidence * 100)}%`,
                      background:
                        "linear-gradient(90deg, var(--color-orange-soft), var(--color-orange))",
                    }}
                  />
                </div>
                <span className="text-[12px] font-semibold text-ink tabular">
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            }
          />
          <ResultRow
            label="Calibration"
            value={
              <span className="font-mono tabular text-[11.5px] text-ink/55">
                K = 0.0847
              </span>
            }
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-2 mt-6">
        <button
          onClick={onReset}
          className="pill bg-paper border border-ink/8 hover:bg-cream text-ink/75 gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
          New measurement
        </button>
        <a
          href="/alerts"
          className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          View alerts
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

/* =========================================================
   Tiny shared components
   ========================================================= */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[34px] p-3 shadow-[0_20px_50px_-20px_rgba(28,27,25,0.35)]"
      style={{
        background: "linear-gradient(145deg, #26241F, #17181B)",
        width: 280,
      }}
    >
      {/* Notch */}
      <div className="flex justify-center mb-2">
        <div className="w-16 h-1.5 rounded-full bg-white/10" />
      </div>
      <div
        className="rounded-[26px] overflow-hidden"
        style={{
          width: "100%",
          height: 340,
          background: "var(--color-cream)",
        }}
      >
        {children}
      </div>
      {/* Home indicator */}
      <div className="flex justify-center mt-2">
        <div className="w-10 h-1 rounded-full bg-white/15" />
      </div>
    </div>
  );
}

function SpecRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11.5px]">
      <span className="text-ink/55 uppercase tracking-[0.1em] font-medium text-[10px]">
        {label}
      </span>
      <span
        className="font-mono tabular"
        style={{
          color: highlight
            ? "var(--color-orange-deep)"
            : "var(--color-ink)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ResultRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[12.5px] text-ink/60">
        {icon && <span className="text-ink/40">{icon}</span>}
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
