from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, SessionLocal, Base
from models import HighwayAsset, Measurement, Alert, MaintenanceOrder  # noqa: F401 — ensure tables registered
from seed_data import seed

from routers import assets, measurements, alerts, dashboard, reports, ml, maintenance, qr


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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

# Mount routers
app.include_router(assets.router)
app.include_router(measurements.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(ml.router)
app.include_router(maintenance.router)
app.include_router(qr.router)

# Serve uploaded images so frontend can display them via image_path
_UPLOADS = Path(__file__).resolve().parent / "uploads"
_UPLOADS.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_UPLOADS)), name="uploads")


@app.get("/")
def root():
    return {
        "name": "RetroGuard API",
        "version": "1.0.0",
        "docs": "/docs",
        "description": "AI-powered retroreflectivity assessment for NHAI",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
