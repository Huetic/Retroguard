from contextlib import asynccontextmanager
from pathlib import Path

# Load .env before importing anything that touches DATABASE_URL
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, SessionLocal, Base
from models import HighwayAsset, Measurement, Alert, MaintenanceOrder  # noqa: F401 — ensure tables registered
from seed_data import seed

from routers import (
    assets, measurements, alerts, dashboard, reports,
    ml, maintenance, qr, uploads,
)

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Toggle: set SEED_DEMO=0 in backend/.env to start with an empty DB.
    # Default is ON so first-time contributors still see a populated demo.
    import os
    if os.getenv("SEED_DEMO", "1") != "0":
        db = SessionLocal()
        try:
            seed(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title="RetroGuard API",
    description="AI-powered retroreflectivity assessment system for Indian national highways",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Mount routers
app.include_router(assets.router)
app.include_router(measurements.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(ml.router)
app.include_router(maintenance.router)
app.include_router(qr.router)
app.include_router(uploads.router)


@app.get("/")
def root():
    return {
        "name": "RetroGuard API",
        "version": "1.1.0",
        "docs": "/docs",
        "description": "AI-powered retroreflectivity assessment for NHAI",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
