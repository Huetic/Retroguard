import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Make sure the backend package is on the path so we can import database/models
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Base and ALL models so autogenerate sees the full schema
from database import Base  # noqa: F401
import models  # noqa: F401 — registers HighwayAsset, Measurement, Alert,
               #               MaintenanceOrder, Contributor, ReferencePatch,
               #               Forecast, JobRun on Base.metadata

# ---------------------------------------------------------------------------
# Alembic Config object (gives access to .ini values)
# ---------------------------------------------------------------------------
config = context.config

# Honour logging config in alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Source of truth for autogenerate
target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Database URL: prefer environment variable, fall back to dev SQLite
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./retroguard.db")
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection required)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (live DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
