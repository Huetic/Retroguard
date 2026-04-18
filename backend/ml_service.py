"""
Thin wrapper around ml/scripts/*.py so backend routers can call ML functions
without duplicating logic. Falls back to analytic simulation when optional
heavy deps (cv2, torch, ultralytics) are missing — keeps the API usable in
demo mode.
"""

from __future__ import annotations

import math
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Make ml/ importable from backend/
_ML_DIR = Path(__file__).resolve().parent.parent / "ml"
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:
    import cv2
except ImportError:
    cv2 = None

# Lazy imports — tolerate missing deps
try:
    from scripts.estimate_rl import (
        extract_brightness,
        estimate_rl as _estimate_rl_fn,
        classify_condition,
    )
    _HAS_ESTIMATE = True
except Exception:
    _HAS_ESTIMATE = False

try:
    from scripts.detect_signs import detect_retroreflective_assets, _simulate_detections
    _HAS_DETECT = True
except Exception:
    _HAS_DETECT = False

try:
    from scripts.predict_degradation import predict_failure_date as _predict_fn
    _HAS_PREDICT = True
except Exception:
    _HAS_PREDICT = False


# ── Retroreflectivity estimation ────────────────────────────────────────────

def estimate_rl_from_image(
    image_path: str,
    irc_minimum: float,
    distance: float = 30.0,
    angle: float = 0.2,
    calibration_factor: float = 2.5,
) -> Dict[str, Any]:
    """
    Load an image from disk and compute an R_L estimate + classification.
    Falls back to deterministic simulation if cv2 is unavailable or load fails.
    """
    brightness: Optional[float] = None

    if _HAS_ESTIMATE and cv2 is not None and np is not None:
        try:
            img = cv2.imread(image_path)
            if img is not None and img.size > 0:
                brightness = float(extract_brightness(img))
        except Exception:
            brightness = None

    if brightness is None:
        # Simulate from filesize bytes — stable per-file fallback
        try:
            size = Path(image_path).stat().st_size
        except OSError:
            size = 1
        rng = random.Random(size)
        brightness = rng.uniform(60.0, 180.0)

    if _HAS_ESTIMATE:
        rl = float(_estimate_rl_fn(brightness, calibration_factor, distance, angle))
        classification = classify_condition(rl, irc_minimum)
    else:
        ref_dist, ref_angle = 30.0, 0.2
        dist_factor = (max(distance, 1.0) / ref_dist) ** 1.5
        angle_factor = math.cos(math.radians(ref_angle)) / max(
            math.cos(math.radians(max(angle, 0.01))), 0.01
        )
        rl = brightness * calibration_factor * dist_factor * angle_factor
        ratio = rl / max(irc_minimum, 0.01)
        status = (
            "compliant" if ratio >= 1.0 else "warning" if ratio >= 0.5 else "critical"
        )
        classification = {"status": status, "ratio": round(ratio, 3)}

    confidence = max(0.5, min(0.99, 0.7 + (brightness - 100) / 400.0))

    return {
        "rl_value": round(rl, 2),
        "brightness": round(brightness, 2),
        "confidence": round(confidence, 3),
        "distance_m": distance,
        "angle_deg": angle,
        "classification": classification,
        "engine": "cv2+ml" if (_HAS_ESTIMATE and cv2) else "simulation",
    }


# ── Sign detection ──────────────────────────────────────────────────────────

def _normalize_detection(d: Dict[str, Any]) -> Dict[str, Any]:
    """ml/scripts/detect_signs.py returns {bbox:(x,y,w,h), class_name, confidence, ...}
    Normalize to {class, confidence, bbox:[x1,y1,x2,y2]} for the API."""
    b = d.get("bbox") or [0, 0, 0, 0]
    if len(b) == 4:
        x, y, w, h = b
        bbox = [float(x), float(y), float(x + w), float(y + h)]
    else:
        bbox = [float(v) for v in b]
    return {
        "class": d.get("class_name") or d.get("class") or "Unknown",
        "confidence": float(d.get("confidence", 0.0)),
        "bbox": bbox,
    }


def detect_signs_in_image(
    image_path: Optional[str] = None,
    width: int = 1280,
    height: int = 720,
) -> List[Dict[str, Any]]:
    """Return a list of detections. Uses YOLO when available, else simulation."""
    raw: List[Dict[str, Any]] = []
    if _HAS_DETECT and image_path and cv2 is not None:
        try:
            img = cv2.imread(image_path)
            if img is not None:
                raw = list(detect_retroreflective_assets(img))
        except Exception:
            raw = []

    if not raw and _HAS_DETECT:
        raw = list(_simulate_detections(width, height, n_detections=random.randint(3, 7)))

    if not raw:
        categories = ["Regulatory Sign", "Warning Sign", "Pavement Marking", "Delineator"]
        for _ in range(random.randint(3, 6)):
            cat = random.choice(categories)
            x = random.randint(0, width - 200)
            y = random.randint(0, height - 200)
            raw.append({
                "class_name": cat,
                "confidence": round(random.uniform(0.6, 0.95), 3),
                "bbox": (x, y, 180, 180),
            })

    return [_normalize_detection(d) for d in raw]


# ── Degradation prediction ──────────────────────────────────────────────────

def predict_degradation(
    measurements: List[Dict[str, Any]],
    irc_minimum: float,
    material: str = "high_intensity",
    traffic: str = "medium",
    weather: str = "tropical",
    install_date: Optional[datetime] = None,
    horizon_days: int = 720,
) -> Dict[str, Any]:
    """
    Given a list of {day:int, rl:float} historical points, return a forecast:
      - summary: failure date, days_to_failure, CI
      - series:  list of {day, date, rl, is_forecast} spanning history + horizon
    """
    if not measurements:
        raise ValueError("No measurements provided")

    start = install_date or (datetime.utcnow() - timedelta(days=365 * 3))
    start_str = start.strftime("%Y-%m-%d")

    if _HAS_PREDICT:
        summary = _predict_fn(
            measurements=measurements,
            irc_minimum=irc_minimum,
            traffic=traffic,
            weather=weather,
            material=material,
            start_date=start_str,
        )
    else:
        # Log-linear fallback
        ds = [m["day"] for m in measurements]
        rs = [m["rl"] for m in measurements if m["rl"] > 0]
        if len(rs) >= 2:
            log_r = [math.log(r) for r in rs]
            n = len(rs)
            mean_d = sum(ds[:n]) / n
            mean_l = sum(log_r) / n
            num = sum((ds[i] - mean_d) * (log_r[i] - mean_l) for i in range(n))
            den = sum((ds[i] - mean_d) ** 2 for i in range(n)) or 1.0
            slope = num / den
            lam = max(-slope, 1e-6)
            rl_0 = math.exp(mean_l + lam * mean_d)
        else:
            rl_0, lam = rs[0] if rs else 500.0, 1e-4
        if rl_0 <= irc_minimum:
            days_to_failure = 0.0
        else:
            days_to_failure = -math.log(irc_minimum / rl_0) / lam
        failure_date = start + timedelta(days=days_to_failure)
        summary = {
            "rl_0": round(rl_0, 2),
            "lambda_adjusted": round(lam, 8),
            "days_to_failure": round(days_to_failure, 1),
            "confidence_interval_days": [
                round(days_to_failure * 0.8, 1),
                round(days_to_failure * 1.2, 1),
            ],
            "installation_date": start_str,
            "predicted_failure_date": failure_date.strftime("%Y-%m-%d"),
            "recommended_maintenance_date": (
                failure_date - timedelta(days=90)
            ).strftime("%Y-%m-%d"),
            "irc_minimum": irc_minimum,
            "factors": {"traffic": traffic, "weather": weather, "material": material},
        }

    # Build time-series: historical points + forecast up to horizon_days past today
    series: List[Dict[str, Any]] = []
    for m in measurements:
        series.append(
            {
                "day": m["day"],
                "date": (start + timedelta(days=m["day"])).strftime("%Y-%m-%d"),
                "rl": round(float(m["rl"]), 2),
                "is_forecast": False,
            }
        )

    last_day = max(m["day"] for m in measurements)
    rl_0 = summary["rl_0"]
    lam = summary["lambda_adjusted"]
    step = max(horizon_days // 40, 7)
    for d in range(last_day + step, last_day + horizon_days + 1, step):
        rl_pred = rl_0 * math.exp(-lam * d)
        series.append(
            {
                "day": d,
                "date": (start + timedelta(days=d)).strftime("%Y-%m-%d"),
                "rl": round(rl_pred, 2),
                "is_forecast": True,
            }
        )

    return {"summary": summary, "series": series}
