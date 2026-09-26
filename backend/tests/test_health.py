"""
Smoke test — verifies the FastAPI app starts and /health returns 200.
Run with: pytest tests/test_health.py
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body


@pytest.mark.asyncio
async def test_ping():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/ping")

    assert response.status_code == 200
    assert response.json() == {"message": "pong"}
