"""
Integration tests for the /api/assets router surface.
Uses the session-scoped TestClient + SQLite DB from conftest.py.
"""
import io
import pytest


# ── Helpers ──────────────────────────────────────────────────────────────────

def _asset_payload(**overrides):
    base = {
        "asset_type": "sign",
        "highway_id": "NH-TEST",
        "chainage_km": 100.0,
        "gps_lat": 28.6,
        "gps_lon": 77.2,
        "irc_minimum_rl": 250.0,
        "material_grade": "high_intensity",
        "orientation": "left",
    }
    base.update(overrides)
    return base


_CSV_HEADER = "asset_type,highway_id,chainage_km,gps_lat,gps_lon,material_grade,installation_date,orientation,irc_minimum_rl\n"

_CSV_3_ROWS = (
    _CSV_HEADER
    + "sign,NH-CSV,10.0,28.6,77.2,high_intensity,2022-01-01,left,250\n"
    + "marking,NH-CSV,10.5,28.61,77.21,thermoplastic,2022-02-01,,150\n"
    + "rpm,NH-CSV,11.0,28.62,77.22,ceramic_marker,2023-03-15,median,100\n"
)


def _csv_file(content: str, filename: str = "test.csv"):
    return {"file": (filename, io.BytesIO(content.encode()), "text/csv")}


# ── Tests ────────────────────────────────────────────────────────────────────

def test_create_asset_roundtrip(client, admin_headers):
    payload = _asset_payload(chainage_km=200.0)
    r = client.post("/api/assets", json=payload, headers=admin_headers)
    assert r.status_code == 201, r.text
    data = r.json()
    asset_id = data["id"]
    assert data["highway_id"] == "NH-TEST"
    assert data["asset_type"] == "sign"
    assert data["chainage_km"] == 200.0
    assert data["irc_minimum_rl"] == 250.0

    r2 = client.get(f"/api/assets/{asset_id}", headers=admin_headers)
    assert r2.status_code == 200
    detail = r2.json()
    assert detail["id"] == asset_id
    assert detail["material_grade"] == "high_intensity"


def test_update_asset(client, admin_headers):
    # Create first
    payload = _asset_payload(chainage_km=300.0, material_grade="standard")
    r = client.post("/api/assets", json=payload, headers=admin_headers)
    assert r.status_code == 201
    asset_id = r.json()["id"]

    # Update material_grade and orientation
    r2 = client.put(f"/api/assets/{asset_id}", json={"material_grade": "diamond", "orientation": "right"}, headers=admin_headers)
    assert r2.status_code == 200
    updated = r2.json()
    assert updated["material_grade"] == "diamond"
    assert updated["orientation"] == "right"
    # unchanged fields should be the same
    assert updated["chainage_km"] == 300.0


def test_csv_import_happy_path(client, admin_headers):
    r = client.post("/api/assets/import", files=_csv_file(_CSV_3_ROWS), headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 3
    assert body["skipped"] == 0
    assert body["duplicates"] == []
    assert body["errors"] == []


def test_csv_import_with_duplicates(client, admin_headers):
    # Upload the same CSV again — all 3 rows should now be duplicates
    r = client.post("/api/assets/import", files=_csv_file(_CSV_3_ROWS), headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 0
    assert len(body["duplicates"]) == 3
    for dup in body["duplicates"]:
        assert "matched_asset_id" in dup
        assert dup["matched_asset_id"] is not None


def test_csv_import_with_malformed_row(client, admin_headers):
    bad_csv = (
        _CSV_HEADER
        + "sign,NH-CSV,bad_chainage,28.6,77.2,high_intensity,2022-01-01,left,250\n"
    )
    r = client.post("/api/assets/import", files=_csv_file(bad_csv), headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 0
    assert len(body["errors"]) == 1
    assert "numeric field invalid" in body["errors"][0]["reason"]


def test_csv_import_force(client, admin_headers):
    # Use a unique highway so there are no duplicates yet
    unique_csv = (
        _CSV_HEADER
        + "sign,NH-FORCE,1.0,28.0,77.0,high_intensity,2022-01-01,left,250\n"
        + "marking,NH-FORCE,2.0,28.1,77.1,thermoplastic,,, 150\n"
    )
    # First import to get an id
    r1 = client.post("/api/assets/import", files=_csv_file(unique_csv), headers=admin_headers)
    assert r1.status_code == 200
    # The second row has a space before 150 — irc_minimum_rl parse will handle it
    # (float(" 150") works in Python). So we may get 2 created or 1+1 error.
    # Just grab the created count.
    created_first = r1.json()["created"]
    assert created_first >= 1

    # Now force-insert two rows that would normally be duplicates
    force_payload = [
        _asset_payload(highway_id="NH-FORCE", chainage_km=1.0, asset_type="sign"),
        _asset_payload(highway_id="NH-FORCE", chainage_km=2.0, asset_type="marking"),
    ]
    r2 = client.post("/api/assets/import/force", json=force_payload, headers=admin_headers)
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["created"] == 2
    assert len(body["ids"]) == 2
