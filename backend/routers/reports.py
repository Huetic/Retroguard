from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from database import get_db
from models import HighwayAsset
from schemas import ComplianceReport, AssetResponse

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/compliance", response_model=ComplianceReport)
def compliance_report(
    highway_id: str = Query(..., description="Highway ID, e.g. NH-48"),
    db: Session = Depends(get_db),
):
    assets = (
        db.query(HighwayAsset)
        .filter(HighwayAsset.highway_id == highway_id)
        .all()
    )
    if not assets:
        raise HTTPException(status_code=404, detail=f"No assets found for {highway_id}")

    total = len(assets)
    compliant = sum(1 for a in assets if a.status == "compliant")
    warning = sum(1 for a in assets if a.status == "warning")
    critical = sum(1 for a in assets if a.status == "critical")

    # Breakdown by asset type
    by_type = {}
    for a in assets:
        t = a.asset_type
        if t not in by_type:
            by_type[t] = {"total": 0, "compliant": 0, "warning": 0, "critical": 0}
        by_type[t]["total"] += 1
        by_type[t][a.status] += 1

    critical_assets = [a for a in assets if a.status == "critical"]

    return ComplianceReport(
        highway_id=highway_id,
        generated_at=datetime.utcnow(),
        total_assets=total,
        compliant=compliant,
        warning=warning,
        critical=critical,
        compliance_pct=round((compliant / total) * 100, 1) if total else 0.0,
        assets_by_type=by_type,
        critical_assets=critical_assets,
    )
