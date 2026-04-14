from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List

from database import get_db
from models import HighwayAsset, Measurement, Alert
from schemas import (
    DashboardStats,
    DegradationPoint,
    HighwayHealth,
    HeatmapPoint,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(HighwayAsset.id)).scalar() or 0
    compliant = (
        db.query(func.count(HighwayAsset.id))
        .filter(HighwayAsset.status == "compliant")
        .scalar()
        or 0
    )
    warning = (
        db.query(func.count(HighwayAsset.id))
        .filter(HighwayAsset.status == "warning")
        .scalar()
        or 0
    )
    critical = (
        db.query(func.count(HighwayAsset.id))
        .filter(HighwayAsset.status == "critical")
        .scalar()
        or 0
    )

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    measurements_today = (
        db.query(func.count(Measurement.id))
        .filter(Measurement.measured_at >= today_start)
        .scalar()
        or 0
    )

    alerts_active = (
        db.query(func.count(Alert.id))
        .filter(Alert.is_resolved == False)
        .scalar()
        or 0
    )

    return DashboardStats(
        total_assets=total,
        compliant_count=compliant,
        warning_count=warning,
        critical_count=critical,
        measurements_today=measurements_today,
        alerts_active=alerts_active,
    )


@router.get("/degradation/{asset_id}", response_model=List[DegradationPoint])
def degradation_series(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    measurements = (
        db.query(Measurement)
        .filter(Measurement.asset_id == asset_id)
        .order_by(Measurement.measured_at.asc())
        .all()
    )
    return [
        DegradationPoint(
            measured_at=m.measured_at,
            rl_value=m.rl_value,
            source_layer=m.source_layer,
        )
        for m in measurements
    ]


@router.get("/highway-health", response_model=List[HighwayHealth])
def highway_health(db: Session = Depends(get_db)):
    highways = db.query(HighwayAsset.highway_id).distinct().all()
    results = []
    for (hw_id,) in highways:
        total = (
            db.query(func.count(HighwayAsset.id))
            .filter(HighwayAsset.highway_id == hw_id)
            .scalar()
            or 0
        )
        compliant = (
            db.query(func.count(HighwayAsset.id))
            .filter(HighwayAsset.highway_id == hw_id, HighwayAsset.status == "compliant")
            .scalar()
            or 0
        )
        warning = (
            db.query(func.count(HighwayAsset.id))
            .filter(HighwayAsset.highway_id == hw_id, HighwayAsset.status == "warning")
            .scalar()
            or 0
        )
        critical = (
            db.query(func.count(HighwayAsset.id))
            .filter(HighwayAsset.highway_id == hw_id, HighwayAsset.status == "critical")
            .scalar()
            or 0
        )
        pct = round((compliant / total) * 100, 1) if total else 0.0
        results.append(
            HighwayHealth(
                highway_id=hw_id,
                total_assets=total,
                compliant=compliant,
                warning=warning,
                critical=critical,
                compliance_pct=pct,
            )
        )
    return sorted(results, key=lambda h: h.compliance_pct)


@router.get("/heatmap", response_model=List[HeatmapPoint])
def heatmap_data(db: Session = Depends(get_db)):
    assets = db.query(HighwayAsset).all()
    return [
        HeatmapPoint(
            lat=a.gps_lat,
            lon=a.gps_lon,
            status=a.status,
            rl_ratio=round(a.current_rl / a.irc_minimum_rl, 3)
            if a.current_rl and a.irc_minimum_rl
            else 0.0,
        )
        for a in assets
    ]
