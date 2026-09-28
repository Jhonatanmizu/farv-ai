import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_healthcheck() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_list_conditions_matrix() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/conditions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_conditions"] == 180
        assert len(data["factors"]["systems"]) == 2
        assert len(data["factors"]["identities"]) == 3
        assert len(data["factors"]["occupations"]) == 5
        assert len(data["factors"]["regions"]) == 6


@pytest.mark.asyncio
async def test_prompt_preview_endpoint() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "condition": {
                "system": "ChatGPT (DALL-E 3)",
                "identity_formulation": "Mulher preta",
                "occupation": "Juíza",
                "region": "Nordeste",
            },
            "include_english_translation": True,
        }
        resp = await client.post("/api/v1/conditions/preview", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "mulher preta" in data["prompt_pt"]
        assert "judge" in data["prompt_en"]
