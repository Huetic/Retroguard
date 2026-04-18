"""
Layer 3: reference patch catalog + calibrated R_L estimation.

A reference patch is a physical retroreflective square with a known (lab
certified) R_L. Placed in the camera's view, it lets the software back out
the exact calibration factor for *this* capture — lighting, weather, and
camera-specific.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import HighwayAsset, ReferencePatch
from schemas import (
    CalibratedRLRequest,
    CalibratedRLResponse,
    ReferencePatchCreate,
    ReferencePatchResponse,
    ReferencePatchUpdate,
)

router = APIRouter(prefix="/api/patches", tags=["Reference Patches"])


@router.get("", response_model=List[ReferencePatchResponse])
def list_patches(
    active: Optional[bool] = Query(None),
    highway_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(ReferencePatch)
    if active is not None:
        q = q.filter(ReferencePatch.active == active)
    if highway_id:
        q = q.filter(ReferencePatch.highway_id == highway_id)
    return q.order_by(ReferencePatch.id.desc()).all()


@router.post("", response_model=ReferencePatchResponse, status_code=201)
def create_patch(payload: ReferencePatchCreate, db: Session = Depends(get_db)):
    patch = ReferencePatch(**payload.model_dump())
    db.add(patch)
    db.commit()
    db.refresh(patch)
    return patch


@router.get("/{patch_id}", response_model=ReferencePatchResponse)
def get_patch(patch_id: int, db: Session = Depends(get_db)):
    patch = db.query(ReferencePatch).filter(ReferencePatch.id == patch_id).first()
    if not patch:
        raise HTTPException(404, "Reference patch not found")
    return patch


@router.put("/{patch_id}", response_model=ReferencePatchResponse)
def update_patch(
    patch_id: int, payload: ReferencePatchUpdate, db: Session = Depends(get_db)
):
    patch = db.query(ReferencePatch).filter(ReferencePatch.id == patch_id).first()
    if not patch:
        raise HTTPException(404, "Reference patch not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(patch, k, v)
    db.commit()
    db.refresh(patch)
    return patch


@router.delete("/{patch_id}", status_code=204)
def delete_patch(patch_id: int, db: Session = Depends(get_db)):
    patch = db.query(ReferencePatch).filter(ReferencePatch.id == patch_id).first()
    if not patch:
        raise HTTPException(404, "Reference patch not found")
    db.delete(patch)
    db.commit()


@router.post("/calibrated-rl", response_model=CalibratedRLResponse)
def calibrated_rl(payload: CalibratedRLRequest, db: Session = Depends(get_db)):
    """
    Compute an absolute R_L for a sign, calibrated against a known patch.

      calibration_factor = patch.known_rl / patch_brightness
      rl_sign            = sign_brightness * calibration_factor

    This is the physics-anchored replacement for the hardcoded
    calibration_factor=2.5 used in the uncalibrated estimator.
    """
    patch = db.query(ReferencePatch).filter(ReferencePatch.id == payload.patch_id).first()
    if not patch:
        raise HTTPException(404, "Reference patch not found")
    if not patch.active:
        raise HTTPException(400, "Reference patch is inactive")

    if payload.patch_brightness <= 0:
        raise HTTPException(400, "patch_brightness must be > 0")

    calibration_factor = patch.known_rl / payload.patch_brightness
    rl = payload.sign_brightness * calibration_factor

    classification = {
        "status": "compliant" if rl >= 200 else "warning" if rl >= 100 else "critical",
        "rl_rounded": round(rl, 2),
    }

    return CalibratedRLResponse(
        rl_value=round(rl, 2),
        calibration_factor=round(calibration_factor, 4),
        patch_id=patch.id,
        patch_known_rl=patch.known_rl,
        patch_brightness=round(payload.patch_brightness, 2),
        sign_brightness=round(payload.sign_brightness, 2),
        classification=classification,
    )
