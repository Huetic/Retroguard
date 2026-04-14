from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db
from models import HighwayAsset
from schemas import AssetResponse, AssetDetailResponse, AssetUpdate

router = APIRouter(prefix="/api/assets", tags=["Assets"])


@router.get("", response_model=List[AssetResponse])
def list_assets(
    highway_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(HighwayAsset)
    if highway_id:
        q = q.filter(HighwayAsset.highway_id == highway_id)
    if status:
        q = q.filter(HighwayAsset.status == status)
    if asset_type:
        q = q.filter(HighwayAsset.asset_type == asset_type)
    return q.offset(skip).limit(limit).all()


@router.get("/map")
def assets_geojson(
    highway_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(HighwayAsset)
    if highway_id:
        q = q.filter(HighwayAsset.highway_id == highway_id)
    if status:
        q = q.filter(HighwayAsset.status == status)

    features = []
    for a in q.all():
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [a.gps_lon, a.gps_lat],
                },
                "properties": {
                    "id": a.id,
                    "asset_type": a.asset_type,
                    "highway_id": a.highway_id,
                    "chainage_km": a.chainage_km,
                    "current_rl": a.current_rl,
                    "irc_minimum_rl": a.irc_minimum_rl,
                    "status": a.status,
                    "material_grade": a.material_grade,
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


@router.get("/{asset_id}", response_model=AssetDetailResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)
    db.commit()
    db.refresh(asset)
    return asset
