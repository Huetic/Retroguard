"""Baseline schema — captures all tables as of 2026-04-18.

Revision ID: 20260418_0001_baseline
Revises: None (initial revision)
Create Date: 2026-04-18

Tables captured:
  highway_assets, measurements, alerts, maintenance_orders,
  contributors, reference_patches, forecasts, job_runs
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260418_0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # contributors — no FKs, created first so measurements/job_runs can ref it
    # ------------------------------------------------------------------
    op.create_table(
        "contributors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("contributor_type", sa.String(length=30), nullable=False),
        sa.Column("api_key_hash", sa.String(length=64), nullable=False),
        sa.Column("api_key_prefix", sa.String(length=16), nullable=True),
        sa.Column("trust_level", sa.Float(), nullable=False),
        sa.Column("contact_email", sa.String(length=200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("api_key_hash"),
    )
    op.create_index("ix_contributors_id", "contributors", ["id"], unique=False)
    op.create_index("ix_contributors_api_key_hash", "contributors", ["api_key_hash"], unique=True)
    op.create_index("ix_contributors_active", "contributors", ["active"], unique=False)

    # ------------------------------------------------------------------
    # highway_assets — no FKs
    # ------------------------------------------------------------------
    op.create_table(
        "highway_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset_type", sa.String(length=50), nullable=False),
        sa.Column("highway_id", sa.String(length=50), nullable=False),
        sa.Column("chainage_km", sa.Float(), nullable=False),
        sa.Column("gps_lat", sa.Float(), nullable=False),
        sa.Column("gps_lon", sa.Float(), nullable=False),
        sa.Column("material_grade", sa.String(length=50), nullable=True),
        sa.Column("installation_date", sa.DateTime(), nullable=True),
        sa.Column("orientation", sa.String(length=50), nullable=True),
        sa.Column("current_rl", sa.Float(), nullable=True),
        sa.Column("irc_minimum_rl", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("last_measured", sa.DateTime(), nullable=True),
        sa.Column("predicted_failure_date", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_highway_assets_id", "highway_assets", ["id"], unique=False)
    op.create_index("ix_highway_assets_asset_type", "highway_assets", ["asset_type"], unique=False)
    op.create_index("ix_highway_assets_highway_id", "highway_assets", ["highway_id"], unique=False)
    op.create_index("ix_highway_assets_status", "highway_assets", ["status"], unique=False)

    # ------------------------------------------------------------------
    # reference_patches — no FKs
    # ------------------------------------------------------------------
    op.create_table(
        "reference_patches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("known_rl", sa.Float(), nullable=False),
        sa.Column("color", sa.String(length=30), nullable=False),
        sa.Column("material_grade", sa.String(length=50), nullable=True),
        sa.Column("deployed_at_lat", sa.Float(), nullable=True),
        sa.Column("deployed_at_lon", sa.Float(), nullable=True),
        sa.Column("highway_id", sa.String(length=50), nullable=True),
        sa.Column("chainage_km", sa.Float(), nullable=True),
        sa.Column("installation_date", sa.DateTime(), nullable=True),
        sa.Column("certification_ref", sa.String(length=200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reference_patches_id", "reference_patches", ["id"], unique=False)
    op.create_index("ix_reference_patches_highway_id", "reference_patches", ["highway_id"], unique=False)
    op.create_index("ix_reference_patches_active", "reference_patches", ["active"], unique=False)

    # ------------------------------------------------------------------
    # measurements — FK → highway_assets, contributors
    # ------------------------------------------------------------------
    op.create_table(
        "measurements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("rl_value", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source_layer", sa.String(length=50), nullable=False),
        sa.Column("conditions_json", sa.Text(), nullable=True),
        sa.Column("device_info", sa.String(length=200), nullable=True),
        sa.Column("measured_at", sa.DateTime(), nullable=True),
        sa.Column("image_path", sa.String(length=500), nullable=True),
        sa.Column("contributor_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["highway_assets.id"]),
        sa.ForeignKeyConstraint(["contributor_id"], ["contributors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_measurements_id", "measurements", ["id"], unique=False)
    op.create_index("ix_measurements_asset_id", "measurements", ["asset_id"], unique=False)
    op.create_index("ix_measurements_measured_at", "measurements", ["measured_at"], unique=False)
    op.create_index("ix_measurements_contributor_id", "measurements", ["contributor_id"], unique=False)

    # ------------------------------------------------------------------
    # alerts — FK → highway_assets
    # ------------------------------------------------------------------
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("highway_id", sa.String(length=50), nullable=False),
        sa.Column("chainage_km", sa.Float(), nullable=False),
        sa.Column("is_resolved", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["highway_assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_id", "alerts", ["id"], unique=False)
    op.create_index("ix_alerts_asset_id", "alerts", ["asset_id"], unique=False)
    op.create_index("ix_alerts_highway_id", "alerts", ["highway_id"], unique=False)
    op.create_index("ix_alerts_is_resolved", "alerts", ["is_resolved"], unique=False)

    # ------------------------------------------------------------------
    # maintenance_orders — FK → highway_assets
    # ------------------------------------------------------------------
    op.create_table(
        "maintenance_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("scheduled_date", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["highway_assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_maintenance_orders_id", "maintenance_orders", ["id"], unique=False)
    op.create_index("ix_maintenance_orders_asset_id", "maintenance_orders", ["asset_id"], unique=False)

    # ------------------------------------------------------------------
    # forecasts — FK → highway_assets
    # ------------------------------------------------------------------
    op.create_table(
        "forecasts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("rl_0", sa.Float(), nullable=True),
        sa.Column("lambda_adjusted", sa.Float(), nullable=True),
        sa.Column("days_to_failure", sa.Float(), nullable=True),
        sa.Column("predicted_failure_date", sa.DateTime(), nullable=True),
        sa.Column("recommended_maintenance_date", sa.DateTime(), nullable=True),
        sa.Column("confidence_low_days", sa.Float(), nullable=True),
        sa.Column("confidence_high_days", sa.Float(), nullable=True),
        sa.Column("model_version", sa.String(length=40), nullable=False),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["highway_assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_forecasts_id", "forecasts", ["id"], unique=False)
    op.create_index("ix_forecasts_asset_id", "forecasts", ["asset_id"], unique=False)
    op.create_index("ix_forecasts_days_to_failure", "forecasts", ["days_to_failure"], unique=False)
    op.create_index("ix_forecasts_predicted_failure_date", "forecasts", ["predicted_failure_date"], unique=False)
    op.create_index("ix_forecasts_computed_at", "forecasts", ["computed_at"], unique=False)

    # ------------------------------------------------------------------
    # job_runs — FK → highway_assets, contributors
    # ------------------------------------------------------------------
    op.create_table(
        "job_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("params_json", sa.Text(), nullable=True),
        sa.Column("result_json", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("asset_id", sa.Integer(), nullable=True),
        sa.Column("contributor_id", sa.Integer(), nullable=True),
        sa.Column("measurements_created", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["highway_assets.id"]),
        sa.ForeignKeyConstraint(["contributor_id"], ["contributors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_runs_id", "job_runs", ["id"], unique=False)
    op.create_index("ix_job_runs_source_type", "job_runs", ["source_type"], unique=False)
    op.create_index("ix_job_runs_status", "job_runs", ["status"], unique=False)
    op.create_index("ix_job_runs_asset_id", "job_runs", ["asset_id"], unique=False)
    op.create_index("ix_job_runs_contributor_id", "job_runs", ["contributor_id"], unique=False)
    op.create_index("ix_job_runs_created_at", "job_runs", ["created_at"], unique=False)


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_index("ix_job_runs_created_at", table_name="job_runs")
    op.drop_index("ix_job_runs_contributor_id", table_name="job_runs")
    op.drop_index("ix_job_runs_asset_id", table_name="job_runs")
    op.drop_index("ix_job_runs_status", table_name="job_runs")
    op.drop_index("ix_job_runs_source_type", table_name="job_runs")
    op.drop_index("ix_job_runs_id", table_name="job_runs")
    op.drop_table("job_runs")

    op.drop_index("ix_forecasts_computed_at", table_name="forecasts")
    op.drop_index("ix_forecasts_predicted_failure_date", table_name="forecasts")
    op.drop_index("ix_forecasts_days_to_failure", table_name="forecasts")
    op.drop_index("ix_forecasts_asset_id", table_name="forecasts")
    op.drop_index("ix_forecasts_id", table_name="forecasts")
    op.drop_table("forecasts")

    op.drop_index("ix_maintenance_orders_asset_id", table_name="maintenance_orders")
    op.drop_index("ix_maintenance_orders_id", table_name="maintenance_orders")
    op.drop_table("maintenance_orders")

    op.drop_index("ix_alerts_is_resolved", table_name="alerts")
    op.drop_index("ix_alerts_highway_id", table_name="alerts")
    op.drop_index("ix_alerts_asset_id", table_name="alerts")
    op.drop_index("ix_alerts_id", table_name="alerts")
    op.drop_table("alerts")

    op.drop_index("ix_measurements_contributor_id", table_name="measurements")
    op.drop_index("ix_measurements_measured_at", table_name="measurements")
    op.drop_index("ix_measurements_asset_id", table_name="measurements")
    op.drop_index("ix_measurements_id", table_name="measurements")
    op.drop_table("measurements")

    op.drop_index("ix_reference_patches_active", table_name="reference_patches")
    op.drop_index("ix_reference_patches_highway_id", table_name="reference_patches")
    op.drop_index("ix_reference_patches_id", table_name="reference_patches")
    op.drop_table("reference_patches")

    op.drop_index("ix_highway_assets_status", table_name="highway_assets")
    op.drop_index("ix_highway_assets_highway_id", table_name="highway_assets")
    op.drop_index("ix_highway_assets_asset_type", table_name="highway_assets")
    op.drop_index("ix_highway_assets_id", table_name="highway_assets")
    op.drop_table("highway_assets")

    op.drop_index("ix_contributors_active", table_name="contributors")
    op.drop_index("ix_contributors_api_key_hash", table_name="contributors")
    op.drop_index("ix_contributors_id", table_name="contributors")
    op.drop_table("contributors")
