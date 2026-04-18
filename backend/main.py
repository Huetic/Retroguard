import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command


def _run_migrations() -> None:
    """Run `alembic upgrade head` programmatically against the configured DB."""
    backend_dir = Path(__file__).resolve().parent
    cfg = AlembicConfig(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    # Honour DATABASE_URL already set in the environment (including the test override).
    cfg.set_main_option(
        "sqlalchemy.url",
        os.getenv("DATABASE_URL", "sqlite:///./retroguard.db"),
    )
    alembic_command.upgrade(cfg, "head")

# Load .env before importing anything that touches DATABASE_URL
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Structured JSON logging — set up before any other module emits log records
# ---------------------------------------------------------------------------
from pythonjsonlogger import jsonlogger  # noqa: E402 — must follow dotenv load


def _configure_json_logging() -> None:
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
        datefmt="%Y-%m-%dT%H:%M:%S+00:00",
    )
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)

    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        lg = logging.getLogger(logger_name)
        lg.handlers = [handler]
        lg.propagate = False


_configure_json_logging()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from slowapi import _rate_limit_exceeded_handler  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402
from slowapi.middleware import SlowAPIMiddleware  # noqa: E402
from sqlalchemy import text  # noqa: E402

from database import engine, SessionLocal, Base  # noqa: E402
from janitor import sweep_stale_jobs  # noqa: E402
from models import (  # noqa: F401,E402 — ensure tables registered
    HighwayAsset, Measurement, Alert, MaintenanceOrder,
    JobRun, ReferencePatch, Contributor, Forecast,
)
from rate_limit import limiter  # noqa: E402
from seed_data import seed  # noqa: E402

from routers import (  # noqa: E402
    assets, measurements, alerts, dashboard, reports,
    ml, maintenance, qr, uploads, ingest, patches, contributors, forecast,
)

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_migrations()
    # Base.metadata.create_all(bind=engine)  # replaced by alembic upgrade head

    # Log DB driver (never the password)
    db_url_safe = engine.url.render_as_string(hide_password=True)
    driver = db_url_safe.split("://")[0] if "://" in db_url_safe else db_url_safe
    logger.info("App startup", extra={"db_driver": driver, "version": app.version})

    # Heal any stuck jobs left over from a previous crash
    db = SessionLocal()
    try:
        swept = sweep_stale_jobs(db)
        if swept:
            logger.info("Startup janitor swept stale jobs", extra={"swept": swept})
    finally:
        db.close()

    # Toggle: set SEED_DEMO=0 in backend/.env to start with an empty DB.
    # Default is ON so first-time contributors still see a populated demo.
    if os.getenv("SEED_DEMO", "1") != "0":
        db = SessionLocal()
        try:
            seed(db)
        finally:
            db.close()

    async def _periodic_sweep():
        while True:
            await asyncio.sleep(300)  # every 5 min
            db = SessionLocal()
            try:
                sweep_stale_jobs(db)
            except Exception:
                pass
            finally:
                db.close()

    task = asyncio.create_task(_periodic_sweep())
    yield
    task.cancel()


app = FastAPI(
    title="RetroGuard API",
    description="AI-powered retroreflectivity assessment system for Indian national highways",
    version="1.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---------------------------------------------------------------------------
# CORS — origins from env var, defaulting to localhost dev ports
# ---------------------------------------------------------------------------
_raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3005",
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images — this mount is only valid while the Storage backend is local filesystem.
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
app.include_router(ingest.router)
app.include_router(ingest.contribute_router)
app.include_router(patches.router)
app.include_router(contributors.router)
app.include_router(forecast.router)


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
    timestamp = datetime.now(timezone.utc).isoformat()
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "ok",
            "db": "ok",
            "timestamp": timestamp,
            "version": app.version,
        }
    except Exception as exc:
        db.close()
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "db": "error",
                "timestamp": timestamp,
                "version": app.version,
                "error": str(exc).splitlines()[0],
            },
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
