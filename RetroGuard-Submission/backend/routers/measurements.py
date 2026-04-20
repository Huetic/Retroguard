from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from auth import get_current_user
from database import get_db
from models import HighwayAsset, Measurement, Alert, User
from schemas import CreateMeasurement, MeasurementResponse

_any_staff = get_current_user

router = APIRouter(prefix="/api/measurements", tags=["Measurements"])


def _update_asset_status(asset: HighwayAsset, rl_value: float, db: Session):
    """Update asset current_rl and status based on new measurement.
    Auto-create alert if status turns critical."""
    old_status = asset.status
    asset.current_rl = rl_value
    asset.last_measured = datetime.utcnow()

    ratio = rl_value / asset.irc_minimum_rl if asset.irc_minimum_rl else 1.0
    if ratio >= 1.2:
        asset.status = "compliant"
    elif ratio >= 1.0:
        asset.status = "warning"
    else:
        asset.status = "critical"

    # Auto-create alert on critical transition
    if asset.status == "critical" and old_status != "critical":
        alert = Alert(
            asset_id=asset.id,
            alert_type="critical",
            message=(
                f"{asset.asset_type.title()} on {asset.highway_id} at km {asset.chainage_km} "
                f"has RL {rl_value:.1f} below IRC minimum {asset.irc_minimum_rl:.1f}"
            ),
            highway_id=asset.highway_id,
            chainage_km=asset.chainage_km,
            is_resolved=False,
        )
        db.add(alert)

    # Auto-create warning alert
    if asset.status == "warning" and old_status == "compliant":
        alert = Alert(
            asset_id=asset.id,
            alert_type="warning",
            message=(
                f"{asset.asset_type.title()} on {asset.highway_id} at km {asset.chainage_km} "
                f"approaching IRC minimum (RL {rl_value:.1f}, min {asset.irc_minimum_rl:.1f})"
            ),
            highway_id=asset.highway_id,
            chainage_km=asset.chainage_km,
            is_resolved=False,
        )
        db.add(alert)


@router.post("", response_model=MeasurementResponse, status_code=201)
def submit_measurement(payload: CreateMeasurement, db: Session = Depends(get_db), _: User = Depends(_any_staff)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    measurement = Measurement(
        asset_id=payload.asset_id,
        rl_value=payload.rl_value,
        confidence=payload.confidence,
        source_layer=payload.source_layer,
        conditions_json=payload.conditions_json,
        device_info=payload.device_info,
        image_path=payload.image_path,
        measured_at=datetime.utcnow(),
    )
    db.add(measurement)

    _update_asset_status(asset, payload.rl_value, db)

    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("", response_model=List[MeasurementResponse])
def list_measurements(
    asset_id: Optional[int] = Query(None),
    source_layer: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(_any_staff),
):
    q = db.query(Measurement)
    if asset_id:
        q = q.filter(Measurement.asset_id == asset_id)
    if source_layer:
        q = q.filter(Measurement.source_layer == source_layer)
    return q.order_by(Measurement.measured_at.desc()).offset(skip).limit(limit).all()


@router.get("/recent", response_model=List[MeasurementResponse])
def recent_measurements(db: Session = Depends(get_db), _: User = Depends(_any_staff)):
    return (
        db.query(Measurement)
        .order_by(Measurement.measured_at.desc())
        .limit(50)
        .all()
    )
