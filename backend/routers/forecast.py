"""
Layer 5: Predictive Digital Twin.

The paper's prediction logic already lives in ml_service.predict_degradation.
This router adds fleet-wide operations on top of it:

  - /api/forecast/refresh        : async job that recomputes predictions for
                                   every asset with enough measurement history
                                   and snapshots them into the `forecasts` table.
  - /api/forecast/risk-register  : ranked view — which assets will fail soonest.
  - /api/forecast/{asset_id}     : latest snapshot + history for one asset.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import Forecast, HighwayAsset, JobRun, Measurement
from schemas import ForecastResponse, JobRunResponse, RiskRegisterRow
from ml_service import predict_degradation

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


def _run_forecast_for_asset(db: Session, asset: HighwayAsset) -> Optional[Forecast]:
    """Compute a fresh forecast for one asset, persist it, and return the row."""
    hist = (
        db.query(Measurement)
        .filter(Measurement.asset_id == asset.id)
        .order_by(Measurement.measured_at.asc())
        .all()
    )
    if len(hist) < 2:
        return None

    install = asset.installation_date or hist[0].measured_at
    pts = [
        {"day": max((m.measured_at - install).days, 0), "rl": m.rl_value}
        for m in hist
    ]
    try:
        result = predict_degradation(
            measurements=pts,
            irc_minimum=asset.irc_minimum_rl,
            material=(asset.material_grade or "high_intensity").lower().replace(" ", "_"),
            install_date=install,
        )
    except Exception:
        return None

    s = result["summary"]
    ci = s.get("confidence_interval_days") or [None, None]

    pfd = None
    rmd = None
    try:
        pfd = datetime.strptime(s["predicted_failure_date"], "%Y-%m-%d")
    except Exception:
        pass
    try:
        rmd = datetime.strptime(s["recommended_maintenance_date"], "%Y-%m-%d")
    except Exception:
        pass

    forecast = Forecast(
        asset_id=asset.id,
        rl_0=s.get("rl_0"),
        lambda_adjusted=s.get("lambda_adjusted"),
        days_to_failure=s.get("days_to_failure"),
        predicted_failure_date=pfd,
        recommended_maintenance_date=rmd,
        confidence_low_days=ci[0] if isinstance(ci, list) and len(ci) > 0 else None,
        confidence_high_days=ci[1] if isinstance(ci, list) and len(ci) > 1 else None,
    )
    db.add(forecast)

    # Mirror onto asset for quick list/filter views
    asset.predicted_failure_date = pfd

    return forecast


def _bulk_forecast_job(job_id: int, highway_id: Optional[str]) -> None:
    """Background worker: forecast every eligible asset."""
    db = SessionLocal()
    try:
        job = db.query(JobRun).filter(JobRun.id == job_id).first()
        if not job:
            return
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        q = db.query(HighwayAsset)
        if highway_id:
            q = q.filter(HighwayAsset.highway_id == highway_id)
        assets = q.all()

        forecasts_written = 0
        skipped = 0
        for a in assets:
            try:
                if _run_forecast_for_asset(db, a) is not None:
                    forecasts_written += 1
                else:
                    skipped += 1
            except Exception:
                skipped += 1
                db.rollback()
        db.commit()

        job.status = "done"
        job.measurements_created = 0
        job.result_json = json.dumps({
            "forecasts_written": forecasts_written,
            "skipped_insufficient_history": skipped,
            "scope": highway_id or "all highways",
        })
        job.finished_at = datetime.utcnow()
        db.commit()
    except Exception as e:  # noqa: BLE001
        db.rollback()
        job = db.query(JobRun).filter(JobRun.id == job_id).first()
        if job:
            job.status = "failed"
            job.error = f"{type(e).__name__}: {e}"
            job.finished_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


@router.post("/refresh", response_model=JobRunResponse, status_code=202)
def refresh_forecasts(
    background_tasks: BackgroundTasks,
    highway_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Queue a bulk forecast recompute. Poll GET /api/ingest/jobs/{id}."""
    job = JobRun(
        source_type="forecast",
        status="queued",
        params_json=json.dumps({"highway_id": highway_id}),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(_bulk_forecast_job, job_id=job.id, highway_id=highway_id)
    return job


@router.get("/risk-register", response_model=List[RiskRegisterRow])
def risk_register(
    highway_id: Optional[str] = Query(None),
    within_days: Optional[int] = Query(None, description="Only return assets predicted to fail within N days"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Fleet-wide ranked view of assets by days_to_failure (soonest first).
    Uses the latest Forecast snapshot per asset; falls back to the asset's
    persisted predicted_failure_date if no snapshot exists.
    """
    q = db.query(HighwayAsset)
    if highway_id:
        q = q.filter(HighwayAsset.highway_id == highway_id)
    assets = q.all()

    # Most-recent forecast per asset (one query)
    ids = [a.id for a in assets]
    latest_by_asset: dict = {}
    if ids:
        rows = (
            db.query(Forecast)
            .filter(Forecast.asset_id.in_(ids))
            .order_by(Forecast.asset_id, Forecast.computed_at.desc())
            .all()
        )
        for r in rows:
            if r.asset_id not in latest_by_asset:
                latest_by_asset[r.asset_id] = r

    now = datetime.utcnow()
    out: List[RiskRegisterRow] = []
    for a in assets:
        f = latest_by_asset.get(a.id)
        days_to_failure = f.days_to_failure if f else None
        pfd = f.predicted_failure_date if f else a.predicted_failure_date
        age_hours = None
        if f:
            age_hours = round((now - f.computed_at).total_seconds() / 3600, 1)

        if within_days is not None and (days_to_failure is None or days_to_failure > within_days):
            continue

        out.append(RiskRegisterRow(
            asset_id=a.id,
            highway_id=a.highway_id,
            chainage_km=a.chainage_km,
            asset_type=a.asset_type,
            current_rl=a.current_rl,
            irc_minimum_rl=a.irc_minimum_rl,
            status=a.status,
            days_to_failure=days_to_failure,
            predicted_failure_date=pfd,
            forecast_age_hours=age_hours,
        ))

    # Soonest-to-fail first; unknown (None) at the bottom
    out.sort(key=lambda r: (r.days_to_failure is None, r.days_to_failure or 0))
    return out[:limit]


@router.get("/{asset_id}", response_model=List[ForecastResponse])
def asset_forecast_history(
    asset_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """History of forecast snapshots for this asset (newest first)."""
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    return (
        db.query(Forecast)
        .filter(Forecast.asset_id == asset_id)
        .order_by(Forecast.computed_at.desc())
        .limit(limit)
        .all()
    )
