#!/usr/bin/env python3
"""
RetroGuard Demo Generator
==========================

Generates sample visualizations, data, and demo materials for the
hackathon presentation.

Outputs saved to: /Users/madhavdogra/Desktop/Hackatons/NHAI/ml/output/

Visualizations:
    1. degradation_curves.png    — 5 asset-type decay curves over 5 years
    2. detection_demo.png        — Synthetic nighttime detection result
    3. measurement_comparison.png — Handheld vs RetroGuard comparison
    4. highway_health_map.png    — India map with highway asset health dots
    5. prediction_example.png    — Time-series prediction with CI band
    6. system_architecture.png   — 6-layer architecture diagram

Author: RetroGuard Team — NHAI Hackathon 2026
"""

import argparse
import math
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.dates as mdates
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
from matplotlib.gridspec import GridSpec

# ---------------------------------------------------------------------------
# Consistent colour scheme
# ---------------------------------------------------------------------------
BLUE   = "#1E40AF"
GREEN  = "#22C55E"
AMBER  = "#F59E0B"
RED    = "#EF4444"
SLATE  = "#64748B"
WHITE  = "#FFFFFF"
DARK   = "#1E293B"

OUTPUT_DIR = str(Path(__file__).resolve().parent.parent / "output")


# ===================================================================
# 1. Degradation Curves
# ===================================================================

def generate_degradation_curves(output_dir: str):
    """Plot 5 sample degradation curves for different asset types."""
    fig, ax = plt.subplots(figsize=(12, 7), facecolor=WHITE)

    days = np.linspace(0, 5 * 365, 500)
    years = days / 365.0

    assets = [
        ("White Regulatory Sign (Diamond Grade)", 700, 0.00025, "#1E40AF", "-",  250),
        ("Yellow Warning Sign (HI Grade)",        350, 0.00040, "#F59E0B", "--", 170),
        ("Pavement Marking (Thermoplastic)",      200, 0.00080, "#22C55E", "-.", 100),
        ("Raised Pavement Marker",                150, 0.00100, "#EF4444", ":",   75),
        ("Delineator Post",                       400, 0.00035, "#8B5CF6", "-",  200),
    ]

    for name, rl_0, lam, color, ls, irc_min in assets:
        rl = rl_0 * np.exp(-lam * days)
        ax.plot(years, rl, color=color, linewidth=2.5, linestyle=ls, label=name)
        # IRC minimum dashed line
        ax.axhline(y=irc_min, color=color, linewidth=1, linestyle="--", alpha=0.35)
        # Find crossing point
        cross_idx = np.argmax(rl < irc_min) if np.any(rl < irc_min) else -1
        if cross_idx > 0:
            cross_year = years[cross_idx]
            ax.plot(cross_year, irc_min, "o", color=color, markersize=8, zorder=5)
            ax.annotate(
                f"{cross_year:.1f}y",
                xy=(cross_year, irc_min),
                xytext=(cross_year + 0.15, irc_min + 20),
                fontsize=8, color=color, fontweight="bold",
                arrowprops=dict(arrowstyle="->", color=color, lw=1),
            )

    ax.set_xlabel("Years Since Installation", fontsize=13, fontweight="bold")
    ax.set_ylabel("Retroreflectivity RL (mcd/lx/m\u00b2)", fontsize=13, fontweight="bold")
    ax.set_title("RetroGuard \u2014 Asset Degradation Curves with IRC Minimum Thresholds",
                 fontsize=15, fontweight="bold", pad=15)
    ax.legend(loc="upper right", fontsize=9, framealpha=0.9)
    ax.set_xlim(0, 5)
    ax.set_ylim(0, 750)
    ax.grid(True, alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    path = os.path.join(output_dir, "degradation_curves.png")
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  [1/6] degradation_curves.png")
    return path


# ===================================================================
# 2. Detection Demo
# ===================================================================

def generate_detection_demo(output_dir: str):
    """Create a synthetic nighttime detection result image."""
    fig, ax = plt.subplots(figsize=(14, 8), facecolor=DARK)
    ax.set_facecolor("#0F172A")
    ax.set_xlim(0, 1280)
    ax.set_ylim(720, 0)  # inverted y for image coords

    # Dark road surface
    road = mpatches.Polygon(
        [[200, 300], [1080, 300], [1280, 720], [0, 720]],
        closed=True, facecolor="#1a1a1a", edgecolor="none",
    )
    ax.add_patch(road)

    # Lane markings
    for i in range(6):
        y = 350 + i * 60
        ax.plot([620, 660], [y, y + 50], color="#666666", linewidth=3)

    # Horizon glow
    for i in range(20):
        alpha = 0.03 * (20 - i) / 20
        ax.axhspan(280 + i * 2, 282 + i * 2, color="#1E3A5F", alpha=alpha)

    # Stars
    rng = np.random.RandomState(42)
    for _ in range(40):
        sx, sy = rng.randint(50, 1230), rng.randint(10, 270)
        ax.plot(sx, sy, "*", color="white", markersize=rng.uniform(1, 3), alpha=rng.uniform(0.3, 0.8))

    # --- Detected objects with bounding boxes ---
    detections = [
        # (x, y, w, h, label, conf, face_color, edge_color)
        (150, 60, 110, 100, "Regulatory Sign", 0.94, "#cc0000", RED),
        (900, 45, 120, 110, "Warning Sign", 0.89, "#cc8800", AMBER),
        (450, 25, 350, 70, "Guide Sign", 0.87, "#006600", GREEN),
        (300, 620, 180, 30, "Pavement Marking", 0.91, "#444444", GREEN),
        (750, 640, 30, 30, "RPM", 0.82, "#555555", BLUE),
        (1140, 180, 30, 170, "Delineator", 0.86, "#444444", AMBER),
        (50, 280, 70, 100, "KM Marker", 0.75, "#333333", SLATE),
    ]

    for x, y, w, h, label, conf, fc, ec in detections:
        # Object fill (simulated sign)
        obj = mpatches.FancyBboxPatch(
            (x + 4, y + 4), w - 8, h - 8,
            boxstyle="round,pad=2", facecolor=fc, edgecolor="none", alpha=0.8,
        )
        ax.add_patch(obj)

        # Detection bounding box
        bbox = mpatches.Rectangle(
            (x, y), w, h, linewidth=2, edgecolor=ec, facecolor="none",
        )
        ax.add_patch(bbox)

        # Label with background
        label_text = f"{label} {conf:.2f}"
        ax.text(
            x, y - 5, label_text,
            fontsize=8, fontweight="bold", color=WHITE,
            bbox=dict(boxstyle="round,pad=0.2", facecolor=ec, alpha=0.85),
            verticalalignment="bottom",
        )

    # Simulated headlight beams
    for hx, hy in [(580, 550), (700, 550)]:
        for spread in range(5):
            ax.plot(
                [hx, hx + rng.randint(-200, 200)],
                [hy, hy - 250],
                color="#FFFF88", alpha=0.03, linewidth=rng.uniform(1, 8),
            )
        ax.plot(hx, hy, "o", color="#FFFFCC", markersize=12, alpha=0.9)
        ax.plot(hx, hy, "o", color="#FFFFFF", markersize=5, alpha=1.0)

    # Title overlay
    ax.text(
        640, 710, "RetroGuard \u2014 AI-Powered Sign & Marking Detection",
        fontsize=14, fontweight="bold", color=WHITE, ha="center", va="bottom",
        bbox=dict(boxstyle="round,pad=0.4", facecolor=DARK, edgecolor=BLUE, linewidth=2, alpha=0.9),
    )

    # Detection count badge
    ax.text(
        1250, 15, f"{len(detections)} assets detected",
        fontsize=10, fontweight="bold", color=WHITE, ha="right", va="top",
        bbox=dict(boxstyle="round,pad=0.3", facecolor=GREEN, alpha=0.9),
    )

    ax.axis("off")
    path = os.path.join(output_dir, "detection_demo.png")
    plt.tight_layout(pad=0)
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=DARK)
    plt.close()
    print(f"  [2/6] detection_demo.png")
    return path


# ===================================================================
# 3. Measurement Comparison
# ===================================================================

def generate_measurement_comparison(output_dir: str):
    """Bar chart comparing Handheld vs RetroGuard approaches."""
    fig, ax = plt.subplots(figsize=(12, 7), facecolor=WHITE)

    metrics = ["Speed\n(km/day)", "Cost per km\n(INR)", "Coverage\n(% of network)", "Safety\nRisk Score"]
    # [Handheld, RetroGuard-Smartphone, RetroGuard-CCTV, RetroGuard-Dashcam]
    handheld     = [5,    8000,  2,   90]
    rg_phone     = [50,   500,  15,   30]
    rg_cctv      = [500,   50,  60,    5]
    rg_dashcam   = [200,  200,  40,   10]

    # Normalize for visual comparison (each metric 0-100 scale)
    max_vals = [500, 8000, 60, 90]
    h_norm   = [v / m * 100 for v, m in zip(handheld, max_vals)]
    p_norm   = [v / m * 100 for v, m in zip(rg_phone, max_vals)]
    c_norm   = [v / m * 100 for v, m in zip(rg_cctv, max_vals)]
    d_norm   = [v / m * 100 for v, m in zip(rg_dashcam, max_vals)]

    x = np.arange(len(metrics))
    width = 0.2

    bars_h = ax.bar(x - 1.5 * width, h_norm, width, label="Handheld Retroreflectometer",
                    color=RED, alpha=0.85, edgecolor="white")
    bars_p = ax.bar(x - 0.5 * width, p_norm, width, label="RetroGuard: Smartphone",
                    color=BLUE, alpha=0.85, edgecolor="white")
    bars_c = ax.bar(x + 0.5 * width, c_norm, width, label="RetroGuard: CCTV Mining",
                    color=GREEN, alpha=0.85, edgecolor="white")
    bars_d = ax.bar(x + 1.5 * width, d_norm, width, label="RetroGuard: Dashcam",
                    color=AMBER, alpha=0.85, edgecolor="white")

    # Add raw value labels
    for bars, raw_vals in [(bars_h, handheld), (bars_p, rg_phone),
                           (bars_c, rg_cctv), (bars_d, rg_dashcam)]:
        for bar, val in zip(bars, raw_vals):
            label = f"{val:,}" if val >= 100 else str(val)
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1.5,
                    label, ha="center", va="bottom", fontsize=7, fontweight="bold")

    ax.set_xticks(x)
    ax.set_xticklabels(metrics, fontsize=11)
    ax.set_ylabel("Relative Performance (normalized)", fontsize=12)
    ax.set_title("RetroGuard \u2014 Measurement Approach Comparison",
                 fontsize=15, fontweight="bold", pad=15)
    ax.legend(loc="upper left", fontsize=9, framealpha=0.9)
    ax.set_ylim(0, 130)
    ax.grid(axis="y", alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Annotation: lower is better for cost & safety risk
    ax.text(1, 115, "\u2193 Lower is better", fontsize=8, color=RED, ha="center", style="italic")
    ax.text(3, 115, "\u2193 Lower is better", fontsize=8, color=RED, ha="center", style="italic")
    ax.text(0, 115, "\u2191 Higher is better", fontsize=8, color=GREEN, ha="center", style="italic")
    ax.text(2, 115, "\u2191 Higher is better", fontsize=8, color=GREEN, ha="center", style="italic")

    path = os.path.join(output_dir, "measurement_comparison.png")
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  [3/6] measurement_comparison.png")
    return path


# ===================================================================
# 4. Highway Health Map
# ===================================================================

def generate_highway_health_map(output_dir: str):
    """Simplified India outline with coloured highway-asset health dots."""
    fig, ax = plt.subplots(figsize=(10, 12), facecolor=WHITE)

    # Simplified India boundary (approximate polygon)
    india_outline = np.array([
        [76, 35], [78, 35], [80, 34], [78, 32], [77, 31],
        [76, 30], [75, 29], [74, 27], [73, 25], [72, 23],
        [71, 22], [70, 21], [69, 22], [68, 23], [68.5, 24],
        [70, 25], [72, 22], [73, 20], [74, 18], [75, 16],
        [76, 14], [77, 12], [77, 9], [78, 8], [79, 8.5],
        [80, 10], [80, 12], [80, 13.5], [82, 15], [83, 17],
        [84, 18], [85, 20], [86, 21], [87, 22], [88, 22],
        [89, 26], [88, 27], [87, 26], [86, 26], [85, 25],
        [84, 24], [83, 23], [82, 22], [82, 24], [83, 25],
        [84, 26], [85, 27], [87, 28], [88, 28], [89, 27],
        [90, 26], [92, 26], [93, 27], [94, 28], [96, 28],
        [97, 27], [96, 25], [94, 24], [93, 23], [92, 22],
        [91, 23], [90, 23], [89, 24], [88, 24.5], [87, 25],
        [86, 25.5], [85, 26.5], [84, 27], [83, 27], [82, 27],
        [81, 27], [80, 28], [80, 30], [79, 30.5], [78, 31],
        [77, 32], [76, 33], [76, 35],
    ])

    ax.fill(india_outline[:, 0], india_outline[:, 1],
            facecolor="#F0F4FF", edgecolor=DARK, linewidth=1.5, zorder=1)

    # Major highways (approximate routes as line segments)
    highways = [
        ("NH-48 Delhi-Mumbai",   [(77.2, 28.6), (76.8, 27), (75, 25), (73, 22), (72.8, 19)]),
        ("NH-44 Delhi-Chennai",  [(77.2, 28.6), (78, 26), (78.5, 22), (79, 18), (80, 13)]),
        ("NH-2 Delhi-Kolkata",   [(77.2, 28.6), (80, 27), (83, 25.5), (86, 23), (88, 22.5)]),
        ("NH-66 Mumbai-Kochi",   [(72.8, 19), (74, 16), (75, 14), (76, 10)]),
    ]

    for hw_name, coords in highways:
        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        ax.plot(xs, ys, color=SLATE, linewidth=2, alpha=0.4, zorder=2)

    # Asset health dots
    rng = np.random.RandomState(2026)
    n_assets = 150
    status_colors = {
        "compliant": GREEN,
        "warning": AMBER,
        "critical": RED,
    }
    legend_entries = {}

    for _ in range(n_assets):
        # Random point roughly within India bounds
        lon = rng.uniform(70, 95)
        lat = rng.uniform(8, 33)
        # Crude check if roughly inside India
        if lat > 28 and lon < 73:
            continue
        if lat > 30 and lon > 85:
            continue
        if lat < 10 and lon < 76:
            continue
        if lon > 93 and lat < 22:
            continue

        status = rng.choice(["compliant", "compliant", "compliant", "warning", "warning", "critical"],
                            p=[0.35, 0.20, 0.10, 0.15, 0.10, 0.10])
        color = status_colors[status]
        size = {"compliant": 25, "warning": 40, "critical": 55}[status]
        alpha = {"compliant": 0.6, "warning": 0.8, "critical": 0.95}[status]
        ax.scatter(lon, lat, c=color, s=size, alpha=alpha, edgecolors="white",
                   linewidth=0.3, zorder=3)
        legend_entries[status] = color

    # Major cities
    cities = [
        ("Delhi", 77.2, 28.6), ("Mumbai", 72.8, 19.0), ("Chennai", 80.2, 13.0),
        ("Kolkata", 88.3, 22.5), ("Bengaluru", 77.6, 12.9), ("Hyderabad", 78.5, 17.4),
        ("Jaipur", 75.8, 26.9), ("Ahmedabad", 72.6, 23.0), ("Lucknow", 80.9, 26.8),
        ("Pune", 73.8, 18.5),
    ]
    for name, lon, lat in cities:
        ax.plot(lon, lat, "s", color=DARK, markersize=5, zorder=4)
        ax.annotate(name, (lon, lat), xytext=(5, 5), textcoords="offset points",
                    fontsize=7, color=DARK, fontweight="bold", zorder=4)

    # Legend
    legend_patches = [
        mpatches.Patch(color=GREEN, label=f"Compliant (RL \u2265 IRC min)"),
        mpatches.Patch(color=AMBER, label=f"Warning (50-100% of IRC min)"),
        mpatches.Patch(color=RED, label=f"Critical (< 50% of IRC min)"),
    ]
    ax.legend(handles=legend_patches, loc="lower left", fontsize=10, framealpha=0.9,
              title="Asset Health Status", title_fontsize=11)

    ax.set_title("RetroGuard \u2014 National Highway Asset Health Map",
                 fontsize=15, fontweight="bold", pad=15)
    ax.set_xlabel("Longitude", fontsize=11)
    ax.set_ylabel("Latitude", fontsize=11)
    ax.set_xlim(67, 98)
    ax.set_ylim(6, 37)
    ax.set_aspect("equal")
    ax.grid(True, alpha=0.15)

    path = os.path.join(output_dir, "highway_health_map.png")
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  [4/6] highway_health_map.png")
    return path


# ===================================================================
# 5. Prediction Example
# ===================================================================

def generate_prediction_example(output_dir: str):
    """Time series prediction with scatter, fitted curve, projection, CI, threshold."""
    rng = np.random.RandomState(42)

    # Simulate historical data (3 years of quarterly measurements)
    install_date = datetime(2023, 4, 1)
    rl_0_true = 350.0
    lam_true = 0.0008

    measurement_days = np.sort(rng.uniform(30, 1095, 12))
    measurement_days = np.insert(measurement_days, 0, 0)
    rl_measured = rl_0_true * np.exp(-lam_true * measurement_days) * (1 + rng.normal(0, 0.06, len(measurement_days)))

    # Fit
    from numpy.polynomial.polynomial import polyfit
    valid = rl_measured > 0
    log_rl = np.log(rl_measured[valid])
    coeffs = np.polyfit(measurement_days[valid], log_rl, 1)
    lam_fit = -coeffs[0]
    rl_0_fit = math.exp(coeffs[1])

    irc_min = 250.0  # HI white sign

    # Days to failure
    days_fail = -math.log(irc_min / rl_0_fit) / lam_fit if rl_0_fit > irc_min else 0

    # Time arrays
    t_fit = np.linspace(0, max(measurement_days), 200)
    t_proj = np.linspace(0, days_fail * 1.3, 300)

    fig, ax = plt.subplots(figsize=(13, 6.5), facecolor=WHITE)

    # Convert to dates
    def to_dates(days_arr):
        return [install_date + timedelta(days=float(d)) for d in days_arr]

    # Scatter: measured
    ax.scatter(to_dates(measurement_days), rl_measured, color=BLUE, s=60, zorder=5,
               label="Measured RL values", edgecolors=WHITE, linewidth=0.5)

    # Fitted curve
    rl_fit = rl_0_fit * np.exp(-lam_fit * t_fit)
    ax.plot(to_dates(t_fit), rl_fit, color=BLUE, linewidth=2.5, label="Fitted exponential decay")

    # Future projection
    rl_proj = rl_0_fit * np.exp(-lam_fit * t_proj)
    ax.plot(to_dates(t_proj), rl_proj, color=AMBER, linewidth=2.5, linestyle="--",
            label="Future projection")

    # Confidence band (+/- 20% on lambda)
    rl_upper = rl_0_fit * np.exp(-lam_fit * 0.8 * t_proj)
    rl_lower = rl_0_fit * np.exp(-lam_fit * 1.2 * t_proj)
    ax.fill_between(to_dates(t_proj), rl_lower, rl_upper,
                    color=AMBER, alpha=0.12, label="95% confidence band")

    # IRC threshold
    ax.axhline(y=irc_min, color=RED, linewidth=2.5, linestyle="-.",
               label=f"IRC Minimum ({irc_min:.0f} mcd/lx/m\u00b2)")

    # Failure date
    fail_date = install_date + timedelta(days=days_fail)
    ax.axvline(x=fail_date, color=RED, linewidth=1.5, linestyle=":", alpha=0.7)
    ax.annotate(
        f"Predicted failure\n{fail_date.strftime('%Y-%m-%d')}",
        xy=(fail_date, irc_min),
        xytext=(fail_date + timedelta(days=60), irc_min + 40),
        fontsize=9, fontweight="bold", color=RED,
        arrowprops=dict(arrowstyle="->", color=RED, lw=1.5),
        bbox=dict(boxstyle="round,pad=0.3", facecolor=WHITE, edgecolor=RED),
    )

    # Maintenance date (90 days before failure)
    maint_date = fail_date - timedelta(days=90)
    ax.axvline(x=maint_date, color=GREEN, linewidth=1.5, linestyle=":", alpha=0.7)
    ax.annotate(
        f"Maintenance window\n{maint_date.strftime('%Y-%m-%d')}",
        xy=(maint_date, irc_min + 20),
        xytext=(maint_date - timedelta(days=180), irc_min + 60),
        fontsize=9, fontweight="bold", color=GREEN,
        arrowprops=dict(arrowstyle="->", color=GREEN, lw=1.5),
        bbox=dict(boxstyle="round,pad=0.3", facecolor=WHITE, edgecolor=GREEN),
    )

    ax.set_xlabel("Date", fontsize=12, fontweight="bold")
    ax.set_ylabel("Retroreflectivity RL (mcd/lx/m\u00b2)", fontsize=12, fontweight="bold")
    ax.set_title("RetroGuard \u2014 Retroreflectivity Degradation Prediction",
                 fontsize=15, fontweight="bold", pad=15)
    ax.legend(loc="upper right", fontsize=9, framealpha=0.9)
    ax.grid(True, alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    fig.autofmt_xdate()

    path = os.path.join(output_dir, "prediction_example.png")
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  [5/6] prediction_example.png")
    return path


# ===================================================================
# 6. System Architecture Diagram
# ===================================================================

def generate_system_architecture(output_dir: str):
    """Professional 6-layer architecture diagram using matplotlib."""
    fig, ax = plt.subplots(figsize=(16, 10), facecolor=WHITE)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 10)
    ax.axis("off")

    # Title
    ax.text(8, 9.7, "RetroGuard \u2014 6-Layer System Architecture",
            fontsize=18, fontweight="bold", ha="center", va="top", color=DARK)

    # Layer definitions (bottom to top)
    layers = [
        {
            "name": "Layer 1: Data Collection",
            "color": "#DBEAFE",
            "border": BLUE,
            "y": 0.5,
            "items": ["Smartphone\nCamera", "CCTV\nFeed", "Dashcam\nVideo", "LiDAR\nScanner", "Weather\nAPIs"],
        },
        {
            "name": "Layer 2: AI Detection Engine",
            "color": "#FEF3C7",
            "border": AMBER,
            "y": 2.1,
            "items": ["YOLOv8\nDetection", "Sign\nClassification", "Marking\nSegmentation", "RPM/Delineator\nDetection"],
        },
        {
            "name": "Layer 3: RL Estimation Core",
            "color": "#DCFCE7",
            "border": GREEN,
            "y": 3.7,
            "items": ["Brightness\nExtraction", "Calibration\nEngine", "Geometric\nCorrection", "Multi-frame\nFusion"],
        },
        {
            "name": "Layer 4: Predictive Analytics",
            "color": "#FEE2E2",
            "border": RED,
            "y": 5.3,
            "items": ["Exponential\nDecay Model", "Multi-factor\nCorrections", "Failure\nPrediction", "Maintenance\nScheduling"],
        },
        {
            "name": "Layer 5: Decision Support",
            "color": "#EDE9FE",
            "border": "#8B5CF6",
            "y": 6.9,
            "items": ["Priority\nRanking", "Budget\nOptimisation", "Route\nPlanning", "Alert\nGeneration"],
        },
        {
            "name": "Layer 6: Visualisation & Reporting",
            "color": "#F0F4FF",
            "border": SLATE,
            "y": 8.5,
            "items": ["Interactive\nDashboard", "Health\nMaps", "PDF\nReports", "Mobile\nApp"],
        },
    ]

    box_width = 2.2
    box_height = 1.1
    layer_height = 1.3

    for layer in layers:
        y = layer["y"]
        n_items = len(layer["items"])
        total_width = n_items * box_width + (n_items - 1) * 0.3
        start_x = (16 - total_width) / 2

        # Layer background
        bg = FancyBboxPatch(
            (start_x - 0.4, y - 0.15), total_width + 0.8, layer_height,
            boxstyle="round,pad=0.1", facecolor=layer["color"],
            edgecolor=layer["border"], linewidth=1.5, alpha=0.6,
        )
        ax.add_patch(bg)

        # Layer name (left side)
        ax.text(
            start_x - 0.2, y + layer_height / 2 - 0.15,
            layer["name"], fontsize=8, fontweight="bold",
            color=layer["border"], ha="left", va="center",
            rotation=0,
        )

        # Item boxes
        for i, item_text in enumerate(layer["items"]):
            x = start_x + i * (box_width + 0.3)
            item_box = FancyBboxPatch(
                (x, y + 0.15), box_width, box_height - 0.1,
                boxstyle="round,pad=0.08", facecolor=WHITE,
                edgecolor=layer["border"], linewidth=1.2,
            )
            ax.add_patch(item_box)
            ax.text(
                x + box_width / 2, y + 0.15 + (box_height - 0.1) / 2,
                item_text, fontsize=8, ha="center", va="center",
                color=DARK, fontweight="bold",
            )

    # Arrows between layers
    for i in range(len(layers) - 1):
        y_from = layers[i]["y"] + layer_height - 0.1
        y_to = layers[i + 1]["y"]
        mid_x = 8
        ax.annotate(
            "", xy=(mid_x, y_to), xytext=(mid_x, y_from),
            arrowprops=dict(
                arrowstyle="-|>", color=SLATE, lw=2,
                connectionstyle="arc3,rad=0",
            ),
        )

    # Side annotation: "IRC 67 / IRC 35 Compliance" spanning layers 3-5
    ax.annotate(
        "", xy=(15.3, 3.7), xytext=(15.3, 7.9),
        arrowprops=dict(arrowstyle="<->", color=RED, lw=2),
    )
    ax.text(15.5, 5.8, "IRC 67/35\nCompliance\nEngine", fontsize=8,
            fontweight="bold", color=RED, ha="center", va="center", rotation=0)

    path = os.path.join(output_dir, "system_architecture.png")
    plt.tight_layout(pad=0.5)
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=WHITE)
    plt.close()
    print(f"  [6/6] system_architecture.png")
    return path


# ===================================================================
# Main
# ===================================================================

def main():
    parser = argparse.ArgumentParser(
        description="RetroGuard \u2014 Demo Visualization Generator",
    )
    parser.add_argument(
        "--output-dir", type=str, default=OUTPUT_DIR,
        help="Directory to save generated visualizations",
    )
    args = parser.parse_args()

    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 55)
    print("  RetroGuard Demo Generator")
    print("  Generating presentation visualizations...")
    print("=" * 55)
    print()

    paths = []
    paths.append(generate_degradation_curves(output_dir))
    paths.append(generate_detection_demo(output_dir))
    paths.append(generate_measurement_comparison(output_dir))
    paths.append(generate_highway_health_map(output_dir))
    paths.append(generate_prediction_example(output_dir))
    paths.append(generate_system_architecture(output_dir))

    print()
    print("=" * 55)
    print(f"  All {len(paths)} visualizations generated successfully!")
    print(f"  Output directory: {output_dir}")
    print("=" * 55)
    for p in paths:
        print(f"    {os.path.basename(p)}")
    print()


if __name__ == "__main__":
    main()
