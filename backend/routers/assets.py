import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db
from models import HighwayAsset
from schemas import AssetResponse, AssetDetailResponse, AssetUpdate, AssetCreate

router = APIRouter(prefix="/api/assets", tags=["Assets"])


# CSV columns required on import. Order matches template download.
CSV_COLUMNS = [
    "asset_type",
    "highway_id",
    "chainage_km",
    "gps_lat",
    "gps_lon",
    "material_grade",
    "installation_date",
    "orientation",
    "irc_minimum_rl",
]


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


# ── Onboarding ──────────────────────────────────────────────────────────────

@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    """Manually register a single asset (e.g. from the UI's 'Add asset' form)."""
    asset = HighwayAsset(**payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/import/template")
def import_template():
    """Download a CSV template — blank headers + 2 example rows."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(CSV_COLUMNS)
    w.writerow([
        "sign", "NH-48", "234.5", "21.1700", "72.8311",
        "high_intensity", "2022-07-15", "left", "250",
    ])
    w.writerow([
        "marking", "NH-48", "235.1", "21.1720", "72.8320",
        "standard", "2023-01-10", "", "150",
    ])
    return Response(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="assets_template.csv"'},
    )


def _parse_row(row: dict) -> dict:
    """Coerce CSV string values → model field types. Raises ValueError on bad input."""
    asset_type = (row.get("asset_type") or "").strip()
    highway_id = (row.get("highway_id") or "").strip()
    if not asset_type or not highway_id:
        raise ValueError("asset_type and highway_id are required")

    try:
        chainage_km = float(row["chainage_km"])
        gps_lat = float(row["gps_lat"])
        gps_lon = float(row["gps_lon"])
        irc_minimum_rl = float(row["irc_minimum_rl"])
    except (KeyError, ValueError, TypeError) as e:
        raise ValueError(f"numeric field invalid: {e}")

    if not (-90 <= gps_lat <= 90 and -180 <= gps_lon <= 180):
        raise ValueError("gps coords out of range")

    installation_date = None
    raw = (row.get("installation_date") or "").strip()
    if raw:
        try:
            installation_date = datetime.strptime(raw, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"installation_date must be YYYY-MM-DD, got {raw!r}")

    return {
        "asset_type": asset_type,
        "highway_id": highway_id,
        "chainage_km": chainage_km,
        "gps_lat": gps_lat,
        "gps_lon": gps_lon,
        "material_grade": (row.get("material_grade") or "").strip() or None,
        "installation_date": installation_date,
        "orientation": (row.get("orientation") or "").strip() or None,
        "irc_minimum_rl": irc_minimum_rl,
        "status": "compliant",
    }


@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Bulk-import assets from a CSV file.

    Expected headers: asset_type, highway_id, chainage_km, gps_lat, gps_lon,
    material_grade, installation_date (YYYY-MM-DD, optional), orientation
    (optional), irc_minimum_rl.

    Returns {created, skipped, errors:[{row, reason}]}. Rows with errors
    do NOT block other rows — valid rows still get inserted.
    """
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Expected a .csv file")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")  # strips BOM if present
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    missing = [c for c in CSV_COLUMNS if c not in (reader.fieldnames or [])]
    if missing:
        raise HTTPException(
            400, f"CSV missing required column(s): {', '.join(missing)}"
        )

    created = 0
    skipped = 0
    errors: list = []

    for idx, row in enumerate(reader, start=2):  # header is row 1
        try:
            data = _parse_row(row)
            db.add(HighwayAsset(**data))
            created += 1
        except ValueError as e:
            skipped += 1
            errors.append({"row": idx, "reason": str(e)})

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors[:50]}
