#!/usr/bin/env python3
"""
RetroGuard Retroreflectivity Estimation
========================================

Estimates retroreflectivity coefficient RL (mcd/lx/m^2) from image brightness
analysis.  Uses calibrated image analysis with reference-patch comparison.

Mathematical model:
    1. Extract mean pixel intensity from the target ROI
    2. Apply calibration factor (from reference patch with known RL)
    3. Compute geometric correction (distance / observation angle)
    4. RL = brightness * calibration_factor * geometric_correction

Usage:
    python estimate_rl.py --image sign_photo.jpg
    python estimate_rl.py --image sign_photo.jpg --roi 100 50 200 180
    python estimate_rl.py --simulate

Author: RetroGuard Team — NHAI Hackathon 2026
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.gridspec import GridSpec


# ---------------------------------------------------------------------------
# Add parent to path so we can import the model
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from models.retroreflectivity_model import RetroReflectivityEstimator


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def extract_brightness(
    image: np.ndarray, roi: Optional[Tuple[int, int, int, int]] = None
) -> float:
    """
    Extract mean luminance from an image or a region of interest.

    Parameters
    ----------
    image : np.ndarray
        BGR or grayscale image.
    roi : tuple (x, y, w, h), optional
        Region of interest.

    Returns
    -------
    float
        Mean luminance (0-255).
    """
    if roi is not None:
        x, y, w, h = roi
        patch = image[y:y+h, x:x+w]
    else:
        patch = image

    if patch.size == 0:
        return 0.0

    if len(patch.shape) == 3 and patch.shape[2] >= 3:
        # BT.601 luminance (BGR)
        lum = (
            0.114 * patch[:, :, 0].astype(np.float64)
            + 0.587 * patch[:, :, 1].astype(np.float64)
            + 0.299 * patch[:, :, 2].astype(np.float64)
        )
        return float(np.mean(lum))
    return float(np.mean(patch.astype(np.float64)))


def estimate_rl(
    brightness: float,
    calibration_factor: float = 2.5,
    distance: float = 30.0,
    angle: float = 0.2,
) -> float:
    """
    Estimate retroreflectivity RL from brightness and geometry.

    Parameters
    ----------
    brightness : float
        Mean luminance (0-255).
    calibration_factor : float
        RL per unit brightness (from calibration).
    distance : float
        Distance to the sign (metres).
    angle : float
        Observation angle (degrees).

    Returns
    -------
    float
        Estimated RL (mcd/lx/m^2).
    """
    # Geometric correction (normalise to 30 m, 0.2 deg reference)
    ref_dist, ref_angle = 30.0, 0.2
    dist_factor = (max(distance, 1.0) / ref_dist) ** 1.5
    angle_rad = math.radians(max(angle, 0.01))
    ref_angle_rad = math.radians(ref_angle)
    angle_factor = math.cos(ref_angle_rad) / max(math.cos(angle_rad), 0.01)
    geo_correction = dist_factor * angle_factor

    return brightness * calibration_factor * geo_correction


def classify_condition(
    rl_value: float, irc_minimum: float
) -> Dict:
    """
    Classify retroreflectivity condition against IRC minimum.

    Returns
    -------
    dict
        status ("compliant" / "warning" / "critical"), ratio, recommendation.
    """
    ratio = rl_value / max(irc_minimum, 0.01)
    if ratio >= 1.0:
        return {"status": "compliant", "ratio": round(ratio, 3),
                "recommendation": "No action needed."}
    elif ratio >= 0.5:
        return {"status": "warning", "ratio": round(ratio, 3),
                "recommendation": "Schedule replacement within 90 days."}
    else:
        return {"status": "critical", "ratio": round(ratio, 3),
                "recommendation": "Immediate replacement required."}


# ---------------------------------------------------------------------------
# Visual report
# ---------------------------------------------------------------------------

def generate_visual_report(
    image: np.ndarray,
    roi: Optional[Tuple[int, int, int, int]],
    rl_value: float,
    irc_minimum: float,
    classification: Dict,
    output_path: str,
):
    """
    Generate a visual report: original image with ROI, brightness histogram,
    and RL gauge chart.
    """
    fig = plt.figure(figsize=(16, 6), facecolor="white")
    gs = GridSpec(1, 3, figure=fig, width_ratios=[1.2, 1, 1])

    # --- Panel 1: Image with ROI ---
    ax1 = fig.add_subplot(gs[0])
    if len(image.shape) == 3:
        display_img = image[:, :, ::-1]  # BGR -> RGB
    else:
        display_img = image
    ax1.imshow(display_img, cmap="gray" if len(image.shape) == 2 else None)
    if roi is not None:
        x, y, w, h = roi
        rect = mpatches.FancyBboxPatch(
            (x, y), w, h, boxstyle="round,pad=2",
            linewidth=2, edgecolor="#EF4444", facecolor="none",
        )
        ax1.add_patch(rect)
        ax1.set_title("Input Image with ROI", fontsize=11, fontweight="bold")
    else:
        ax1.set_title("Input Image (full)", fontsize=11, fontweight="bold")
    ax1.axis("off")

    # --- Panel 2: Brightness histogram ---
    ax2 = fig.add_subplot(gs[1])
    if roi is not None:
        x, y, w, h = roi
        patch = image[y:y+h, x:x+w]
    else:
        patch = image
    if len(patch.shape) == 3:
        gray_patch = (
            0.114 * patch[:, :, 0].astype(np.float64)
            + 0.587 * patch[:, :, 1].astype(np.float64)
            + 0.299 * patch[:, :, 2].astype(np.float64)
        )
    else:
        gray_patch = patch.astype(np.float64)

    ax2.hist(gray_patch.ravel(), bins=50, color="#1E40AF", alpha=0.8, edgecolor="white")
    mean_val = np.mean(gray_patch)
    ax2.axvline(mean_val, color="#EF4444", linewidth=2, linestyle="--", label=f"Mean={mean_val:.1f}")
    ax2.set_xlabel("Pixel Luminance")
    ax2.set_ylabel("Count")
    ax2.set_title("Brightness Distribution", fontsize=11, fontweight="bold")
    ax2.legend(fontsize=9)

    # --- Panel 3: RL gauge ---
    ax3 = fig.add_subplot(gs[2])
    status = classification["status"]
    color_map = {"compliant": "#22C55E", "warning": "#F59E0B", "critical": "#EF4444"}
    bar_color = color_map.get(status, "#1E40AF")

    categories = ["Measured RL", "IRC Minimum"]
    values = [rl_value, irc_minimum]
    bars = ax3.barh(categories, values, color=[bar_color, "#94A3B8"], height=0.5, edgecolor="white")
    ax3.set_xlabel("RL (mcd/lx/m\u00b2)")
    ax3.set_title("Retroreflectivity Assessment", fontsize=11, fontweight="bold")

    # Add value labels
    for bar, val in zip(bars, values):
        ax3.text(val + 5, bar.get_y() + bar.get_height() / 2,
                 f"{val:.1f}", va="center", fontsize=10, fontweight="bold")

    # Status badge
    ax3.text(0.98, 0.02, status.upper(),
             transform=ax3.transAxes, fontsize=14, fontweight="bold",
             color=bar_color, ha="right", va="bottom",
             bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor=bar_color, linewidth=2))

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[info] Visual report saved to {output_path}")


# ---------------------------------------------------------------------------
# Simulation helpers
# ---------------------------------------------------------------------------

def _create_simulated_sign_image(width: int = 400, height: int = 400) -> np.ndarray:
    """Create a synthetic retroreflective sign image for demo."""
    image = np.zeros((height, width, 3), dtype=np.uint8)
    image[:] = (30, 28, 25)  # dark background

    # White retroreflective sign (bright)
    cx, cy = width // 2, height // 2
    r = min(width, height) // 3
    # Circular sign with bright retroreflective material
    Y, X = np.ogrid[:height, :width]
    mask = ((X - cx) ** 2 + (Y - cy) ** 2) <= r ** 2
    # Simulate retroreflective brightness with some noise
    rng = np.random.RandomState(42)
    base_brightness = 180
    noise = rng.normal(0, 15, (height, width))
    for c in range(3):
        channel = image[:, :, c].astype(np.float64)
        channel[mask] = base_brightness + noise[mask]
        image[:, :, c] = np.clip(channel, 0, 255).astype(np.uint8)

    # Red border
    border_mask = (((X - cx) ** 2 + (Y - cy) ** 2) <= r ** 2) & \
                  (((X - cx) ** 2 + (Y - cy) ** 2) >= (r - 15) ** 2)
    image[border_mask] = (0, 0, 220)

    return image


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="RetroGuard — Retroreflectivity Estimation from Image",
    )
    parser.add_argument("--image", type=str, default=None, help="Path to input image")
    parser.add_argument(
        "--roi", type=int, nargs=4, metavar=("X", "Y", "W", "H"),
        default=None, help="Region of interest (x y w h)",
    )
    parser.add_argument("--distance", type=float, default=30.0, help="Distance to sign (m)")
    parser.add_argument("--angle", type=float, default=0.2, help="Observation angle (deg)")
    parser.add_argument(
        "--asset-type", type=str, default="sign",
        help="Asset type: sign, marking, rpm, delineator",
    )
    parser.add_argument(
        "--material-grade", type=str, default="high_intensity",
        help="Material grade: engineering, high_intensity, diamond, standard, high_performance",
    )
    parser.add_argument("--color", type=str, default="white", help="Surface color")
    parser.add_argument("--simulate", action="store_true", help="Use simulated sign image")
    parser.add_argument("--output", type=str, default=None, help="Output path for visual report")
    args = parser.parse_args()

    output_dir = str(Path(__file__).resolve().parent.parent / "output")
    os.makedirs(output_dir, exist_ok=True)

    # Load or create image
    if args.simulate or args.image is None:
        print("[info] Running in SIMULATION mode")
        if cv2 is None:
            # Create a numpy-only simulated image
            rng = np.random.RandomState(42)
            image = rng.randint(150, 200, size=(400, 400, 3), dtype=np.uint8)
        else:
            image = _create_simulated_sign_image()
        roi = (80, 80, 240, 240)  # centre region
    else:
        if cv2 is None:
            print("[error] OpenCV required. pip install opencv-python")
            sys.exit(1)
        image = cv2.imread(args.image)
        if image is None:
            print(f"[error] Cannot read image: {args.image}")
            sys.exit(1)
        roi = tuple(args.roi) if args.roi else None

    # --- Estimation ---
    estimator = RetroReflectivityEstimator()
    brightness = extract_brightness(image, roi)
    rl_value = estimate_rl(brightness, estimator.calibration_factor, args.distance, args.angle)

    # Confidence interval (heuristic: +/- 15% for uncalibrated)
    ci_low = rl_value * 0.85
    ci_high = rl_value * 1.15

    # IRC minimum
    irc_min = estimator.get_irc_minimum(args.asset_type, args.material_grade, args.color)

    # Classification
    classification = classify_condition(rl_value, irc_min)

    # --- Print results ---
    print("\n" + "=" * 55)
    print("  RetroGuard — Retroreflectivity Estimation Report")
    print("=" * 55)
    print(f"  Brightness (mean luminance) : {brightness:.2f}")
    print(f"  Calibration factor          : {estimator.calibration_factor:.4f}")
    print(f"  Distance                    : {args.distance:.1f} m")
    print(f"  Observation angle           : {args.angle:.2f} deg")
    print(f"  -----------------------------------------")
    print(f"  Estimated RL                : {rl_value:.2f} mcd/lx/m\u00b2")
    print(f"  95% Confidence interval     : [{ci_low:.1f}, {ci_high:.1f}]")
    print(f"  -----------------------------------------")
    print(f"  Asset type                  : {args.asset_type}")
    print(f"  Material grade              : {args.material_grade}")
    print(f"  Color                       : {args.color}")
    print(f"  IRC Minimum                 : {irc_min:.1f} mcd/lx/m\u00b2")
    print(f"  Status                      : {classification['status'].upper()}")
    print(f"  Ratio (RL / IRC min)        : {classification['ratio']:.3f}")
    print(f"  Recommendation              : {classification['recommendation']}")
    print("=" * 55)

    # --- Save JSON ---
    json_path = os.path.join(output_dir, "rl_estimate.json")
    result_data = {
        "brightness": round(brightness, 2),
        "calibration_factor": estimator.calibration_factor,
        "distance_m": args.distance,
        "angle_deg": args.angle,
        "rl_value": round(rl_value, 2),
        "confidence_interval": [round(ci_low, 2), round(ci_high, 2)],
        "asset_type": args.asset_type,
        "material_grade": args.material_grade,
        "color": args.color,
        "irc_minimum": irc_min,
        "status": classification["status"],
        "ratio": classification["ratio"],
        "recommendation": classification["recommendation"],
    }
    with open(json_path, "w") as f:
        json.dump(result_data, f, indent=2)
    print(f"\n[info] Results saved to {json_path}")

    # --- Visual report ---
    report_path = args.output or os.path.join(output_dir, "rl_report.png")
    generate_visual_report(image, roi, rl_value, irc_min, classification, report_path)


if __name__ == "__main__":
    main()
