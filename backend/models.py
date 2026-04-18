from sqlalchemy import (
    Column, Integer, Float, String, DateTime, Boolean, ForeignKey, Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class User(Base):
    """Staff user for JWT-based authentication. Separate from contributor/API-key auth."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(200), nullable=True)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="inspector")  # admin | supervisor | inspector
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class HighwayAsset(Base):
    __tablename__ = "highway_assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_type = Column(String(50), nullable=False, index=True)  # sign / marking / rpm / delineator
    highway_id = Column(String(50), nullable=False, index=True)
    chainage_km = Column(Float, nullable=False)
    gps_lat = Column(Float, nullable=False)
    gps_lon = Column(Float, nullable=False)
    material_grade = Column(String(50), nullable=True)
    installation_date = Column(DateTime, nullable=True)
    orientation = Column(String(50), nullable=True)  # e.g. left / right / overhead
    current_rl = Column(Float, nullable=True)
    irc_minimum_rl = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default="compliant", index=True)  # compliant / warning / critical
    last_measured = Column(DateTime, nullable=True)
    predicted_failure_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    measurements = relationship("Measurement", back_populates="asset", order_by="Measurement.measured_at")
    alerts = relationship("Alert", back_populates="asset")
    maintenance_orders = relationship("MaintenanceOrder", back_populates="asset")


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("highway_assets.id"), nullable=False, index=True)
    rl_value = Column(Float, nullable=False)
    confidence = Column(Float, nullable=True)
    source_layer = Column(String(50), nullable=False)  # smartphone / cctv / dashcam / qr_code
    conditions_json = Column(Text, nullable=True)
    device_info = Column(String(200), nullable=True)
    measured_at = Column(DateTime, default=datetime.utcnow, index=True)
    image_path = Column(String(500), nullable=True)
    contributor_id = Column(Integer, ForeignKey("contributors.id"), nullable=True, index=True)

    asset = relationship("HighwayAsset", back_populates="measurements")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("highway_assets.id"), nullable=False, index=True)
    alert_type = Column(String(20), nullable=False)  # critical / warning / info
    message = Column(Text, nullable=False)
    highway_id = Column(String(50), nullable=False, index=True)
    chainage_km = Column(Float, nullable=False)
    is_resolved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    asset = relationship("HighwayAsset", back_populates="alerts")


class MaintenanceOrder(Base):
    __tablename__ = "maintenance_orders"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("highway_assets.id"), nullable=False, index=True)
    priority_score = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending / scheduled / completed
    scheduled_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    asset = relationship("HighwayAsset", back_populates="maintenance_orders")


class Contributor(Base):
    """
    Layer 4: external organizations/individuals contributing dashcam data
    through the public /api/contribute/* endpoints via API key.
    """
    __tablename__ = "contributors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    contributor_type = Column(String(30), nullable=False, default="fleet")
    # ^ fleet / civic / individual / partner
    api_key_hash = Column(String(64), nullable=False, unique=True, index=True)
    api_key_prefix = Column(String(16), nullable=True)
    trust_level = Column(Float, nullable=False, default=0.5)  # 0.0 – 1.0
    contact_email = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    active = Column(Boolean, default=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)


class ReferencePatch(Base):
    """
    Layer 3: a physical retroreflective patch with a lab-certified R_L value.
    Placed in the camera's view during measurement so the software can
    compute an absolute calibration factor from its observed brightness.
    """
    __tablename__ = "reference_patches"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(100), nullable=False)            # e.g. "DME toll plaza #2 · patch A"
    known_rl = Column(Float, nullable=False)               # mcd/lx/m^2, lab-certified
    color = Column(String(30), nullable=False, default="white")  # white / yellow / orange
    material_grade = Column(String(50), nullable=True)
    deployed_at_lat = Column(Float, nullable=True)
    deployed_at_lon = Column(Float, nullable=True)
    highway_id = Column(String(50), nullable=True, index=True)
    chainage_km = Column(Float, nullable=True)
    installation_date = Column(DateTime, nullable=True)
    certification_ref = Column(String(200), nullable=True)  # lab cert number / pdf link
    notes = Column(Text, nullable=True)
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Forecast(Base):
    """
    Layer 5: a snapshot of a degradation forecast for an asset, saved so
    we can see how predictions evolved over time (accuracy tracking) and
    serve the risk-register fleet view without recomputing every request.
    """
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("highway_assets.id"), nullable=False, index=True)
    rl_0 = Column(Float, nullable=True)
    lambda_adjusted = Column(Float, nullable=True)
    days_to_failure = Column(Float, nullable=True, index=True)
    predicted_failure_date = Column(DateTime, nullable=True, index=True)
    recommended_maintenance_date = Column(DateTime, nullable=True)
    confidence_low_days = Column(Float, nullable=True)
    confidence_high_days = Column(Float, nullable=True)
    model_version = Column(String(40), nullable=False, default="exp-decay-multifactor-v1")
    computed_at = Column(DateTime, default=datetime.utcnow, index=True)


class JobRun(Base):
    """
    Tracks every background ingestion job (video uploads, bulk imports, etc.).
    Gives the UI a persistent history and lets users poll progress.
    """
    __tablename__ = "job_runs"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String(30), nullable=False, index=True)  # cctv / dashcam / csv / ...
    status = Column(String(20), nullable=False, default="queued", index=True)  # queued / running / done / failed
    params_json = Column(Text, nullable=True)      # json of the original request
    result_json = Column(Text, nullable=True)      # json of the final result (counts, etc.)
    error = Column(Text, nullable=True)
    asset_id = Column(Integer, ForeignKey("highway_assets.id"), nullable=True, index=True)
    contributor_id = Column(Integer, ForeignKey("contributors.id"), nullable=True, index=True)
    measurements_created = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
