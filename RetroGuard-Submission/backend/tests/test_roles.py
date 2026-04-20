"""Phase 2 role-based authorization tests."""
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _login(client, username, password="testpass"):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"Login failed for {username}: {r.text}"
    return r.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_user(client, admin_token, username, role):
    r = client.post(
        "/api/users",
        json={"username": username, "password": "testpass", "role": role},
        headers=_auth(admin_token),
    )
    # 409 = already exists from a prior run in the same session — that's fine
    assert r.status_code in (201, 409), f"Failed to create {role} user: {r.text}"


def _create_asset(client, token):
    """Create a throw-away asset using the given token and return its id."""
    r = client.post(
        "/api/assets",
        json={
            "asset_type": "sign",
            "highway_id": "NH-ROLETEST",
            "chainage_km": 999.0,
            "gps_lat": 20.0,
            "gps_lon": 75.0,
            "irc_minimum_rl": 200.0,
        },
        headers=_auth(token),
    )
    assert r.status_code == 201, f"Asset creation failed: {r.text}"
    return r.json()["id"]


# ---------------------------------------------------------------------------
# Module-scoped fixtures — users are created once per test-module run
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def _admin_tok(client):
    return _login(client, "admin", "admin")


@pytest.fixture(scope="module")
def supervisor_token(client, _admin_tok):
    _create_user(client, _admin_tok, "test_supervisor", "supervisor")
    return _login(client, "test_supervisor")


@pytest.fixture(scope="module")
def inspector_token(client, _admin_tok):
    _create_user(client, _admin_tok, "test_inspector", "inspector")
    return _login(client, "test_inspector")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_inspector_cannot_delete_asset(client, supervisor_token, inspector_token):
    """Inspector cannot update an asset (requires supervisor+)."""
    # Create an asset as supervisor (supervisor can create assets)
    asset_id = _create_asset(client, supervisor_token)

    # Inspector tries to update — requires supervisor+, should 403
    r = client.put(
        f"/api/assets/{asset_id}",
        json={"status": "warning"},
        headers=_auth(inspector_token),
    )
    assert r.status_code == 403, r.text


def test_supervisor_can_update_asset(client, supervisor_token):
    """Supervisor can update an asset."""
    asset_id = _create_asset(client, supervisor_token)

    r = client.put(
        f"/api/assets/{asset_id}",
        json={"material_grade": "high_intensity"},
        headers=_auth(supervisor_token),
    )
    assert r.status_code == 200, r.text


def test_admin_can_create_user(client, _admin_tok):
    r = client.post(
        "/api/users",
        json={"username": "test_new_role_user", "password": "testpass", "role": "inspector"},
        headers=_auth(_admin_tok),
    )
    assert r.status_code == 201, r.text
    assert r.json()["role"] == "inspector"


def test_supervisor_cannot_create_user(client, supervisor_token):
    r = client.post(
        "/api/users",
        json={"username": "test_bad_user", "password": "testpass", "role": "inspector"},
        headers=_auth(supervisor_token),
    )
    assert r.status_code == 403, r.text


def test_inspector_can_create_measurement(client, supervisor_token, inspector_token):
    """Inspector (any authenticated user) can create measurements."""
    # Need an asset — create one as supervisor
    asset_id = _create_asset(client, supervisor_token)

    r = client.post(
        "/api/measurements",
        json={
            "asset_id": asset_id,
            "rl_value": 280.0,
            "source_layer": "smartphone",
            "confidence": 0.9,
        },
        headers=_auth(inspector_token),
    )
    assert r.status_code == 201, r.text


def test_unauthenticated_write_returns_401(client):
    """Missing Authorization header → 403 (HTTPBearer raises 403 when header absent)."""
    r = client.post(
        "/api/measurements",
        json={
            "asset_id": 1,
            "rl_value": 200.0,
            "source_layer": "smartphone",
        },
    )
    # HTTPBearer with auto_error=True returns 403 when the Authorization header is missing
    assert r.status_code == 403, r.text
