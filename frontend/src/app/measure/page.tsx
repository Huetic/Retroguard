"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  Crosshair,
  Camera,
  CheckCircle,
  ChevronRight,
  RotateCcw,
  Zap,
  MapPin,
  Gauge,
  ShieldCheck,
} from "lucide-react";

type Step = 1 | 2 | 3;

export default function MeasurePage() {
  const [step, setStep] = useState<Step>(1);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [measured, setMeasured] = useState(false);

  const handleCalibrate = useCallback(() => {
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrated(true);
    }, 2000);
  }, []);

  const handleMeasure = useCallback(() => {
    setMeasuring(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 600);
    setTimeout(() => {
      setMeasuring(false);
      setMeasured(true);
    }, 1800);
  }, []);

  const handleReset = useCallback(() => {
    setStep(1);
    setCalibrating(false);
    setCalibrated(false);
    setMeasuring(false);
    setShowFlash(false);
    setMeasured(false);
  }, []);

  // Auto-advance after calibration
  useEffect(() => {
    if (calibrated && step === 1) {
      const t = setTimeout(() => setStep(2), 1200);
      return () => clearTimeout(t);
    }
  }, [calibrated, step]);

  const stepLabels = ["Calibration", "Aim at Target", "Capture & Results"];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-blue-600" />
          Measurement Simulator
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Simulates the smartphone-based retroreflectometer workflow
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          {stepLabels.map((label, idx) => {
            const stepNum = (idx + 1) as Step;
            const isActive = step === stepNum;
            const isDone = step > stepNum || (stepNum === 3 && measured);
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      isDone
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-blue-700"
                        : isDone
                        ? "text-green-700"
                        : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className="flex-1 mx-4">
                    <div className="h-0.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          step > stepNum ? "w-full bg-green-500" : "w-0 bg-blue-500"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Flash overlay */}
        {showFlash && (
          <div className="fixed inset-0 bg-white z-50 flash-animation pointer-events-none" />
        )}

        {/* Step 1: Calibration */}
        {step === 1 && (
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Step 1: Calibration</h2>
              <p className="text-sm text-slate-500 mt-1">
                Place the phone camera against the reference patch for calibration
              </p>
            </div>

            {/* Calibration Target */}
            <div className="flex justify-center mb-8">
              <div
                className={`w-64 h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-500 ${
                  calibrated
                    ? "border-green-400 bg-green-50"
                    : calibrating
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                {calibrating ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-blue-600">Calibrating...</p>
                    <p className="text-xs text-slate-400">Analyzing reference patch</p>
                  </div>
                ) : calibrated ? (
                  <div className="flex flex-col items-center gap-3 animate-fade-in-up">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-sm font-bold text-green-700">Calibration Complete</p>
                    <div className="bg-white rounded-lg px-4 py-2 border border-green-200">
                      <p className="text-xs text-slate-500">Calibration Constant</p>
                      <p className="text-lg font-mono font-bold text-slate-800">
                        K<sub>cam</sub> = 0.0847
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-100 to-white border-2 border-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Reference Patch Area</p>
                  </div>
                )}
              </div>
            </div>

            {!calibrated && (
              <div className="flex justify-center">
                <button
                  onClick={handleCalibrate}
                  disabled={calibrating}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  {calibrating ? "Calibrating..." : "Calibrate"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Aim at Target */}
        {step === 2 && (
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Step 2: Aim at Target</h2>
              <p className="text-sm text-slate-500 mt-1">
                Point the camera at the retroreflective sign and align the crosshairs
              </p>
            </div>

            {/* Camera Viewfinder */}
            <div className="flex justify-center mb-8">
              <div className="relative w-80 h-60 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 overflow-hidden">
                {/* Simulated camera view */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Background "scene" */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-700/50 to-slate-800/50" />

                  {/* Sign mockup */}
                  <div className="relative z-10 w-28 h-28 rounded-lg bg-red-600 border-4 border-white flex flex-col items-center justify-center shadow-2xl">
                    <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                      <span className="text-white text-2xl font-black">80</span>
                    </div>
                  </div>

                  {/* Crosshairs */}
                  <Crosshair className="absolute w-16 h-16 text-green-400/80 z-20" />

                  {/* Corner brackets */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-green-400/60" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-green-400/60" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-green-400/60" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-green-400/60" />
                </div>

                {/* Status bar */}
                <div className="absolute top-0 left-0 right-0 bg-black/50 px-3 py-1.5 flex items-center justify-between">
                  <span className="text-green-400 text-[10px] font-mono">LOCKED ON TARGET</span>
                  <span className="text-white/60 text-[10px] font-mono">ISO 20471</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white/60 text-[10px] font-mono">K=0.0847</span>
                  <span className="text-white/60 text-[10px] font-mono">f/2.0 1/60s</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4" />
                Ready to Measure
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Capture & Results */}
        {step === 3 && (
          <div className="p-8">
            {!measured ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Step 3: Capture Measurement</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Press Measure to capture and analyze the retroreflective reading
                  </p>
                </div>

                <div className="flex justify-center mb-8">
                  <div className="relative w-80 h-60 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-700/50 to-slate-800/50" />
                    <div className="relative z-10 w-28 h-28 rounded-lg bg-red-600 border-4 border-white flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                        <span className="text-white text-2xl font-black">80</span>
                      </div>
                    </div>
                    <Crosshair className="absolute w-16 h-16 text-green-400/80 z-20" />

                    {measuring && (
                      <div className="absolute inset-0 bg-white/20 z-30 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleMeasure}
                    disabled={measuring}
                    className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Zap className="w-4 h-4" />
                    {measuring ? "Measuring..." : "Measure"}
                  </button>
                </div>
              </>
            ) : (
              <div className="animate-fade-in-up">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Measurement Complete</h2>
                </div>

                {/* Results Card */}
                <div className="max-w-md mx-auto bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  {/* Detection header */}
                  <div className="bg-blue-600 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-200" />
                      <span className="text-xs text-blue-200 font-medium">Detected Sign</span>
                    </div>
                    <p className="text-white font-bold text-lg mt-1">
                      Regulatory Sign — Speed Limit 80
                    </p>
                  </div>

                  {/* Results grid */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Measured RL</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900 font-mono">
                        142.3 <span className="text-xs font-normal text-slate-400">mcd/lx/m&sup2;</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">IRC Minimum</span>
                      <span className="text-sm font-semibold text-slate-700 font-mono">
                        120 <span className="text-xs font-normal text-slate-400">mcd/lx/m&sup2;</span>
                      </span>
                    </div>

                    <div className="h-px bg-slate-200" />

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-sm font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        COMPLIANT
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">GPS</span>
                      </div>
                      <span className="text-sm font-mono text-slate-700">
                        19.0760&deg;N, 72.8777&deg;E
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: "87%" }} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">87%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Calibration</span>
                      <span className="text-sm font-mono text-slate-500">
                        K<sub>cam</sub> = 0.0847
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reset */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors border border-slate-200"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New Measurement
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
