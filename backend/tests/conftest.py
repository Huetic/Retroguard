import os
import sys
from pathlib import Path

# Add backend/ to sys.path so tests can do `from ml_service import ...`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ── Integration-test fixtures ──────────────────────────────────────────────
# Must set DATABASE_URL *before* any app module is imported, because database.py
# reads the env var at module scope when the engine is created.

_TEST_DB = str(Path(__file__).resolve().parent / "test_retroguard.db")
_TEST_DB_URL = f"sqlite:///{_TEST_DB}"


def _clean_db_file():
    p = Path(_TEST_DB)
    if p.exists():
        p.unlink()


import pytest


@pytest.fixture(scope="session", autouse=True)
def _set_test_env():
    """
    Set environment variables before any app module is imported.
    Because database.py reads DATABASE_URL at module-scope we must do this
    before any import of `main` or `database` happens in the test process.
    """
    os.environ["DATABASE_URL"] = _TEST_DB_URL
    os.environ["SEED_DEMO"] = "0"
    yield
    # teardown: remove the test DB file
    _clean_db_file()


@pytest.fixture(scope="session")
def app(_set_test_env):
    """Import and return the FastAPI app after env vars are set."""
    from main import app as _app

    # ml_service._load_ml_imports() temporarily adds ml/ to sys.path to import
    # scripts/predict_degradation.py, which in turn does:
    #   from models.retroreflectivity_model import ...
    # After main is imported, `models` in sys.modules points to backend/models.py,
    # so that import fails and _HAS_PREDICT stays False.  That breaks the pre-existing
    # test_material_factor_changes_prediction which relies on _predict_fn being set.
    #
    # Fix: temporarily hide backend's `models` entry while we pre-warm the ML
    # import cache.  We restore it immediately after so nothing else is affected.
    import sys
    import ml_service
    _saved = sys.modules.pop("models", None)
    try:
        ml_service._load_ml_imports()
    finally:
        if _saved is not None:
            sys.modules["models"] = _saved

    return _app


@pytest.fixture(scope="session")
def client(app):
    """Session-scoped TestClient — fires lifespan once for the whole test session."""
    from starlette.testclient import TestClient
    with TestClient(app) as c:
        yield c
