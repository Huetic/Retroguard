"""Layer 6: degradation-encoding QR codes for signs."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import base64
import io
import json

from auth import get_current_user
from database import get_db
from models import HighwayAsset, Measurement, User
from rate_limit import limiter
from routers.measurements import _update_asset_status

_any_staff = get_current_user

try:
    import qrcode  # type: ignore
    _HAS_QR = True
except Exception:
    _HAS_QR = False

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.utils import ImageReader
    _HAS_RL = True
except Exception:
    _HAS_RL = False

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
def qr_payload(asset_id: int, db: Session = Depends(get_db), _: User = Depends(_any_staff)):
    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    return _asset_payload(asset)


@router.get("/{asset_id}/image")
def qr_image(asset_id: int, db: Session = Depends(get_db), _: User = Depends(_any_staff)):
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
@limiter.limit("20/minute")
def qr_decode(request: Request, req: QRDecodeRequest, db: Session = Depends(get_db), _: User = Depends(_any_staff)):
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


# ── Bulk printing ───────────────────────────────────────────────────────────

@router.get("/bulk/pdf")
def bulk_qr_pdf(
    highway_id: Optional[str] = Query(None, description="Filter to a single highway"),
    asset_type: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(_any_staff),
):
    """
    Generate a printable PDF sheet of QR codes — one per asset matching the
    filters. Field crews print it, laminate, and deploy in one maintenance
    sweep.
    """
    if not _HAS_QR or not _HAS_RL:
        raise HTTPException(
            503, "qrcode and/or reportlab not installed. pip install qrcode[pil] reportlab."
        )

    q = db.query(HighwayAsset)
    if highway_id:
        q = q.filter(HighwayAsset.highway_id == highway_id)
    if asset_type:
        q = q.filter(HighwayAsset.asset_type == asset_type)
    assets = q.limit(limit).all()
    if not assets:
        raise HTTPException(404, "No assets match the filters")

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    cols = 3
    rows = 4
    per_page = cols * rows
    margin = 1.2 * cm
    cell_w = (w - 2 * margin) / cols
    cell_h = (h - 2 * margin) / rows

    for idx, a in enumerate(assets):
        slot = idx % per_page
        if slot == 0 and idx > 0:
            c.showPage()

        col = slot % cols
        row = slot // cols
        x = margin + col * cell_w
        y = h - margin - (row + 1) * cell_h

        # QR image
        payload = _asset_payload(a).model_dump_json()
        img = qrcode.make(payload)
        png_buf = io.BytesIO()
        img.save(png_buf, format="PNG")
        png_buf.seek(0)
        qr_size = min(cell_w, cell_h) - 1.4 * cm
        c.drawImage(
            ImageReader(png_buf),
            x + (cell_w - qr_size) / 2,
            y + (cell_h - qr_size) / 2 + 0.2 * cm,
            width=qr_size,
            height=qr_size,
        )

        # Caption
        c.setFont("Helvetica", 8)
        c.drawCentredString(x + cell_w / 2, y + 0.8 * cm, f"{a.highway_id} · km {a.chainage_km}")
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(x + cell_w / 2, y + 0.3 * cm, f"#{a.id} · {a.asset_type}")

    c.save()
    filename = f"qr_sheet_{highway_id or 'all'}_{datetime.utcnow():%Y%m%d}.pdf"
    return Response(
        buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Scan-to-measurement ─────────────────────────────────────────────────────

class QRScanMeasurementRequest(BaseModel):
    payload: str                       # the raw QR text (JSON or b64 JSON)
    rl_value: float = Field(ge=0)      # the measured R_L the inspector got
    confidence: Optional[float] = None
    device_info: Optional[str] = None


@router.post("/scan-measurement", status_code=201)
@limiter.limit("30/minute")
def qr_scan_measurement(request: Request, req: QRScanMeasurementRequest, db: Session = Depends(get_db), _: User = Depends(_any_staff)):
    """
    Inspector scans a sign's QR with the phone, the app extracts asset_id
    from the payload, and we log a measurement in one round-trip — no
    manual asset lookup needed in the field.
    """
    raw = req.payload.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        try:
            data = json.loads(base64.b64decode(raw).decode("utf-8"))
        except Exception:
            raise HTTPException(400, "QR payload is neither JSON nor base64 JSON")

    asset_id = data.get("asset_id")
    if not asset_id:
        raise HTTPException(400, "QR payload missing asset_id")

    asset = db.query(HighwayAsset).filter(HighwayAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, f"Asset #{asset_id} from QR not found")

    m = Measurement(
        asset_id=asset_id,
        rl_value=req.rl_value,
        confidence=req.confidence,
        source_layer="qr_code",
        conditions_json=json.dumps({"via": "qr-scan", "scanned_payload": data}),
        device_info=req.device_info,
        measured_at=datetime.utcnow(),
    )
    db.add(m)
    _update_asset_status(asset, req.rl_value, db)
    db.commit()
    db.refresh(m)
    return {
        "measurement_id": m.id,
        "asset_id": asset_id,
        "rl_value": m.rl_value,
        "new_status": asset.status,
    }
