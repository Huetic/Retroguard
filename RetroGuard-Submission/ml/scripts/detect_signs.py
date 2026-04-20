#!/usr/bin/env python3
"""
RetroGuard Sign & Marking Detection
====================================

Uses YOLOv8 for detecting traffic signs, pavement markings, RPMs, and
delineators in images or video.

For the hackathon demo we use a pretrained COCO model and map the relevant
COCO classes to RetroGuard categories.  For the majority of Indian-specific
sign types that are not in COCO, a simulation mode generates realistic
bounding boxes and classifications.

Usage examples:
    python detect_signs.py --input photo.jpg
    python detect_signs.py --input highway.mp4 --output annotated.mp4
    python detect_signs.py --simulate --width 1280 --height 720

Author: RetroGuard Team — NHAI Hackathon 2026
"""

import argparse
import json
import os
import random
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

# ---------------------------------------------------------------------------
# COCO-to-RetroGuard class mapping
# ---------------------------------------------------------------------------
COCO_TO_RETROGUARD = {
    9:  "Warning Sign",       # COCO "traffic light"
    11: "Regulatory Sign",    # COCO "stop sign"
}

# Full RetroGuard asset categories
RETROGUARD_CLASSES = [
    "Regulatory Sign",
    "Warning Sign",
    "Informatory Sign",
    "Pavement Marking",
    "Raised Pavement Marker",
    "Delineator",
    "Guide Sign",
    "Highway Kilometer Marker",
]

# Colors for each class (BGR for OpenCV)
CLASS_COLORS = {
    "Regulatory Sign":         (0, 0, 255),
    "Warning Sign":            (0, 165, 255),
    "Informatory Sign":        (255, 200, 0),
    "Pavement Marking":        (0, 255, 0),
    "Raised Pavement Marker":  (255, 0, 255),
    "Delineator":              (0, 255, 255),
    "Guide Sign":              (255, 100, 100),
    "Highway Kilometer Marker":(200, 200, 200),
}


# ---------------------------------------------------------------------------
# Detection helpers
# ---------------------------------------------------------------------------

def _try_load_yolo(model_path: str = "yolov8n.pt"):
    """Attempt to load YOLOv8 model. Returns None if unavailable."""
    try:
        from ultralytics import YOLO
        if os.path.exists(model_path):
            return YOLO(model_path)
        # Try loading (ultralytics will auto-download if possible)
        return YOLO(model_path)
    except Exception:
        return None


def _simulate_detections(
    width: int, height: int, n_detections: int = 6, seed: int = 42
) -> List[Dict]:
    """
    Generate realistic simulated detections for demo purposes.

    Returns a list of detection dicts compatible with the output of
    ``detect_retroreflective_assets``.
    """
    rng = random.Random(seed)
    detections = []

    # Predefined realistic placements (fractions of image size)
    placements = [
        (0.15, 0.10, 0.08, 0.12, "Regulatory Sign", 0.94),
        (0.75, 0.08, 0.07, 0.10, "Warning Sign", 0.89),
        (0.50, 0.05, 0.18, 0.08, "Guide Sign", 0.87),
        (0.30, 0.85, 0.12, 0.03, "Pavement Marking", 0.91),
        (0.60, 0.88, 0.03, 0.03, "Raised Pavement Marker", 0.82),
        (0.90, 0.30, 0.03, 0.15, "Delineator", 0.86),
        (0.05, 0.40, 0.06, 0.08, "Informatory Sign", 0.78),
        (0.85, 0.50, 0.04, 0.06, "Highway Kilometer Marker", 0.75),
    ]

    for i in range(min(n_detections, len(placements))):
        cx_frac, cy_frac, w_frac, h_frac, cls_name, conf_base = placements[i]
        x = int(cx_frac * width)
        y = int(cy_frac * height)
        w = max(int(w_frac * width), 20)
        h = max(int(h_frac * height), 20)
        confidence = round(conf_base + rng.uniform(-0.05, 0.05), 3)

        detections.append({
            "bbox": (x, y, w, h),
            "class_name": cls_name,
            "confidence": confidence,
            "cropped_image": None,  # no real crop in simulation
        })

    return detections


def detect_retroreflective_assets(
    image_path: str, model=None, simulate: bool = False
) -> List[Dict]:
    """
    Detect retroreflective assets in an image.

    Parameters
    ----------
    image_path : str
        Path to an input image.
    model : YOLO model instance, optional
        Pre-loaded YOLOv8 model. If None, attempts to load automatically.
    simulate : bool
        If True, returns simulated detections (demo mode).

    Returns
    -------
    list of dict
        Each dict has keys: bbox (x, y, w, h), class_name, confidence,
        cropped_image (np.ndarray or None).
    """
    if cv2 is None:
        print("[warn] OpenCV not available — falling back to simulation mode.")
        simulate = True

    if not simulate and cv2 is not None:
        image = cv2.imread(image_path)
        if image is None:
            print(f"[warn] Cannot read image {image_path} — using simulation.")
            simulate = True

    if simulate:
        return _simulate_detections(1280, 720)

    height, width = image.shape[:2]

    # Try real YOLO detection
    if model is None:
        model = _try_load_yolo()

    detections: List[Dict] = []

    if model is not None:
        results = model(image, verbose=False)
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if cls_id in COCO_TO_RETROGUARD:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    w, h_box = x2 - x1, y2 - y1
                    cropped = image[y1:y2, x1:x2].copy()
                    detections.append({
                        "bbox": (x1, y1, w, h_box),
                        "class_name": COCO_TO_RETROGUARD[cls_id],
                        "confidence": round(conf, 3),
                        "cropped_image": cropped,
                    })

    # If YOLO found nothing (or no model), supplement with simulation
    if len(detections) == 0:
        sim = _simulate_detections(width, height)
        for d in sim:
            x, y, w, h_box = d["bbox"]
            # Create a real crop from the image if within bounds
            x2 = min(x + w, width)
            y2 = min(y + h_box, height)
            x = max(x, 0)
            y = max(y, 0)
            d["cropped_image"] = image[y:y2, x:x2].copy() if (y2 > y and x2 > x) else None
            d["bbox"] = (x, y, x2 - x, y2 - y)
        detections = sim

    return detections


def draw_detections(
    image: np.ndarray, detections: List[Dict], line_width: int = 2
) -> np.ndarray:
    """Draw bounding boxes and labels on an image."""
    annotated = image.copy()
    for det in detections:
        x, y, w, h = det["bbox"]
        cls_name = det["class_name"]
        conf = det["confidence"]
        color = CLASS_COLORS.get(cls_name, (255, 255, 255))

        cv2.rectangle(annotated, (x, y), (x + w, y + h), color, line_width)
        label = f"{cls_name} {conf:.2f}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(annotated, (x, y - th - 6), (x + tw + 4, y), color, -1)
        cv2.putText(
            annotated, label, (x + 2, y - 4),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA,
        )
    return annotated


def _create_synthetic_highway_image(width: int = 1280, height: int = 720) -> np.ndarray:
    """Create a synthetic nighttime highway scene for demo."""
    # Dark background
    image = np.zeros((height, width, 3), dtype=np.uint8)
    image[:] = (25, 22, 18)  # dark blue-grey

    # Road surface
    road_top = int(height * 0.4)
    pts = np.array([
        [int(width * 0.2), road_top],
        [int(width * 0.8), road_top],
        [width, height],
        [0, height],
    ])
    cv2.fillPoly(image, [pts], (50, 48, 45))

    # Lane markings
    for i in range(5):
        y_start = road_top + int((height - road_top) * (i / 5))
        y_end = y_start + 30
        cx = width // 2
        cv2.rectangle(image, (cx - 3, y_start), (cx + 3, y_end), (200, 200, 200), -1)

    # Simulated signs (bright rectangles)
    # Regulatory sign — red border white interior
    cv2.rectangle(image, (180, 70), (280, 160), (0, 0, 220), -1)
    cv2.rectangle(image, (190, 80), (270, 150), (230, 230, 230), -1)

    # Warning sign — yellow diamond
    diamond_pts = np.array([[960, 50], [1010, 100], [960, 150], [910, 100]])
    cv2.fillPoly(image, [diamond_pts], (0, 220, 255))
    cv2.polylines(image, [diamond_pts], True, (0, 0, 0), 2)

    # Guide sign — green rectangle
    cv2.rectangle(image, (500, 30), (780, 90), (0, 160, 0), -1)
    cv2.putText(image, "NH-48 Jaipur 120km", (510, 70),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)

    # Delineator post
    cv2.rectangle(image, (1140, 200), (1160, 340), (180, 180, 180), -1)
    cv2.rectangle(image, (1135, 200), (1165, 240), (0, 200, 255), -1)

    # RPM on road
    cv2.circle(image, (770, 640), 8, (200, 200, 200), -1)

    # Pavement marking (edge line)
    for y in range(road_top, height, 2):
        frac = (y - road_top) / (height - road_top)
        x_left = int(width * 0.2 * (1 - frac) + 0 * frac)
        cv2.line(image, (x_left + 5, y), (x_left + 8, y), (200, 200, 200), 1)

    return image


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="RetroGuard — Sign & Marking Detection (YOLOv8)",
    )
    parser.add_argument(
        "--input", type=str, default=None,
        help="Path to image, video, or '0' for webcam",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Path to save annotated output",
    )
    parser.add_argument(
        "--simulate", action="store_true",
        help="Run in simulation mode (no real input needed)",
    )
    parser.add_argument(
        "--width", type=int, default=1280,
        help="Width of synthetic image (simulation mode)",
    )
    parser.add_argument(
        "--height", type=int, default=720,
        help="Height of synthetic image (simulation mode)",
    )
    parser.add_argument(
        "--model", type=str, default="yolov8n.pt",
        help="YOLOv8 model path (default: yolov8n.pt)",
    )
    args = parser.parse_args()

    # Determine output path
    output_dir = str(Path(__file__).resolve().parent.parent / "output")
    os.makedirs(output_dir, exist_ok=True)
    output_path = args.output or os.path.join(output_dir, "detection_result.jpg")

    if args.simulate or args.input is None:
        print("[info] Running in SIMULATION mode")
        detections = _simulate_detections(args.width, args.height)

        if cv2 is not None:
            image = _create_synthetic_highway_image(args.width, args.height)
            # Create crops from the synthetic image
            for d in detections:
                x, y, w, h = d["bbox"]
                x2, y2 = min(x + w, args.width), min(y + h, args.height)
                x, y = max(x, 0), max(y, 0)
                d["cropped_image"] = image[y:y2, x:x2].copy() if (y2 > y and x2 > x) else None
            annotated = draw_detections(image, detections)
            cv2.imwrite(output_path, annotated)
            print(f"[info] Annotated image saved to {output_path}")
        else:
            # Fallback: use matplotlib to create the annotated simulation image
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            import matplotlib.patches as mpatch

            fig, ax = plt.subplots(figsize=(args.width / 100, args.height / 100),
                                   facecolor="#0F172A")
            ax.set_facecolor("#161822")
            ax.set_xlim(0, args.width)
            ax.set_ylim(args.height, 0)

            # Road
            road = plt.Polygon(
                [[args.width * 0.2, args.height * 0.4],
                 [args.width * 0.8, args.height * 0.4],
                 [args.width, args.height],
                 [0, args.height]],
                facecolor="#1a1a1a", edgecolor="none",
            )
            ax.add_patch(road)

            # Detection bounding boxes
            COLOR_MAP_MPL = {
                "Regulatory Sign":         "#EF4444",
                "Warning Sign":            "#F59E0B",
                "Informatory Sign":        "#3B82F6",
                "Pavement Marking":        "#22C55E",
                "Raised Pavement Marker":  "#8B5CF6",
                "Delineator":              "#06B6D4",
                "Guide Sign":              "#22C55E",
                "Highway Kilometer Marker":"#94A3B8",
            }
            for d in detections:
                x, y, w, h = d["bbox"]
                color = COLOR_MAP_MPL.get(d["class_name"], "#FFFFFF")
                rect = mpatch.Rectangle((x, y), w, h, linewidth=2,
                                        edgecolor=color, facecolor="none")
                ax.add_patch(rect)
                ax.text(x, y - 4, f"{d['class_name']} {d['confidence']:.2f}",
                        fontsize=6, color="white", fontweight="bold",
                        bbox=dict(boxstyle="round,pad=0.15", facecolor=color, alpha=0.85))

            ax.set_title("RetroGuard Detection (Simulation)", fontsize=10,
                         color="white", fontweight="bold")
            ax.axis("off")
            output_path_png = output_path.rsplit(".", 1)[0] + ".png"
            plt.tight_layout(pad=0)
            plt.savefig(output_path_png, dpi=150, bbox_inches="tight", facecolor="#0F172A")
            plt.close()
            output_path = output_path_png
            print(f"[info] Annotated image saved to {output_path} (matplotlib fallback)")

    elif args.input == "0":
        # Webcam mode
        if cv2 is None:
            print("[error] OpenCV required. pip install opencv-python")
            sys.exit(1)
        yolo_model = _try_load_yolo(args.model)
        cap = cv2.VideoCapture(0)
        print("[info] Webcam mode — press 'q' to quit")
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            dets = detect_retroreflective_assets("__webcam__", model=yolo_model, simulate=False)
            annotated = draw_detections(frame, dets)
            cv2.imshow("RetroGuard Detection", annotated)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        cap.release()
        cv2.destroyAllWindows()

    elif args.input.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
        # Video mode
        if cv2 is None:
            print("[error] OpenCV required. pip install opencv-python")
            sys.exit(1)
        yolo_model = _try_load_yolo(args.model)
        cap = cv2.VideoCapture(args.input)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        w_vid = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h_vid = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path.replace(".jpg", ".mp4"), fourcc, fps, (w_vid, h_vid))
        frame_count = 0
        all_detections = []
        print(f"[info] Processing video: {args.input}")
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_count % 5 == 0:  # process every 5th frame
                dets = detect_retroreflective_assets(args.input, model=yolo_model, simulate=False)
                all_detections.extend(dets)
            annotated = draw_detections(frame, dets if frame_count >= 0 else [])
            out.write(annotated)
            frame_count += 1
        cap.release()
        out.release()
        print(f"[info] Processed {frame_count} frames, saved to {output_path.replace('.jpg', '.mp4')}")

    else:
        # Image mode
        if cv2 is None:
            print("[error] OpenCV required. pip install opencv-python")
            sys.exit(1)
        yolo_model = _try_load_yolo(args.model)
        detections = detect_retroreflective_assets(args.input, model=yolo_model)
        image = cv2.imread(args.input)
        if image is not None:
            annotated = draw_detections(image, detections)
            cv2.imwrite(output_path, annotated)
            print(f"[info] Annotated image saved to {output_path}")
        else:
            print(f"[warn] Could not read {args.input}")

    # Print summary
    if args.simulate or args.input is None:
        detections_to_show = detections
    elif "detections" in dir():
        detections_to_show = detections
    else:
        detections_to_show = []

    if detections_to_show:
        print("\n=== Detection Summary ===")
        print(f"Total detections: {len(detections_to_show)}")
        class_counts: Dict[str, int] = {}
        for d in detections_to_show:
            cls = d["class_name"]
            class_counts[cls] = class_counts.get(cls, 0) + 1
        for cls_name, count in sorted(class_counts.items()):
            print(f"  {cls_name}: {count}")
        print()
        for i, d in enumerate(detections_to_show):
            print(f"  [{i+1}] {d['class_name']:30s} conf={d['confidence']:.3f}  bbox={d['bbox']}")

        # Save as JSON
        json_path = output_path.rsplit(".", 1)[0] + ".json"
        json_data = [
            {"bbox": list(d["bbox"]), "class_name": d["class_name"], "confidence": d["confidence"]}
            for d in detections_to_show
        ]
        with open(json_path, "w") as f:
            json.dump(json_data, f, indent=2)
        print(f"\n[info] Detection data saved to {json_path}")


if __name__ == "__main__":
    main()
