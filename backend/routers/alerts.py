from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from database import get_db
from models import Alert
from schemas import AlertResponse

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse])
def list_alerts(
    highway_id: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    is_resolved: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Alert)
    if highway_id:
        q = q.filter(Alert.highway_id == highway_id)
    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    if is_resolved is not None:
        q = q.filter(Alert.is_resolved == is_resolved)
    else:
        # Default to showing active (unresolved) alerts
        q = q.filter(Alert.is_resolved == False)
    return q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()


@router.put("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/summary")
def alert_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(Alert.alert_type, func.count(Alert.id))
        .filter(Alert.is_resolved == False)
        .group_by(Alert.alert_type)
        .all()
    )
    result = {"critical": 0, "warning": 0, "info": 0}
    for alert_type, count in rows:
        result[alert_type] = count
    result["total"] = sum(result.values())
    return result
