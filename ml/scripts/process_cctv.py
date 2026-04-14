#!/usr/bin/env python3
"""
RetroGuard CCTV Mining Pipeline
================================

Processes nighttime CCTV footage to extract sign retroreflectivity from
vehicle headlight illumination events.

Pipeline per frame:
    1. Detect bright regions (headlights) via thresholding
    2. Detect sign regions (colour/shape analysis or YOLO)
    3. Measure sign brightness when headlights are nearby
    4. Record: frame_number, timestamp, sign_roi, brightness, headlight_distance

Aggregate measurements use the median for robustness against outliers.

Usage:
    python process_cctv.py --video footage.mp4
    python process_cctv.py --simulate --n-frames 300
    python process_cctv.py --simulate --n-signs 4 --n-frames 500

Author: RetroGuard Team — NHAI Hackathon 2026
"""

import argparse
import csv
import json
import math
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

# Add parent to path for model import
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from models.retroreflectivity_model import RetroReflectivityEstimator


# ---------------------------------------------------------------------------
# Headlight detection
# ---------------------------------------------------------------------------

def detect_headlights(
    frame: np.ndarray, threshold: int = 220, min_area: int = 200
) -> List[Tuple[int, int, int, int]]:
    """
    Detect bright regions likely to be vehicle headlights.

    Returns list of bounding boxes (x, y, w, h).
    """
    if len(frame.shape) == 3:
        gray = (
            0.114 * frame[:, :, 0].astype(np.float64)
            + 0.587 * frame[:, :, 1].astype(np.float64)
            + 0.299 * frame[:, :, 2].astype(np.float64)
        ).astype(np.uint8)
    else:
        gray = frame

    bright_mask = (gray > threshold).astype(np.uint8) * 255

    if cv2 is not None:
        contours, _ = cv2.findContours(bright_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area >= min_area:
                x, y, w, h = cv2.boundingRect(cnt)
                boxes.append((x, y, w, h))
        return boxes
    else:
        # Fallback: simple scan for bright clusters
        rows, cols = bright_mask.shape[:2]
        boxes = []
        visited = np.zeros_like(bright_mask, dtype=bool)
        for r in range(0, rows, 10):
            for c in range(0, cols, 10):
                if bright_mask[r, c] > 0 and not visited[r, c]:
                    # Rough bounding box
                    r_end = min(r + 40, rows)
                    c_end = min(c + 60, cols)
                    region = bright_mask[r:r_end, c:c_end]
                    if np.sum(region > 0) >= min_area // 4:
                        boxes.append((c, r, c_end - c, r_end - r))
                        visited[r:r_end, c:c_end] = True
        return boxes


def detect_sign_regions_simple(
    frame: np.ndarray,
) -> List[Tuple[int, int, int, int]]:
    """
    Simple sign detection using colour/shape heuristics.
    Looks for bright, roughly rectangular regions in the upper half of the frame.

    Returns list of bounding boxes (x, y, w, h).
    """
    h, w = frame.shape[:2]
    upper = frame[:h // 2, :, :] if len(frame.shape) == 3 else frame[:h // 2, :]

    if len(upper.shape) == 3:
        gray = (
            0.114 * upper[:, :, 0].astype(np.float64)
            + 0.587 * upper[:, :, 1].astype(np.float64)
            + 0.299 * upper[:, :, 2].astype(np.float64)
        ).astype(np.uint8)
    else:
        gray = upper

    # Signs are moderately bright (not as bright as headlights)
    sign_mask = ((gray > 80) & (gray < 220)).astype(np.uint8) * 255

    if cv2 is not None:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        sign_mask = cv2.morphologyEx(sign_mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(sign_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 500 < area < 50000:
                x, y, bw, bh = cv2.boundingRect(cnt)
                aspect = bw / max(bh, 1)
                if 0.3 < aspect < 4.0:
                    boxes.append((x, y, bw, bh))
        return boxes[:10]  # limit to top 10
    else:
        return []


def headlight_sign_distance(
    hl_box: Tuple[int, int, int, int],
    sign_box: Tuple[int, int, int, int],
) -> float:
    """Euclidean distance between centres of two bounding boxes."""
    hx, hy, hw, hh = hl_box
    sx, sy, sw, sh = sign_box
    hcx, hcy = hx + hw / 2, hy + hh / 2
    scx, scy = sx + sw / 2, sy + sh / 2
    return math.sqrt((hcx - scx) ** 2 + (hcy - scy) ** 2)


# ---------------------------------------------------------------------------
# Measurement record
# ---------------------------------------------------------------------------

def measure_sign_brightness(
    frame: np.ndarray, sign_roi: Tuple[int, int, int, int]
) -> float:
    """Extract mean luminance of a sign ROI."""
    x, y, w, h = sign_roi
    fh, fw = frame.shape[:2]
    x2, y2 = min(x + w, fw), min(y + h, fh)
    x, y = max(x, 0), max(y, 0)
    patch = frame[y:y2, x:x2]
    if patch.size == 0:
        return 0.0
    if len(patch.shape) == 3:
        lum = (
            0.114 * patch[:, :, 0].astype(np.float64)
            + 0.587 * patch[:, :, 1].astype(np.float64)
            + 0.299 * patch[:, :, 2].astype(np.float64)
        )
        return float(np.mean(lum))
    return float(np.mean(patch.astype(np.float64)))


# ---------------------------------------------------------------------------
# Simulation mode
# ---------------------------------------------------------------------------

def simulate_cctv_processing(
    n_frames: int = 300,
    fps: float = 25.0,
    n_signs: int = 3,
    seed: int = 42,
) -> Tuple[List[Dict], List[Dict]]:
    """
    Generate synthetic CCTV measurement data.

    Returns
    -------
    measurements : list of dict
        Per-frame measurement records.
    sign_summaries : list of dict
        Per-sign aggregated RL estimates.
    """
    rng = np.random.RandomState(seed)

    # Define signs with "true" RL values
    sign_defs = [
        {"id": f"SIGN-{i+1:03d}", "true_rl": rng.uniform(50, 400),
         "roi": (100 + i * 300, 50 + i * 40, 80, 60),
         "type": rng.choice(["Regulatory Sign", "Warning Sign", "Guide Sign"])}
        for i in range(n_signs)
    ]

    measurements: List[Dict] = []
    sign_measurements: Dict[str, List[float]] = {s["id"]: [] for s in sign_defs}

    for frame_idx in range(n_frames):
        timestamp = frame_idx / fps

        # Simulate a headlight event every ~30 frames
        headlight_present = rng.random() < 0.3
        if not headlight_present:
            continue

        headlight_x = rng.randint(200, 1000)
        headlight_y = rng.randint(400, 650)

        for sign_def in sign_defs:
            sx, sy, sw, sh = sign_def["roi"]
            hl_dist = math.sqrt((headlight_x - sx) ** 2 + (headlight_y - sy) ** 2)

            # Only measure when headlight is within reasonable range
            if hl_dist > 800:
                continue

            # Simulated brightness proportional to true_rl, attenuated by distance
            true_rl = sign_def["true_rl"]
            brightness = (true_rl / 2.5) * (500 / max(hl_dist, 50))
            brightness += rng.normal(0, brightness * 0.1)  # 10% noise
            brightness = max(brightness, 0)

            record = {
                "frame": frame_idx,
                "timestamp": round(timestamp, 3),
                "sign_id": sign_def["id"],
                "sign_type": sign_def["type"],
                "sign_roi": list(sign_def["roi"]),
                "brightness": round(brightness, 2),
                "headlight_distance": round(hl_dist, 1),
                "headlight_position": [headlight_x, headlight_y],
            }
            measurements.append(record)
            sign_measurements[sign_def["id"]].append(brightness)

    # Aggregate per sign
    estimator = RetroReflectivityEstimator()
    sign_summaries = []
    for sign_def in sign_defs:
        sid = sign_def["id"]
        values = sign_measurements[sid]
        if not values:
            continue
        median_brightness = float(np.median(values))
        std_brightness = float(np.std(values))
        rl_est = median_brightness * estimator.calibration_factor
        irc_min = estimator.get_irc_minimum("sign", "high_intensity", "white")
        classification = estimator.classify(rl_est, irc_min)

        sign_summaries.append({
            "sign_id": sid,
            "sign_type": sign_def["type"],
            "true_rl": round(sign_def["true_rl"], 2),
            "n_measurements": len(values),
            "median_brightness": round(median_brightness, 2),
            "std_brightness": round(std_brightness, 2),
            "estimated_rl": round(rl_est, 2),
            "confidence_interval": [
                round(rl_est - 1.96 * std_brightness * estimator.calibration_factor, 2),
                round(rl_est + 1.96 * std_brightness * estimator.calibration_factor, 2),
            ],
            "irc_minimum": irc_min,
            "status": classification["status"],
            "recommendation": classification["recommendation"],
        })

    return measurements, sign_summaries


# ---------------------------------------------------------------------------
# Real video processing
# ---------------------------------------------------------------------------

def process_video(
    video_path: str,
    frame_skip: int = 5,
    headlight_threshold: int = 220,
) -> Tuple[List[Dict], List[Dict]]:
    """
    Process a real video file frame by frame.

    Returns
    -------
    measurements : list of dict
    sign_summaries : list of dict
    """
    if cv2 is None:
        print("[error] OpenCV is required for video processing.")
        sys.exit(1)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[error] Cannot open video: {video_path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[info] Video: {video_path}")
    print(f"[info] FPS: {fps:.1f}, Total frames: {total_frames}")

    measurements: List[Dict] = []
    sign_measurements: Dict[str, List[float]] = {}
    sign_rois: Dict[str, Tuple[int, int, int, int]] = {}
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_skip != 0:
            frame_idx += 1
            continue

        timestamp = frame_idx / fps

        # Step 1: Detect headlights
        headlights = detect_headlights(frame, threshold=headlight_threshold)

        if not headlights:
            frame_idx += 1
            continue

        # Step 2: Detect sign regions
        signs = detect_sign_regions_simple(frame)

        # Step 3: Measure brightness for each sign when headlights nearby
        for s_idx, sign_roi in enumerate(signs):
            sign_id = f"SIGN-{s_idx+1:03d}"
            if sign_id not in sign_measurements:
                sign_measurements[sign_id] = []
                sign_rois[sign_id] = sign_roi

            for hl in headlights:
                dist = headlight_sign_distance(hl, sign_roi)
                brightness = measure_sign_brightness(frame, sign_roi)

                record = {
                    "frame": frame_idx,
                    "timestamp": round(timestamp, 3),
                    "sign_id": sign_id,
                    "sign_roi": list(sign_roi),
                    "brightness": round(brightness, 2),
                    "headlight_distance": round(dist, 1),
                }
                measurements.append(record)
                sign_measurements[sign_id].append(brightness)

        frame_idx += 1
        if frame_idx % 100 == 0:
            print(f"  Processed frame {frame_idx}/{total_frames}")

    cap.release()

    # Aggregate
    estimator = RetroReflectivityEstimator()
    sign_summaries = []
    for sign_id, values in sign_measurements.items():
        if not values:
            continue
        median_b = float(np.median(values))
        std_b = float(np.std(values))
        rl_est = median_b * estimator.calibration_factor
        irc_min = estimator.get_irc_minimum("sign", "high_intensity", "white")
        classification = estimator.classify(rl_est, irc_min)

        sign_summaries.append({
            "sign_id": sign_id,
            "n_measurements": len(values),
            "median_brightness": round(median_b, 2),
            "std_brightness": round(std_b, 2),
            "estimated_rl": round(rl_est, 2),
            "confidence_interval": [
                round(rl_est - 1.96 * std_b * estimator.calibration_factor, 2),
                round(rl_est + 1.96 * std_b * estimator.calibration_factor, 2),
            ],
            "irc_minimum": irc_min,
            "status": classification["status"],
            "recommendation": classification["recommendation"],
        })

    return measurements, sign_summaries


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="RetroGuard — CCTV Footage Analysis Pipeline",
    )
    parser.add_argument("--video", type=str, default=None, help="Path to CCTV video file")
    parser.add_argument("--simulate", action="store_true", help="Run in simulation mode")
    parser.add_argument("--n-frames", type=int, default=300, help="Number of simulated frames")
    parser.add_argument("--n-signs", type=int, default=3, help="Number of signs to simulate")
    parser.add_argument("--frame-skip", type=int, default=5, help="Process every N-th frame")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory")
    args = parser.parse_args()

    output_dir = args.output_dir or str(Path(__file__).resolve().parent.parent / "output")
    os.makedirs(output_dir, exist_ok=True)

    if args.simulate or args.video is None:
        print("[info] Running in SIMULATION mode")
        measurements, sign_summaries = simulate_cctv_processing(
            n_frames=args.n_frames, n_signs=args.n_signs,
        )
    else:
        measurements, sign_summaries = process_video(
            args.video, frame_skip=args.frame_skip,
        )

    # --- Print summary ---
    print("\n" + "=" * 60)
    print("  RetroGuard CCTV Mining — Results")
    print("=" * 60)
    print(f"  Total measurement records : {len(measurements)}")
    print(f"  Signs analysed            : {len(sign_summaries)}")
    print()

    for s in sign_summaries:
        status_icon = {"compliant": "[OK]", "warning": "[!!]", "critical": "[XX]"}.get(s["status"], "[??]")
        print(f"  {status_icon} {s['sign_id']}")
        if "sign_type" in s:
            print(f"       Type           : {s['sign_type']}")
        if "true_rl" in s:
            print(f"       True RL        : {s['true_rl']:.1f} mcd/lx/m\u00b2")
        print(f"       Measurements   : {s['n_measurements']}")
        print(f"       Estimated RL   : {s['estimated_rl']:.1f} mcd/lx/m\u00b2")
        print(f"       95% CI         : [{s['confidence_interval'][0]:.1f}, {s['confidence_interval'][1]:.1f}]")
        print(f"       IRC Minimum    : {s['irc_minimum']:.1f}")
        print(f"       Status         : {s['status'].upper()}")
        print(f"       Recommendation : {s['recommendation']}")
        print()

    # --- Save JSON ---
    json_path = os.path.join(output_dir, "cctv_results.json")
    with open(json_path, "w") as f:
        json.dump({
            "measurements": measurements,
            "sign_summaries": sign_summaries,
        }, f, indent=2)
    print(f"[info] Full results saved to {json_path}")

    # --- Save CSV ---
    csv_path = os.path.join(output_dir, "cctv_measurements.csv")
    if measurements:
        fieldnames = list(measurements[0].keys())
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for m in measurements:
                # Convert lists to strings for CSV
                row = {}
                for k, v in m.items():
                    row[k] = str(v) if isinstance(v, list) else v
                writer.writerow(row)
        print(f"[info] Measurements CSV saved to {csv_path}")

    csv_summary_path = os.path.join(output_dir, "cctv_sign_summaries.csv")
    if sign_summaries:
        fieldnames = list(sign_summaries[0].keys())
        with open(csv_summary_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for s in sign_summaries:
                row = {}
                for k, v in s.items():
                    row[k] = str(v) if isinstance(v, list) else v
                writer.writerow(row)
        print(f"[info] Sign summaries CSV saved to {csv_summary_path}")


if __name__ == "__main__":
    main()
