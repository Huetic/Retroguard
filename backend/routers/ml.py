from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import json

from database import get_db
from models import HighwayAsset, Measurement
from schemas import (
    RLEstimateRequest,
    RLEstimateResponse,
    DetectionResponse,
    PredictionResponse,
    MeasurementResponse,
)
from routers.measurements import _update_asset_status
from ml_service import (
    estimate_rl_from_image,
    detect_signs_in_image,
    predict_degradation,
    sample_video_frames,
    estimate_rl_from_frame,
)

from storage import storage

router = APIRouter(prefix="/api/ml", tags=["ML"])


@router.post("/estimate-rl", response_model=RLEstimateResponse)
def estimate_rl_endpoint(payload: RLEstimateRequest, db: Session = Depends(get_db)):
    """Estimate R_L from an already-uploaded image path + IRC minimum."""
    irc = payload.irc_minimum
    if payload.asset_id and irc is None:
        asset = db.query(HighwayAsset).filter(HighwayAsset.id == payload.asset_id).first()
        if not asset:
            raise HTTPException(404, "Asset not found")
        irc = asset.irc_minimum_rl

    if irc is None:
        raise HTTPException(400, "irc_minimum or asset_id required")

    result = estimate_rl_from_image(
        payload.image_path,
        irc_minimum=irc,
        distance=payload.distance or 30.0,
        angle=payload.angle or 0.2,
    )
    return result


@router.post("/detect-signs", response_model=List[DetectionResponse])
async def detect_signs_endpoint(file: Optional[UploadFile] = File(None)):
    """Run sign/marking detection. If a file is uploaded, runs on it; else simulates."""
    path: Optional[str] = None
    if file is not None:
        stored_path = storage.save(file)
        path = str(storage.absolute_path(stored_path))
    return detect_signs_in_image(image_path=path)


@router.post("/upload-measurement", response_model=MeasurementResponse, status_code=201)
async def upload_measurement(
    asset_id: int = Form(...),
    source_layer: str = Form("smartphone"),
    distance: float = Form(30.0),
    angle: float = Form(0.2),
    device_info: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload an image from Layer 1/2/4, run R_L estimation, store measurement."""
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    if source_layer not in ("smartphone", "cctv", "dashcam", "qr_code"):
        raise HTTPException(400, "invalid source_layer")

    stored_path = storage.save(file)
    result = estimate_rl_from_image(
        str(storage.absolute_path(stored_path)),
        irc_minimum=asset.irc_minimum_rl,
        distance=distance,
        angle=angle,
    )

    measurement = Measurement(
        asset_id=asset_id,
        rl_value=result["rl_value"],
        confidence=result["confidence"],
        source_layer=source_layer,
        conditions_json=json.dumps(
            {"brightness": result["brightness"], "engine": result["engine"]}
        ),
        device_info=device_info,
        image_path=stored_path,
        measured_at=datetime.utcnow(),
    )
    db.add(measurement)
    _update_asset_status(asset, result["rl_value"], db)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/predict/{asset_id}", response_model=PredictionResponse)
def predict_endpoint(asset_id: int, horizon_days: int = 720, db: Session = Depends(get_db)):
    """Forecast R_L over time for the given asset using its measurement history."""
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    hist = (
        db.query(Measurement)
        .filter(Measurement.asset_id == asset_id)
        .order_by(Measurement.measured_at.asc())
        .all()
    )
    if len(hist) < 2:
        raise HTTPException(400, "Need at least 2 historical measurements to predict")

    install = asset.installation_date or hist[0].measured_at
    pts = [
        {"day": max((m.measured_at - install).days, 0), "rl": m.rl_value}
        for m in hist
    ]

    result = predict_degradation(
        measurements=pts,
        irc_minimum=asset.irc_minimum_rl,
        material=(asset.material_grade or "high_intensity").lower().replace(" ", "_"),
        install_date=install,
        horizon_days=horizon_days,
    )

    # Persist predicted_failure_date for list/filter views
    try:
        pfd = datetime.strptime(result["summary"]["predicted_failure_date"], "%Y-%m-%d")
        asset.predicted_failure_date = pfd
        db.commit()
    except Exception:
        db.rollback()

    return result


@router.post("/ingest-video", status_code=201)
async def ingest_video(
    asset_id: int = Form(...),
    every_n_seconds: float = Form(2.0),
    max_frames: int = Form(30),
    source_layer: str = Form("cctv"),
    distance: float = Form(30.0),
    angle: float = Form(0.2),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Layer 2 (CCTV) / Layer 4 (dashcam) bulk ingestion.

    Takes one video, samples frames every N seconds (up to max_frames),
    estimates R_L from each sampled frame, bulk-inserts measurements
    for the given asset, and updates its status based on the final frame.

    Returns a summary: frames_sampled, measurements_created, avg/min/max R_L.
    """
    if source_layer not in ("cctv", "dashcam"):
        raise HTTPException(400, "source_layer must be 'cctv' or 'dashcam' for video ingestion")

    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    stored_path = storage.save(file)
    abs_path = str(storage.absolute_path(stored_path))
    try:
        frames = sample_video_frames(
            abs_path,
            every_n_seconds=every_n_seconds,
            max_frames=max_frames,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    if not frames:
        raise HTTPException(400, "No frames could be sampled from the video")

    created: List[Measurement] = []
    rl_values: List[float] = []
    base_ts = datetime.utcnow()

    for f in frames:
        est = estimate_rl_from_frame(
            f["frame"],
            irc_minimum=asset.irc_minimum_rl,
            distance=distance,
            angle=angle,
        )
        m = Measurement(
            asset_id=asset_id,
            rl_value=est["rl_value"],
            confidence=est["confidence"],
            source_layer=source_layer,
            conditions_json=json.dumps({
                "brightness": est["brightness"],
                "frame_idx": f["frame_idx"],
                "timestamp_s": f["timestamp_s"],
                "video": storage.absolute_path(stored_path).name,
            }),
            device_info=f"video_ingest:{source_layer}",
            image_path=stored_path,
            measured_at=base_ts,
        )
        db.add(m)
        created.append(m)
        rl_values.append(est["rl_value"])

    # Update asset status based on the mean R_L (smooths noise across frames)
    mean_rl = sum(rl_values) / len(rl_values)
    _update_asset_status(asset, mean_rl, db)
    db.commit()

    return {
        "video": storage.absolute_path(stored_path).name,
        "source_layer": source_layer,
        "frames_sampled": len(frames),
        "measurements_created": len(created),
        "avg_rl": round(mean_rl, 2),
        "min_rl": round(min(rl_values), 2),
        "max_rl": round(max(rl_values), 2),
        "final_asset_status": asset.status,
    }
