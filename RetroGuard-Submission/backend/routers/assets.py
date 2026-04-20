import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional, List

from auth import get_current_user, require_role
from database import get_db
from models import HighwayAsset, User
from schemas import AssetResponse, AssetDetailResponse, AssetUpdate, AssetCreate

_any_staff = get_current_user
_supervisor_up = require_role("supervisor", "admin")
_admin_only = require_role("admin")

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

CSV_TEMPLATE_ROWS = [
    [
        "sign", "NH-48", "234.500", "21.1700", "72.8311",
        "high_intensity", "2022-07-15", "left", "250",
    ],
    [
        "marking", "NH-48", "235.100", "21.1720", "72.8320",
        "thermoplastic", "2023-01-10", "", "150",
    ],
    [
        "sign", "NH-44", "102.250", "28.6139", "77.2090",
        "green_guide_prismatic", "2021-11-04", "overhead", "250",
    ],
    [
        "sign", "NH-27", "418.750", "26.9124", "75.7873",
        "yellow_warning_prismatic", "2020-08-21", "right", "250",
    ],
    [
        "rpm", "NH-66", "67.400", "15.2993", "74.1240",
        "ceramic_marker", "2023-06-18", "median", "100",
    ],
    [
        "delineator", "NH-44", "540.900", "17.3850", "78.4867",
        "high_intensity", "2022-02-12", "left", "120",
    ],
    [
        "marking", "DME", "12.600", "28.4595", "77.0266",
        "cold_plastic", "2024-03-09", "", "150",
    ],
    [
        "sign", "DME", "19.850", "28.5355", "77.3910",
        "high_intensity", "2023-09-25", "left", "250",
    ],
    [
        "rpm", "NH-27", "422.300", "26.8467", "80.9462",
        "raised_pavement_marker", "2022-12-02", "right", "100",
    ],
    [
        "delineator", "NH-66", "71.050", "15.4909", "73.8278",
        "standard_reflector", "2024-01-16", "median", "120",
    ],
]


@router.get("", response_model=List[AssetResponse])
def list_assets(
    highway_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(_any_staff),
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
    _: User = Depends(_any_staff),
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
def get_asset(asset_id: int, db: Session = Depends(get_db), _: User = Depends(_any_staff)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db), _: User = Depends(_supervisor_up)):
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
def create_asset(payload: AssetCreate, db: Session = Depends(get_db), _: User = Depends(_supervisor_up)):
    """Manually register a single asset (e.g. from the UI's 'Add asset' form)."""
    asset = HighwayAsset(**payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/import/template")
def import_template():
    """Download a CSV template with placeholder rows for import testing."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(CSV_COLUMNS)
    w.writerows(CSV_TEMPLATE_ROWS)
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


def _find_duplicate(db: Session, data: dict):
    """
    Returns the matching HighwayAsset if one already exists with same
    (highway_id, asset_type) and chainage_km within ~10m (0.01 km), else None.
    """
    from sqlalchemy import and_
    return (
        db.query(HighwayAsset)
        .filter(
            and_(
                HighwayAsset.highway_id == data["highway_id"],
                HighwayAsset.asset_type == data["asset_type"],
                HighwayAsset.chainage_km >= data["chainage_km"] - 0.01,
                HighwayAsset.chainage_km <= data["chainage_km"] + 0.01,
            )
        )
        .first()
    )


@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db), _: User = Depends(_supervisor_up)):
    """
    Bulk-import assets from a CSV file.

    Expected headers: asset_type, highway_id, chainage_km, gps_lat, gps_lon,
    material_grade, installation_date (YYYY-MM-DD, optional), orientation
    (optional), irc_minimum_rl.

    Response:
      - created:    int (successfully inserted)
      - skipped:    int (errors + duplicates combined count)
      - errors:     [{row, reason}]   — malformed rows
      - duplicates: [{row, data, matched_asset_id}]
                    — rows that matched an existing asset (same highway +
                    type + chainage within 10m). Not inserted. Frontend
                    can let the user review and force-insert via
                    POST /api/assets/import/force.
    """
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Expected a .csv file")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    missing = [c for c in CSV_COLUMNS if c not in (reader.fieldnames or [])]
    if missing:
        raise HTTPException(
            400, f"CSV missing required column(s): {', '.join(missing)}"
        )

    created = 0
    errors: list = []
    duplicates: list = []
    # Track pending inserts in this batch so CSV-internal duplicates are caught too
    batch_keys: set = set()

    for idx, row in enumerate(reader, start=2):
        try:
            data = _parse_row(row)
        except ValueError as e:
            errors.append({"row": idx, "reason": str(e)})
            continue

        key = (
            data["highway_id"],
            data["asset_type"],
            round(data["chainage_km"], 2),
        )

        existing = _find_duplicate(db, data)
        if existing is not None:
            duplicates.append({
                "row": idx,
                "matched_asset_id": existing.id,
                "data": {k: (v.isoformat() if hasattr(v, "isoformat") else v)
                         for k, v in data.items()},
            })
            continue
        if key in batch_keys:
            duplicates.append({
                "row": idx,
                "matched_asset_id": None,  # in-file duplicate, not DB
                "data": {k: (v.isoformat() if hasattr(v, "isoformat") else v)
                         for k, v in data.items()},
            })
            continue

        batch_keys.add(key)
        db.add(HighwayAsset(**data))
        created += 1

    db.commit()
    return {
        "created": created,
        "skipped": len(errors) + len(duplicates),
        "errors": errors[:50],
        "duplicates": duplicates[:100],
    }


@router.post("/import/force")
def import_force(payload: List[AssetCreate], db: Session = Depends(get_db), _: User = Depends(_supervisor_up)):
    """
    Force-insert rows that the normal /import flagged as duplicates.
    Bypasses the duplicate check — use only when the operator has
    confirmed these are genuinely distinct assets.
    """
    created = [HighwayAsset(**r.model_dump()) for r in payload]
    db.add_all(created)
    db.commit()
    for a in created:
        db.refresh(a)
    return {"created": len(created), "ids": [a.id for a in created]}
