"""
Unit tests for ml_service.predict_degradation.

Tests call predict_degradation directly — no mocking, no DB, no server.
"""
import pytest
from datetime import datetime, timezone

from ml_service import predict_degradation


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SMOOTH_DECAY = [
    {"day": 0,   "rl": 500},
    {"day": 365, "rl": 400},
    {"day": 730, "rl": 320},
]


def _parse_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d")


# ---------------------------------------------------------------------------
# Test 1: smooth decay → sensible failure date
# ---------------------------------------------------------------------------

def test_smooth_decay_produces_reasonable_failure_date():
    result = predict_degradation(SMOOTH_DECAY, irc_minimum=200)
    summary = result["summary"]

    assert summary["days_to_failure"] > 730, (
        f"Expected failure beyond the seed data horizon (>730), got {summary['days_to_failure']}"
    )
    assert abs(summary["rl_0"] - 500) <= 100, (
        f"rl_0 should be near 500 (±100), got {summary['rl_0']}"
    )
    assert summary["lambda_adjusted"] > 0, "lambda_adjusted must be positive"
    # predicted_failure_date should parse as YYYY-MM-DD
    parsed = _parse_date(summary["predicted_failure_date"])
    assert parsed.year >= 2020


# ---------------------------------------------------------------------------
# Test 2: asset already below IRC minimum
# ---------------------------------------------------------------------------

def test_already_failed_asset_returns_past_or_early_failure():
    # RL drops from 500 to 150 over 400 days; irc_minimum=200
    # The exponential fit should place the threshold crossing before day 400.
    install = datetime(2025, 1, 1)
    measurements = [{"day": 0, "rl": 500}, {"day": 400, "rl": 150}]
    result = predict_degradation(measurements, irc_minimum=200, install_date=install)
    summary = result["summary"]

    # days_to_failure must be non-negative (function never returns negative)
    assert summary["days_to_failure"] >= 0

    # The predicted failure date must be on or before the last measurement date
    last_meas_date = datetime(2025, 1, 1).replace()
    # install + 400 days
    last_meas_date = datetime(2025, 1, 1)
    from datetime import timedelta
    last_meas_date = install + timedelta(days=400)
    failure_date = _parse_date(summary["predicted_failure_date"])
    assert failure_date <= last_meas_date, (
        f"Failure ({failure_date.date()}) should be ≤ last measurement ({last_meas_date.date()})"
    )


# ---------------------------------------------------------------------------
# Test 3: single measurement — doesn't crash, returns dict with expected keys
# ---------------------------------------------------------------------------

def test_requires_at_least_two_measurements_does_not_crash():
    # The analytic fallback handles 1 measurement by using rl_0=rs[0], lam=1e-4.
    # The function should return a valid summary dict (not raise).
    result = predict_degradation([{"day": 0, "rl": 500}], irc_minimum=200)
    summary = result["summary"]
    required_keys = {
        "rl_0", "lambda_adjusted", "days_to_failure",
        "predicted_failure_date", "irc_minimum",
    }
    assert required_keys.issubset(summary.keys()), (
        f"Missing keys in summary: {required_keys - summary.keys()}"
    )
    assert isinstance(summary["days_to_failure"], (int, float))
    assert summary["days_to_failure"] >= 0


# ---------------------------------------------------------------------------
# Test 4: series spans history + forecast horizon
# ---------------------------------------------------------------------------

def test_series_spans_history_plus_horizon():
    result = predict_degradation(SMOOTH_DECAY, irc_minimum=200, horizon_days=365)
    series = result["series"]

    historical = [p for p in series if not p["is_forecast"]]
    forecasted = [p for p in series if p["is_forecast"]]

    assert len(historical) >= len(SMOOTH_DECAY), (
        "Should have at least as many historical points as input measurements"
    )
    assert len(forecasted) > 0, "Should have at least one forecasted point"

    last_historical_day = max(p["day"] for p in historical)
    first_forecast_day = min(p["day"] for p in forecasted)
    assert first_forecast_day > last_historical_day, (
        "Forecast points must extend beyond the last historical day"
    )


# ---------------------------------------------------------------------------
# Test 5: material grade changes decay rate and days_to_failure
# ---------------------------------------------------------------------------

def test_material_factor_changes_prediction():
    # engineering factor=1.5 (degrades faster), diamond factor=0.7 (slower)
    r_eng = predict_degradation(SMOOTH_DECAY, irc_minimum=200, material="engineering")
    r_dia = predict_degradation(SMOOTH_DECAY, irc_minimum=200, material="diamond")

    eng_days = r_eng["summary"]["days_to_failure"]
    dia_days = r_dia["summary"]["days_to_failure"]

    assert dia_days > eng_days, (
        f"Diamond ({dia_days:.1f} days) should outlast engineering ({eng_days:.1f} days)"
    )
    # lambda_adjusted should differ between materials
    assert r_eng["summary"]["lambda_adjusted"] != r_dia["summary"]["lambda_adjusted"]


# ---------------------------------------------------------------------------
# Test 6: empty measurements raises ValueError
# ---------------------------------------------------------------------------

def test_empty_measurements_raises():
    with pytest.raises(ValueError):
        predict_degradation([], irc_minimum=200)


# ---------------------------------------------------------------------------
# Test 7: return structure has both 'summary' and 'series' keys
# ---------------------------------------------------------------------------

def test_return_structure_has_required_top_level_keys():
    result = predict_degradation(SMOOTH_DECAY, irc_minimum=200)
    assert "summary" in result
    assert "series" in result
    assert isinstance(result["series"], list)
    assert len(result["series"]) > 0


# ---------------------------------------------------------------------------
# Test 8: days_to_failure scales inversely with irc_minimum
# ---------------------------------------------------------------------------

def test_higher_irc_minimum_means_earlier_failure():
    r_low  = predict_degradation(SMOOTH_DECAY, irc_minimum=100)
    r_high = predict_degradation(SMOOTH_DECAY, irc_minimum=300)

    assert r_low["summary"]["days_to_failure"] > r_high["summary"]["days_to_failure"], (
        "Higher IRC minimum should trigger failure sooner"
    )
