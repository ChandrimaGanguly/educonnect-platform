"""
Health endpoint tests for checkpoint service.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    """Test health check endpoint returns success."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_ready_endpoint(client: AsyncClient) -> None:
    """Test readiness endpoint returns success."""
    response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert "database" in data
    assert "redis" in data
