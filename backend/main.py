from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, SessionLocal, Base
from models import HighwayAsset, Measurement, Alert, MaintenanceOrder  # noqa: F401 — ensure tables registered
from seed_data import seed

from routers import assets, measurements, alerts, dashboard, reports

app = FastAPI(
    title="RetroGuard API",
    description="AI-powered retroreflectivity assessment system for Indian national highways",
    version="1.0.0",
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


@app.on_event("startup")
def on_startup():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    # Seed if database is empty
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


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
