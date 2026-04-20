#!/usr/bin/env python3
"""
RetroGuard Degradation Prediction
===================================

Predicts future retroreflectivity values using time-series analysis.

Two models:
    1. Exponential Decay:  RL(t) = RL_0 * exp(-lambda * t)
       Fitted from historical data with scipy.optimize.curve_fit.
    2. Multi-factor Model: Applies correction factors for traffic volume,
       weather exposure, and material grade.

Usage:
    python predict_degradation.py --data measurements.json
    python predict_degradation.py --simulate
    python predict_degradation.py --simulate --asset-type sign --color white

Author: RetroGuard Team — NHAI Hackathon 2026
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    from scipy.optimize import curve_fit
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# Add parent for model import
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from models.retroreflectivity_model import RetroReflectivityEstimator


# ---------------------------------------------------------------------------
# Decay models
# ---------------------------------------------------------------------------

def exponential_decay(t: np.ndarray, rl_0: float, lam: float) -> np.ndarray:
    """RL(t) = RL_0 * exp(-lambda * t), where t is in days."""
    return rl_0 * np.exp(-lam * t)


def fit_exponential_decay(
    days: np.ndarray, rl_values: np.ndarray
) -> Tuple[float, float, float, float]:
    """
    Fit exponential decay model to historical data.

    Returns (rl_0, lambda, rl_0_std, lambda_std).
    """
    if HAS_SCIPY:
        # Initial guesses
        p0 = [max(rl_values), 1e-4]
        try:
            popt, pcov = curve_fit(
                exponential_decay, days, rl_values,
                p0=p0, maxfev=10000,
                bounds=([0, 0], [np.inf, 1.0]),
            )
            perr = np.sqrt(np.diag(pcov))
            return popt[0], popt[1], perr[0], perr[1]
        except RuntimeError:
            pass

    # Fallback: log-linear regression
    valid = rl_values > 0
    if np.sum(valid) < 2:
        return float(max(rl_values)), 1e-4, 0.0, 0.0

    log_rl = np.log(rl_values[valid])
    t_valid = days[valid]
    # Linear fit: log(RL) = log(RL_0) - lambda * t
    coeffs = np.polyfit(t_valid, log_rl, 1)
    lam = -coeffs[0]
    rl_0 = math.exp(coeffs[1])
    return rl_0, max(lam, 1e-6), 0.0, 0.0


# ---------------------------------------------------------------------------
# Multi-factor model
# ---------------------------------------------------------------------------

# Correction factors
TRAFFIC_FACTORS = {
    "low":    1.0,    # < 5000 AADT
    "medium": 1.3,    # 5000-20000 AADT
    "high":   1.8,    # > 20000 AADT
}

WEATHER_FACTORS = {
    "arid":       0.8,
    "temperate":  1.0,
    "tropical":   1.3,
    "monsoon":    1.5,
    "coastal":    1.4,
}

MATERIAL_FACTORS = {
    "engineering":       1.5,   # degrades faster
    "high_intensity":    1.0,   # baseline
    "diamond":           0.7,   # degrades slower
    "high_performance":  0.9,
    "standard":          1.2,
}


def multi_factor_lambda(
    base_lambda: float,
    traffic: str = "medium",
    weather: str = "tropical",
    material: str = "high_intensity",
) -> float:
    """Adjust decay rate with environmental/material factors."""
    tf = TRAFFIC_FACTORS.get(traffic, 1.0)
    wf = WEATHER_FACTORS.get(weather, 1.0)
    mf = MATERIAL_FACTORS.get(material, 1.0)
    return base_lambda * tf * wf * mf


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict_failure_date(
    measurements: List[Dict],
    irc_minimum: float,
    traffic: str = "medium",
    weather: str = "tropical",
    material: str = "high_intensity",
    start_date: Optional[str] = None,
) -> Dict:
    """
    Predict when RL will drop below IRC minimum.

    Parameters
    ----------
    measurements : list of dict
        Each dict must have "day" (int, days since installation) and "rl" (float).
    irc_minimum : float
        IRC minimum threshold (mcd/lx/m^2).
    traffic, weather, material : str
        Correction factor keys.
    start_date : str, optional
        Installation date (YYYY-MM-DD). Defaults to 3 years ago.

    Returns
    -------
    dict
        predicted_failure_date, recommended_maintenance_date, rl_0, lambda,
        days_to_failure, confidence_interval_days.
    """
    days = np.array([m["day"] for m in measurements], dtype=np.float64)
    rl_vals = np.array([m["rl"] for m in measurements], dtype=np.float64)

    # Fit exponential decay
    rl_0, lam_base, rl_0_std, lam_std = fit_exponential_decay(days, rl_vals)

    # Multi-factor adjustment
    lam_adj = multi_factor_lambda(lam_base, traffic, weather, material)

    # Days until RL_0 * exp(-lam * t) = irc_minimum
    # t = -ln(irc_minimum / RL_0) / lam
    if rl_0 <= irc_minimum or lam_adj <= 0:
        days_to_failure = 0.0
    else:
        days_to_failure = -math.log(irc_minimum / rl_0) / lam_adj

    # Confidence interval (propagate lambda uncertainty)
    if lam_std > 0 and rl_0 > irc_minimum:
        lam_low = max(lam_adj - 1.96 * lam_std, 1e-7)
        lam_high = lam_adj + 1.96 * lam_std
        days_high = -math.log(irc_minimum / rl_0) / lam_low   # slower decay -> later failure
        days_low = -math.log(irc_minimum / rl_0) / lam_high   # faster decay -> earlier
        ci_days = (max(days_low, 0), days_high)
    else:
        ci_days = (days_to_failure * 0.8, days_to_failure * 1.2)

    if start_date:
        install_date = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        install_date = datetime.now() - timedelta(days=int(max(days)))

    failure_date = install_date + timedelta(days=days_to_failure)
    # Recommend maintenance 90 days before failure
    maintenance_date = failure_date - timedelta(days=90)

    return {
        "rl_0": round(rl_0, 2),
        "lambda_base": round(lam_base, 8),
        "lambda_adjusted": round(lam_adj, 8),
        "days_to_failure": round(days_to_failure, 1),
        "confidence_interval_days": [round(ci_days[0], 1), round(ci_days[1], 1)],
        "installation_date": install_date.strftime("%Y-%m-%d"),
        "predicted_failure_date": failure_date.strftime("%Y-%m-%d"),
        "recommended_maintenance_date": maintenance_date.strftime("%Y-%m-%d"),
        "irc_minimum": irc_minimum,
        "factors": {"traffic": traffic, "weather": weather, "material": material},
    }


# ---------------------------------------------------------------------------
# Visualization
# ---------------------------------------------------------------------------

def plot_prediction(
    measurements: List[Dict],
    prediction: Dict,
    output_path: str,
):
    """Generate prediction plot with historical data, fitted curve, and projection."""
    days = np.array([m["day"] for m in measurements])
    rl_vals = np.array([m["rl"] for m in measurements])
    rl_0 = prediction["rl_0"]
    lam = prediction["lambda_adjusted"]
    irc_min = prediction["irc_minimum"]
    days_fail = prediction["days_to_failure"]
    ci = prediction["confidence_interval_days"]

    install_date = datetime.strptime(prediction["installation_date"], "%Y-%m-%d")

    # Time arrays
    t_hist = np.linspace(0, max(days), 200)
    t_future = np.linspace(0, days_fail * 1.3, 300)

    fig, ax = plt.subplots(figsize=(12, 6), facecolor="white")

    # Historical data points
    hist_dates = [install_date + timedelta(days=d) for d in days]
    ax.scatter(hist_dates, rl_vals, color="#1E40AF", s=50, zorder=5,
               label="Measured RL", edgecolors="white", linewidth=0.5)

    # Fitted curve (historical range)
    fit_dates = [install_date + timedelta(days=d) for d in t_hist]
    fit_rl = exponential_decay(t_hist, rl_0, lam)
    ax.plot(fit_dates, fit_rl, color="#1E40AF", linewidth=2, label="Fitted decay curve")

    # Future projection
    future_dates = [install_date + timedelta(days=d) for d in t_future]
    future_rl = exponential_decay(t_future, rl_0, lam)
    ax.plot(future_dates, future_rl, color="#F59E0B", linewidth=2, linestyle="--",
            label="Projected decay")

    # Confidence band
    if ci[0] != ci[1]:
        lam_slow = lam * (days_fail / max(ci[1], 1))
        lam_fast = lam * (days_fail / max(ci[0], 1))
        rl_upper = exponential_decay(t_future, rl_0, lam_slow)
        rl_lower = exponential_decay(t_future, rl_0, lam_fast)
        ax.fill_between(future_dates, rl_lower, rl_upper,
                        color="#F59E0B", alpha=0.15, label="95% confidence band")

    # IRC threshold
    ax.axhline(y=irc_min, color="#EF4444", linewidth=2, linestyle="-.",
               label=f"IRC Minimum ({irc_min:.0f} mcd/lx/m\u00b2)")

    # Failure date annotation
    fail_date = datetime.strptime(prediction["predicted_failure_date"], "%Y-%m-%d")
    ax.axvline(x=fail_date, color="#EF4444", linewidth=1.5, linestyle=":",  alpha=0.7)
    ax.annotate(
        f"Predicted failure\n{prediction['predicted_failure_date']}",
        xy=(fail_date, irc_min),
        xytext=(fail_date + timedelta(days=30), irc_min + rl_0 * 0.15),
        fontsize=9, fontweight="bold", color="#EF4444",
        arrowprops=dict(arrowstyle="->", color="#EF4444", lw=1.5),
        bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor="#EF4444"),
    )

    # Maintenance date
    maint_date = datetime.strptime(prediction["recommended_maintenance_date"], "%Y-%m-%d")
    ax.axvline(x=maint_date, color="#22C55E", linewidth=1.5, linestyle=":", alpha=0.7)
    ax.annotate(
        f"Schedule maintenance\n{prediction['recommended_maintenance_date']}",
        xy=(maint_date, irc_min + rl_0 * 0.05),
        xytext=(maint_date - timedelta(days=120), irc_min + rl_0 * 0.30),
        fontsize=9, fontweight="bold", color="#22C55E",
        arrowprops=dict(arrowstyle="->", color="#22C55E", lw=1.5),
        bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor="#22C55E"),
    )

    ax.set_xlabel("Date", fontsize=12)
    ax.set_ylabel("Retroreflectivity RL (mcd/lx/m\u00b2)", fontsize=12)
    ax.set_title("RetroGuard — Retroreflectivity Degradation Prediction", fontsize=14, fontweight="bold")
    ax.legend(loc="upper right", fontsize=9)
    ax.grid(True, alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    fig.autofmt_xdate()

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[info] Prediction plot saved to {output_path}")


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

def generate_simulated_measurements(
    rl_0: float = 350.0,
    lam_true: float = 0.0008,
    n_points: int = 12,
    max_days: int = 1095,
    noise_pct: float = 0.08,
    seed: int = 42,
) -> List[Dict]:
    """Generate simulated historical measurements."""
    rng = np.random.RandomState(seed)
    days = np.sort(rng.uniform(30, max_days, n_points))
    days = np.insert(days, 0, 0)  # include day 0

    measurements = []
    for d in days:
        true_rl = rl_0 * math.exp(-lam_true * d)
        measured = true_rl * (1 + rng.normal(0, noise_pct))
        measurements.append({
            "day": round(float(d), 1),
            "rl": round(max(measured, 1.0), 2),
            "date": (datetime(2023, 4, 1) + timedelta(days=d)).strftime("%Y-%m-%d"),
        })

    return measurements


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="RetroGuard — Degradation Prediction Model",
    )
    parser.add_argument("--data", type=str, default=None,
                        help="JSON file with historical measurements")
    parser.add_argument("--simulate", action="store_true",
                        help="Generate simulated data for demo")
    parser.add_argument("--asset-type", type=str, default="sign")
    parser.add_argument("--material-grade", type=str, default="high_intensity")
    parser.add_argument("--color", type=str, default="white")
    parser.add_argument("--traffic", type=str, default="medium",
                        choices=["low", "medium", "high"])
    parser.add_argument("--weather", type=str, default="tropical",
                        choices=["arid", "temperate", "tropical", "monsoon", "coastal"])
    parser.add_argument("--output-dir", type=str, default=None)
    args = parser.parse_args()

    output_dir = args.output_dir or str(Path(__file__).resolve().parent.parent / "output")
    os.makedirs(output_dir, exist_ok=True)

    # Load or generate measurements
    if args.data:
        with open(args.data, "r") as f:
            data = json.load(f)
        measurements = data if isinstance(data, list) else data.get("measurements", [])
    elif args.simulate or True:  # default to simulate
        print("[info] Generating simulated historical data")
        measurements = generate_simulated_measurements()

    # IRC minimum
    estimator = RetroReflectivityEstimator()
    irc_min = estimator.get_irc_minimum(args.asset_type, args.material_grade, args.color)

    # Predict
    prediction = predict_failure_date(
        measurements, irc_min,
        traffic=args.traffic,
        weather=args.weather,
        material=args.material_grade,
        start_date="2023-04-01",
    )

    # Print results
    print("\n" + "=" * 60)
    print("  RetroGuard — Degradation Prediction Report")
    print("=" * 60)
    print(f"  Initial RL (fitted)         : {prediction['rl_0']:.1f} mcd/lx/m\u00b2")
    print(f"  Base decay rate (lambda)    : {prediction['lambda_base']:.8f} /day")
    print(f"  Adjusted decay rate         : {prediction['lambda_adjusted']:.8f} /day")
    print(f"  Correction factors          :")
    print(f"    Traffic  : {args.traffic} (x{TRAFFIC_FACTORS.get(args.traffic, 1.0):.1f})")
    print(f"    Weather  : {args.weather} (x{WEATHER_FACTORS.get(args.weather, 1.0):.1f})")
    print(f"    Material : {args.material_grade} (x{MATERIAL_FACTORS.get(args.material_grade, 1.0):.1f})")
    print(f"  -------------------------------------------")
    print(f"  IRC Minimum                 : {irc_min:.1f} mcd/lx/m\u00b2")
    print(f"  Days to failure             : {prediction['days_to_failure']:.0f}")
    print(f"  95% CI (days)               : [{prediction['confidence_interval_days'][0]:.0f}, "
          f"{prediction['confidence_interval_days'][1]:.0f}]")
    print(f"  Installation date           : {prediction['installation_date']}")
    print(f"  Predicted failure date       : {prediction['predicted_failure_date']}")
    print(f"  Recommended maintenance     : {prediction['recommended_maintenance_date']}")
    print("=" * 60)

    # Save JSON
    json_path = os.path.join(output_dir, "degradation_prediction.json")
    with open(json_path, "w") as f:
        json.dump({
            "measurements": measurements,
            "prediction": prediction,
        }, f, indent=2, default=str)
    print(f"\n[info] Prediction data saved to {json_path}")

    # Plot
    plot_path = os.path.join(output_dir, "prediction_example.png")
    plot_prediction(measurements, prediction, plot_path)


if __name__ == "__main__":
    main()
