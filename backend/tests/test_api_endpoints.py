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
        assert data["total_conditions"] == 270
        assert len(data["factors"]["systems"]) == 3
        assert "Google Gemini (Imagen 3)" in data["factors"]["systems"]
        assert len(data["factors"]["identities"]) == 3
        assert len(data["factors"]["occupations"]) == 5
        assert len(data["factors"]["regions"]) == 6
        assert "gemini" in data["providers_status"]


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


@pytest.mark.asyncio
async def test_create_and_delete_audit_job() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create minimal job with mock provider
        payload = {
            "name": "Audit Job To Delete Test",
            "provider": "mock",
            "systems": ["Google Gemini (Imagen 3)"],
            "identities": ["Mulher preta"],
            "occupations": ["Juíza"],
            "regions": ["Norte"],
            "repetitions": 1,
        }
        create_resp = await client.post("/api/v1/audits", json=payload)
        assert create_resp.status_code == 201
        job_data = create_resp.json()
        job_id = job_data["id"]

        # Delete the job
        del_resp = await client.delete(f"/api/v1/audits/{job_id}")
        assert del_resp.status_code == 204

        # Verify 404 on get
        get_resp = await client.get(f"/api/v1/audits/{job_id}")
        assert get_resp.status_code == 404

