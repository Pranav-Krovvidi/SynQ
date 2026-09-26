"""
Tests for WS-3 auth endpoints and WS-4 CRUD endpoints.

Uses an in-memory SQLite database (via conftest.py) so no Postgres is needed.
All DB calls go through the real service layer — only the engine is swapped.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client(override_db):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ---------------------------------------------------------------------------
# Auth — register + login + /me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_and_login(client):
    # Register
    r = await client.post("/api/v1/auth/register", json={
        "email": "alice@example.com",
        "password": "secret123",
        "full_name": "Alice",
        "role": "contributor",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "alice@example.com"
    assert body["role"] == "contributor"
    assert "hashed_password" not in body

    # Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "alice@example.com",
        "password": "secret123",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    # /me
    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "x"}
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/v1/auth/register", json={"email": "x@x.com", "password": "good"})
    r = await client.post("/api/v1/auth/login", json={"email": "x@x.com", "password": "bad"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code in (401, 403)  # HTTPBearer returns 403 pre-0.111 / 401 after


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _register_and_login(client, email="user@test.com", role="contributor"):
    await client.post("/api/v1/auth/register", json={
        "email": email, "password": "pass", "role": role,
    })
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "pass"})
    return r.json()["access_token"]


# ---------------------------------------------------------------------------
# Projects CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_project_crud(client):
    token = await _register_and_login(client)
    auth = {"Authorization": f"Bearer {token}"}

    # Create
    r = await client.post("/api/v1/projects", json={"name": "NovaPay", "description": "demo"}, headers=auth)
    assert r.status_code == 201
    project_id = r.json()["id"]

    # List
    r = await client.get("/api/v1/projects", headers=auth)
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Get
    r = await client.get(f"/api/v1/projects/{project_id}", headers=auth)
    assert r.status_code == 200
    assert r.json()["name"] == "NovaPay"

    # Update
    r = await client.patch(f"/api/v1/projects/{project_id}", json={"name": "NovaPay v2"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["name"] == "NovaPay v2"


# ---------------------------------------------------------------------------
# Services CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_service_crud(client):
    token = await _register_and_login(client)
    auth = {"Authorization": f"Bearer {token}"}

    r = await client.post("/api/v1/projects", json={"name": "P1"}, headers=auth)
    pid = r.json()["id"]

    # Create service
    r = await client.post(f"/api/v1/projects/{pid}/services", json={
        "name": "PaymentService", "tags": ["python", "fastapi"],
    }, headers=auth)
    assert r.status_code == 201
    sid = r.json()["id"]

    # List
    r = await client.get(f"/api/v1/projects/{pid}/services", headers=auth)
    assert len(r.json()) == 1

    # Update
    r = await client.patch(f"/api/v1/projects/{pid}/services/{sid}", json={"name": "PaySvc"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["name"] == "PaySvc"


# ---------------------------------------------------------------------------
# ADRs CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_adr_crud(client):
    token = await _register_and_login(client)
    auth = {"Authorization": f"Bearer {token}"}

    r = await client.post("/api/v1/projects", json={"name": "P1"}, headers=auth)
    pid = r.json()["id"]

    # Create ADR
    r = await client.post(f"/api/v1/projects/{pid}/adrs", json={
        "title": "Use PostgreSQL",
        "status": "accepted",
        "decision": "We use Postgres for all persistence.",
    }, headers=auth)
    assert r.status_code == 201
    adr_id = r.json()["id"]
    assert r.json()["status"] == "accepted"

    # Filter by status
    r = await client.get(f"/api/v1/projects/{pid}/adrs?status=accepted", headers=auth)
    assert len(r.json()) == 1

    r = await client.get(f"/api/v1/projects/{pid}/adrs?status=proposed", headers=auth)
    assert len(r.json()) == 0

    # Update status
    r = await client.patch(f"/api/v1/projects/{pid}/adrs/{adr_id}", json={"status": "deprecated"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["status"] == "deprecated"
