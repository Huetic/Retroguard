"""
Integration tests for the /api/contributors router and key-auth dependency.
Uses the session-scoped TestClient + SQLite DB from conftest.py.
"""
import io
import pytest


# ── Helpers ──────────────────────────────────────────────────────────────────

def _contributor_payload(**overrides):
    base = {
        "name": "Test Fleet Corp",
        "contributor_type": "fleet",
        "trust_level": 0.8,
        "contact_email": "fleet@example.com",
    }
    base.update(overrides)
    return base


# ── Tests ────────────────────────────────────────────────────────────────────

def test_create_contributor_returns_key_once(client, admin_headers):
    r = client.post("/api/contributors", json=_contributor_payload(), headers=admin_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert "api_key" in body
    assert body["api_key"].startswith("rg_"), f"Expected rg_* key, got: {body['api_key']}"
    assert body["name"] == "Test Fleet Corp"
    assert body["active"] is True


def test_list_does_not_expose_raw_key(client, admin_headers):
    # Create a contributor first so the list is non-empty
    client.post("/api/contributors", json=_contributor_payload(name="ListCheckCorp"), headers=admin_headers)

    r = client.get("/api/contributors", headers=admin_headers)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) > 0
    for row in rows:
        assert "api_key" not in row, "api_key must never appear in list response"
        # api_key_prefix is allowed (it's a safe prefix)
        assert "api_key_hash" not in row, "api_key_hash must never appear in list response"


def test_public_upload_requires_key(client):
    """POST /api/contribute/video with no X-API-Key header → 422 (missing header) or 401."""
    # FastAPI raises 422 for missing required header, which is fine — the
    # important thing is it does NOT return 202.
    r = client.post(
        "/api/contribute/video",
        data={"asset_id": "1"},
        files={"file": ("test.mp4", io.BytesIO(b"fake"), "video/mp4")},
    )
    assert r.status_code in (401, 422), f"Expected 401 or 422, got {r.status_code}"


def test_public_upload_rejects_bad_key(client):
    """POST /api/contribute/video with a bogus key → 401."""
    r = client.post(
        "/api/contribute/video",
        headers={"X-API-Key": "nope"},
        data={"asset_id": "1"},
        files={"file": ("test.mp4", io.BytesIO(b"fake"), "video/mp4")},
    )
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


def test_public_upload_with_valid_key_queues_job(client, admin_headers):
    """
    With a valid API key and a real asset, the endpoint should accept the
    request and return 202 (job queued). The background video processing
    needs cv2/ml_service — if that import fails the job will fail internally,
    but the HTTP response should still be 202 because the job is queued first.

    If cv2 is not installed the endpoint still accepts the upload (the
    processing happens in a background task). Skip only if we can't even
    import the router.
    """
    # Create a contributor and note its key
    r_c = client.post("/api/contributors", json=_contributor_payload(name="VideoTester"), headers=admin_headers)
    assert r_c.status_code == 201
    api_key = r_c.json()["api_key"]

    # Create an asset to attach the video to
    r_a = client.post("/api/assets", json={
        "asset_type": "sign",
        "highway_id": "NH-VID",
        "chainage_km": 1.0,
        "gps_lat": 28.5,
        "gps_lon": 77.1,
        "irc_minimum_rl": 200.0,
    }, headers=admin_headers)
    assert r_a.status_code == 201
    asset_id = r_a.json()["id"]

    r = client.post(
        "/api/contribute/video",
        headers={"X-API-Key": api_key},
        data={"asset_id": str(asset_id)},
        files={"file": ("clip.mp4", io.BytesIO(b"\x00" * 16), "video/mp4")},
    )
    # 202 = accepted (job queued). The background worker may fail due to cv2,
    # but the endpoint itself should accept it.
    assert r.status_code == 202, f"Expected 202, got {r.status_code}: {r.text}"
    body = r.json()
    assert "id" in body
    assert body["status"] == "queued"


def test_rotate_key_invalidates_old(client, admin_headers):
    """Create contributor, rotate key, confirm old key → 401 and new key works."""
    # Create
    r = client.post("/api/contributors", json=_contributor_payload(name="RotateTester"), headers=admin_headers)
    assert r.status_code == 201
    cid = r.json()["id"]
    old_key = r.json()["api_key"]

    # Rotate
    r2 = client.post(f"/api/contributors/{cid}/rotate-key", headers=admin_headers)
    assert r2.status_code == 200, r2.text
    new_key = r2.json()["api_key"]
    assert new_key != old_key, "Rotated key must differ from old key"
    assert new_key.startswith("rg_")

    # Old key should be rejected
    r_old = client.post(
        "/api/contribute/video",
        headers={"X-API-Key": old_key},
        data={"asset_id": "999"},
        files={"file": ("x.mp4", io.BytesIO(b"x"), "video/mp4")},
    )
    assert r_old.status_code == 401, (
        f"Old key should be 401 after rotation, got {r_old.status_code}"
    )

    # New key should at least pass auth (may 404 on asset, not 401)
    r_new = client.post(
        "/api/contribute/video",
        headers={"X-API-Key": new_key},
        data={"asset_id": "999999"},
        files={"file": ("x.mp4", io.BytesIO(b"x"), "video/mp4")},
    )
    # 404 means auth passed but asset not found — which is correct behaviour
    assert r_new.status_code != 401, (
        f"New key should not be rejected with 401, got {r_new.status_code}"
    )
