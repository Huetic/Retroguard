"""
Ingestion jobs router.

Async video ingestion (Layer 2 CCTV / Layer 4 dashcam) goes through here.
Clients POST a video, get a JobRun id immediately, and poll for status.

Uses FastAPI BackgroundTasks for v1 (in-process). Swap to Celery/RQ/pg-boss
later with no API contract change — the jobs table is the stable contract.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import (
    APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile,
)
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import HighwayAsset, JobRun, Measurement
from schemas import JobRunResponse
from routers.measurements import _update_asset_status
from ml_service import estimate_rl_from_frame, sample_video_frames

router = APIRouter(prefix="/api/ingest", tags=["Ingest"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def _save_upload(file: UploadFile) -> Path:
    ext = Path(file.filename or "").suffix.lower() or ".mp4"
    name = f"{datetime.utcnow():%Y%m%d%H%M%S}_{uuid.uuid4().hex[:8]}{ext}"
    dest = UPLOAD_DIR / name
    with dest.open("wb") as f:
        f.write(file.file.read())
    return dest


# ── Background worker ───────────────────────────────────────────────────────

def _process_video_job(
    job_id: int,
    video_path: str,
    asset_id: int,
    source_layer: str,
    every_n_seconds: float,
    max_frames: int,
    distance: float,
    angle: float,
    contributor_id: Optional[int] = None,
    trust_level: float = 1.0,
) -> None:
    """
    Runs in a background task. Owns its own DB session because the original
    request-scoped session is already closed by the time this runs.
    """
    db = SessionLocal()
    try:
        job = db.query(JobRun).filter(JobRun.id == job_id).first()
        if not job:
            return
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
        if not asset:
            job.status = "failed"
            job.error = f"Asset {asset_id} not found"
            job.finished_at = datetime.utcnow()
            db.commit()
            return

        try:
            frames = sample_video_frames(
                video_path,
                every_n_seconds=every_n_seconds,
                max_frames=max_frames,
            )
        except ValueError as e:
            job.status = "failed"
            job.error = str(e)
            job.finished_at = datetime.utcnow()
            db.commit()
            return

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
                confidence=est["confidence"] * trust_level,  # trust-weighted
                source_layer=source_layer,
                conditions_json=json.dumps({
                    "brightness": est["brightness"],
                    "frame_idx": f["frame_idx"],
                    "timestamp_s": f["timestamp_s"],
                    "job_id": job_id,
                    "trust_level": trust_level,
                }),
                device_info=f"video_ingest:{source_layer}",
                image_path=str(Path(video_path).name),
                measured_at=base_ts,
                contributor_id=contributor_id,
            )
            db.add(m)
            rl_values.append(est["rl_value"])

        if rl_values:
            mean_rl = sum(rl_values) / len(rl_values)
            _update_asset_status(asset, mean_rl, db)
        else:
            mean_rl = 0.0

        job.status = "done"
        job.measurements_created = len(rl_values)
        job.result_json = json.dumps({
            "frames_sampled": len(frames),
            "measurements_created": len(rl_values),
            "avg_rl": round(mean_rl, 2),
            "min_rl": round(min(rl_values), 2) if rl_values else None,
            "max_rl": round(max(rl_values), 2) if rl_values else None,
            "final_asset_status": asset.status,
        })
        job.finished_at = datetime.utcnow()
        db.commit()
    except Exception as e:  # noqa: BLE001 — want any crash captured
        db.rollback()
        job = db.query(JobRun).filter(JobRun.id == job_id).first()
        if job:
            job.status = "failed"
            job.error = f"{type(e).__name__}: {e}"
            job.finished_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/video", response_model=JobRunResponse, status_code=202)
async def enqueue_video(
    background_tasks: BackgroundTasks,
    asset_id: int = Form(...),
    source_layer: str = Form("cctv"),
    every_n_seconds: float = Form(2.0),
    max_frames: int = Form(30),
    distance: float = Form(30.0),
    angle: float = Form(0.2),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Queue a video ingestion job. Returns 202 immediately with a job id.
    Poll GET /api/ingest/jobs/{id} for progress.
    """
    if source_layer not in ("cctv", "dashcam"):
        raise HTTPException(400, "source_layer must be cctv or dashcam")

    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    saved = _save_upload(file)
    params = {
        "video_path": str(saved),
        "asset_id": asset_id,
        "source_layer": source_layer,
        "every_n_seconds": every_n_seconds,
        "max_frames": max_frames,
        "distance": distance,
        "angle": angle,
        "original_filename": file.filename,
    }
    job = JobRun(
        source_type=source_layer,
        status="queued",
        params_json=json.dumps(params),
        asset_id=asset_id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _process_video_job,
        job_id=job.id,
        video_path=str(saved),
        asset_id=asset_id,
        source_layer=source_layer,
        every_n_seconds=every_n_seconds,
        max_frames=max_frames,
        distance=distance,
        angle=angle,
    )

    return job


@router.get("/jobs", response_model=List[JobRunResponse])
def list_jobs(
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(JobRun)
    if status:
        q = q.filter(JobRun.status == status)
    if source_type:
        q = q.filter(JobRun.source_type == source_type)
    return q.order_by(JobRun.created_at.desc()).limit(limit).all()


@router.get("/jobs/{job_id}", response_model=JobRunResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobRun).filter(JobRun.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


# ── Layer 4: public contribution endpoint (API-key gated) ──────────────────

# Separate sub-router so it mounts under /api/contribute/* without disturbing
# the internal /api/ingest/* surface.
contribute_router = APIRouter(prefix="/api/contribute", tags=["Contribute (public)"])


@contribute_router.post("/video", response_model=JobRunResponse, status_code=202)
async def contribute_video(
    background_tasks: BackgroundTasks,
    asset_id: int = Form(...),
    every_n_seconds: float = Form(2.0),
    max_frames: int = Form(30),
    distance: float = Form(30.0),
    angle: float = Form(0.2),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    contributor=Depends(__import__("routers.contributors", fromlist=["require_contributor"]).require_contributor),
):
    """
    Public Layer 4 endpoint. Requires an X-API-Key header identifying an
    active contributor. Measurements derived from the upload are tagged
    with the contributor and confidence-weighted by trust_level.
    """
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    saved = _save_upload(file)
    params = {
        "video_path": str(saved),
        "asset_id": asset_id,
        "source_layer": "dashcam",
        "every_n_seconds": every_n_seconds,
        "max_frames": max_frames,
        "distance": distance,
        "angle": angle,
        "contributor_id": contributor.id,
        "contributor_name": contributor.name,
        "trust_level": contributor.trust_level,
        "original_filename": file.filename,
    }
    job = JobRun(
        source_type="dashcam",
        status="queued",
        params_json=json.dumps(params),
        asset_id=asset_id,
        contributor_id=contributor.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _process_video_job,
        job_id=job.id,
        video_path=str(saved),
        asset_id=asset_id,
        source_layer="dashcam",
        every_n_seconds=every_n_seconds,
        max_frames=max_frames,
        distance=distance,
        angle=angle,
        contributor_id=contributor.id,
        trust_level=contributor.trust_level,
    )

    return job
