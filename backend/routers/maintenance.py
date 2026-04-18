from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime

from auth import get_current_user, require_role
from database import get_db
from models import HighwayAsset, MaintenanceOrder, User
from schemas import (
    MaintenanceOrderResponse,
    MaintenanceOrderCreate,
    MaintenanceOrderUpdate,
)

_any_staff = get_current_user
_supervisor_up = require_role("supervisor", "admin")

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance"])


@router.get("", response_model=List[MaintenanceOrderResponse])
def list_orders(
    status: Optional[str] = Query(None),
    highway_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(_any_staff),
):
    q = db.query(MaintenanceOrder)
    if status:
        q = q.filter(MaintenanceOrder.status == status)
    if highway_id:
        q = q.join(HighwayAsset).filter(HighwayAsset.highway_id == highway_id)
    return (
        q.order_by(MaintenanceOrder.priority_score.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("", response_model=MaintenanceOrderResponse, status_code=201)
def create_order(payload: MaintenanceOrderCreate, db: Session = Depends(get_db), _: User = Depends(_supervisor_up)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    order = MaintenanceOrder(
        asset_id=payload.asset_id,
        priority_score=payload.priority_score,
        status=payload.status or "pending",
        scheduled_date=payload.scheduled_date,
        notes=payload.notes,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=MaintenanceOrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db), _: User = Depends(_any_staff)):
    order = db.query(MaintenanceOrder).filter(MaintenanceOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    return order


@router.put("/{order_id}", response_model=MaintenanceOrderResponse)
def update_order(
    order_id: int, payload: MaintenanceOrderUpdate, db: Session = Depends(get_db), _: User = Depends(_supervisor_up)
):
    order = db.query(MaintenanceOrder).filter(MaintenanceOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(order, k, v)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db), _: User = Depends(_supervisor_up)):
    order = db.query(MaintenanceOrder).filter(MaintenanceOrder.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    db.delete(order)
    db.commit()


@router.get("/stats/summary")
def stats(db: Session = Depends(get_db), _: User = Depends(_any_staff)):
    rows = (
        db.query(MaintenanceOrder.status, func.count(MaintenanceOrder.id))
        .group_by(MaintenanceOrder.status)
        .all()
    )
    out = {"pending": 0, "scheduled": 0, "completed": 0}
    for s, c in rows:
        out[s] = c
    out["total"] = sum(out.values())
    return out


@router.post("/auto-generate", response_model=List[MaintenanceOrderResponse])
def auto_generate(db: Session = Depends(get_db), _: User = Depends(_supervisor_up)):
    """
    Create pending maintenance orders for every critical asset that doesn't
    already have a pending/scheduled order. Priority = how far below IRC min.
    """
    existing_asset_ids = {
        row[0]
        for row in db.query(MaintenanceOrder.asset_id)
        .filter(MaintenanceOrder.status.in_(["pending", "scheduled"]))
        .all()
    }
    critical = (
        db.query(HighwayAsset)
        .filter(HighwayAsset.status == "critical")
        .all()
    )
    created = []
    for a in critical:
        if a.id in existing_asset_ids:
            continue
        deficit = (
            max(1.0 - (a.current_rl or 0) / a.irc_minimum_rl, 0.0)
            if a.irc_minimum_rl
            else 0.0
        )
        priority = round(5.0 + deficit * 5.0, 2)  # 5.0 – 10.0
        order = MaintenanceOrder(
            asset_id=a.id,
            priority_score=priority,
            status="pending",
            notes=(
                f"Auto-generated: {a.asset_type} at {a.highway_id} km {a.chainage_km} "
                f"RL {a.current_rl} vs IRC min {a.irc_minimum_rl}"
            ),
        )
        db.add(order)
        created.append(order)
    db.commit()
    for o in created:
        db.refresh(o)
    return created
