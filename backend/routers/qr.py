"""Layer 6: degradation-encoding QR codes for signs."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import base64
import io
import json

from database import get_db
from models import HighwayAsset

try:
    import qrcode  # type: ignore
    _HAS_QR = True
except Exception:
    _HAS_QR = False

router = APIRouter(prefix="/api/qr", tags=["QR"])


class QRPayload(BaseModel):
    asset_id: int
    highway_id: str
    chainage_km: float
    asset_type: str
    install_date: Optional[str]
    material_grade: Optional[str]
    irc_minimum_rl: float
    last_rl: Optional[float]
    predicted_failure_date: Optional[str]
    generated_at: str


class QRDecodeRequest(BaseModel):
    payload: str  # raw decoded QR text (JSON) OR base64-encoded JSON


def _asset_payload(a: HighwayAsset) -> QRPayload:
    return QRPayload(
        asset_id=a.id,
        highway_id=a.highway_id,
        chainage_km=a.chainage_km,
        asset_type=a.asset_type,
        install_date=a.installation_date.isoformat() if a.installation_date else None,
        material_grade=a.material_grade,
        irc_minimum_rl=a.irc_minimum_rl,
        last_rl=a.current_rl,
        predicted_failure_date=a.predicted_failure_date.isoformat()
        if a.predicted_failure_date
        else None,
        generated_at=datetime.utcnow().isoformat(),
    )


@router.get("/{asset_id}/payload", response_model=QRPayload)
def qr_payload(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    return _asset_payload(asset)


@router.get("/{asset_id}/image")
def qr_image(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if not _HAS_QR:
        raise HTTPException(
            503,
            "qrcode package not installed. `pip install qrcode[pil]` to enable.",
        )
    payload = _asset_payload(asset).model_dump_json()
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(buf.getvalue(), media_type="image/png")


@router.post("/decode")
def qr_decode(req: QRDecodeRequest, db: Session = Depends(get_db)):
    """Decode a scanned QR string — accepts raw JSON or base64-encoded JSON."""
    raw = req.payload.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        try:
            data = json.loads(base64.b64decode(raw).decode("utf-8"))
        except Exception:
            raise HTTPException(400, "payload is neither JSON nor base64-encoded JSON")

    asset_id = data.get("asset_id")
    if not asset_id:
        raise HTTPException(400, "payload missing asset_id")

    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        return {"decoded": data, "asset": None, "match": False}

    return {"decoded": data, "asset_id": asset.id, "match": True, "current_status": asset.status}
