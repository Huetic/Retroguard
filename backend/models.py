from sqlalchemy import (
    Column, Integer, Float, String, DateTime, Boolean, ForeignKey, Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


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
