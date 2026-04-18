from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Measurement ──────────────────────────────────────────────────────────────

class CreateMeasurement(BaseModel):
    asset_id: int
    rl_value: float
    confidence: Optional[float] = None
    source_layer: str = Field(..., pattern="^(smartphone|cctv|dashcam|qr_code)$")
    conditions_json: Optional[str] = None
    device_info: Optional[str] = None
    image_path: Optional[str] = None


class MeasurementResponse(BaseModel):
    id: int
    asset_id: int
    rl_value: float
    confidence: Optional[float]
    source_layer: str
    conditions_json: Optional[str]
    device_info: Optional[str]
    measured_at: datetime
    image_path: Optional[str]

    class Config:
        from_attributes = True


# ── Asset ────────────────────────────────────────────────────────────────────

class AssetCreate(BaseModel):
    asset_type: str
    highway_id: str
    chainage_km: float
    gps_lat: float
    gps_lon: float
    irc_minimum_rl: float
    material_grade: Optional[str] = None
    installation_date: Optional[datetime] = None
    orientation: Optional[str] = None
    current_rl: Optional[float] = None
    status: str = "compliant"


class AssetUpdate(BaseModel):
    asset_type: Optional[str] = None
    highway_id: Optional[str] = None
    chainage_km: Optional[float] = None
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None
    material_grade: Optional[str] = None
    installation_date: Optional[datetime] = None
    orientation: Optional[str] = None
    current_rl: Optional[float] = None
    irc_minimum_rl: Optional[float] = None
    status: Optional[str] = None
    predicted_failure_date: Optional[datetime] = None


class AssetResponse(BaseModel):
    id: int
    asset_type: str
    highway_id: str
    chainage_km: float
    gps_lat: float
    gps_lon: float
    material_grade: Optional[str]
    installation_date: Optional[datetime]
    orientation: Optional[str]
    current_rl: Optional[float]
    irc_minimum_rl: float
    status: str
    last_measured: Optional[datetime]
    predicted_failure_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AssetDetailResponse(AssetResponse):
    measurements: List[MeasurementResponse] = []

    class Config:
        from_attributes = True


# ── Alert ────────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: int
    asset_id: int
    alert_type: str
    message: str
    highway_id: str
    chainage_km: float
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_assets: int
    compliant_count: int
    warning_count: int
    critical_count: int
    measurements_today: int
    alerts_active: int


class DegradationPoint(BaseModel):
    measured_at: datetime
    rl_value: float
    source_layer: str


class HighwayHealth(BaseModel):
    highway_id: str
    total_assets: int
    compliant: int
    warning: int
    critical: int
    compliance_pct: float


class HeatmapPoint(BaseModel):
    lat: float
    lon: float
    status: str
    rl_ratio: float  # current_rl / irc_minimum_rl


# ── Report ───────────────────────────────────────────────────────────────────

class ComplianceReport(BaseModel):
    highway_id: str
    generated_at: datetime
    total_assets: int
    compliant: int
    warning: int
    critical: int
    compliance_pct: float
    assets_by_type: dict
    critical_assets: List[AssetResponse]


# ── Maintenance ──────────────────────────────────────────────────────────────

class MaintenanceOrderCreate(BaseModel):
    asset_id: int
    priority_score: float = Field(ge=0, le=10)
    status: Optional[str] = Field(default="pending", pattern="^(pending|scheduled|completed)$")
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None


class MaintenanceOrderUpdate(BaseModel):
    priority_score: Optional[float] = Field(default=None, ge=0, le=10)
    status: Optional[str] = Field(default=None, pattern="^(pending|scheduled|completed)$")
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None


class MaintenanceOrderResponse(BaseModel):
    id: int
    asset_id: int
    priority_score: float
    status: str
    scheduled_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── ML ────────────────────────────────────────────────────────────────────────

class RLEstimateRequest(BaseModel):
    image_path: str
    asset_id: Optional[int] = None
    irc_minimum: Optional[float] = None
    distance: Optional[float] = 30.0
    angle: Optional[float] = 0.2


class RLEstimateResponse(BaseModel):
    rl_value: float
    brightness: float
    confidence: float
    distance_m: float
    angle_deg: float
    classification: dict
    engine: str


class DetectionResponse(BaseModel):
    class_: str = Field(alias="class")
    confidence: float
    bbox: List[float]

    class Config:
        populate_by_name = True


class PredictionSeriesPoint(BaseModel):
    day: int
    date: str
    rl: float
    is_forecast: bool


class PredictionResponse(BaseModel):
    summary: dict
    series: List[PredictionSeriesPoint]
