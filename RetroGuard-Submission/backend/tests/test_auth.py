"""Phase 1 auth tests — JWT bearer-token flow."""
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _login(client, username="admin", password="admin"):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_login_returns_token(client):
    r = _login(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["username"] == "admin"
    assert body["user"]["role"] == "admin"
    # password_hash must NOT appear in the response
    assert "password_hash" not in body["user"]


def test_me_requires_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 403, r.text  # HTTPBearer raises 403 when header missing


def test_me_returns_user_with_token(client):
    token = _login(client).json()["access_token"]
    r = client.get("/api/auth/me", headers=_auth_header(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["username"] == "admin"
    assert "password_hash" not in body


def test_invalid_token_rejected(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer this.is.garbage"})
    assert r.status_code == 401, r.text


def test_wrong_password_rejected(client):
    r = _login(client, password="wrongpassword")
    assert r.status_code == 401, r.text
