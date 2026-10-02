import contextlib
import io
import os
import sqlite3
import tempfile
import zipfile
from uuid import uuid4

import httpx
import pytest

from app.core.database import init_db
from app.main import app


@contextlib.contextmanager
def tempfile_named(content: bytes):
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as f:
        f.write(content)
        f.flush()
        temp_name = f.name
    try:
        yield temp_name
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)


@pytest.fixture(autouse=True)
async def setup_database():
    await init_db()


@pytest.mark.asyncio
async def test_auth_registration_and_login() -> None:
    uname = f"pesquisadora_{uuid4().hex[:6]}"
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register new researcher
        reg_payload = {"username": uname, "password": "supersecretpassword123"}
        reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
        assert reg_resp.status_code == 201
        reg_data = reg_resp.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["username"] == uname

        token = reg_data["access_token"]

        # Check /me with token
        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == uname

        # Login with correct credentials
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"username": uname, "password": "supersecretpassword123"},
        )
        assert login_resp.status_code == 200
        assert "access_token" in login_resp.json()

        # Login with invalid password
        bad_login = await client.post(
            "/api/v1/auth/login",
            json={"username": uname, "password": "wrongpassword"},
        )
        assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_multi_user_reviews_and_exports() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register Reviewer 1
        r1_name = f"reviewer_{uuid4().hex[:6]}"
        r1_resp = await client.post(
            "/api/v1/auth/register",
            json={"username": r1_name, "password": "password123"},
        )
        assert r1_resp.status_code == 201
        r1_token = r1_resp.json()["access_token"]

        # Register Reviewer 2
        r2_name = f"reviewer_{uuid4().hex[:6]}"
        r2_resp = await client.post(
            "/api/v1/auth/register",
            json={"username": r2_name, "password": "password123"},
        )
        assert r2_resp.status_code == 201
        r2_token = r2_resp.json()["access_token"]

        # Create a small audit job
        job_payload = {
            "name": "Audit Test Batch",
            "provider": "mock",
            "systems": ["ChatGPT (DALL-E 3)"],
            "identities": ["Mulher preta"],
            "occupations": ["Juíza"],
            "regions": ["Sudeste"],
            "repetitions": 1,
            "translate_to_en": False,
        }
        create_resp = await client.post("/api/v1/audits", json=job_payload)
        assert create_resp.status_code == 201
        job_id = create_resp.json()["id"]

        # Wait a short moment or fetch job detail
        detail_resp = await client.get(f"/api/v1/audits/{job_id}")
        assert detail_resp.status_code == 200
        job_detail = detail_resp.json()
        assert len(job_detail["images"]) > 0
        img_id = job_detail["images"][0]["id"]

        # Reviewer 1 submits evaluation
        r1_review_payload = {
            "prompt_adherence_score": 0.9,
            "detected_environment": "Tribunal de Justiça",
            "visual_markers": "Toga preta, martelo",
            "stereotypical_bias_detected": False,
            "notes": "Avaliação detalhada Alice",
            "researcher_verified": True,
        }
        r1_patch_resp = await client.patch(
            f"/api/v1/audits/images/{img_id}/qualitative",
            headers={"Authorization": f"Bearer {r1_token}"},
            json=r1_review_payload,
        )
        assert r1_patch_resp.status_code == 200
        assert r1_patch_resp.json()["reviewer_username"] == r1_name

        # Reviewer 2 independently submits evaluation for the SAME image
        r2_review_payload = {
            "prompt_adherence_score": 0.85,
            "detected_environment": "Gabinete jurídico",
            "visual_markers": "Estante de livros de direito",
            "stereotypical_bias_detected": True,
            "notes": "Avaliação detalhada Bob",
            "researcher_verified": True,
        }
        r2_patch_resp = await client.patch(
            f"/api/v1/audits/images/{img_id}/qualitative",
            headers={"Authorization": f"Bearer {r2_token}"},
            json=r2_review_payload,
        )
        assert r2_patch_resp.status_code == 200
        assert r2_patch_resp.json()["reviewer_username"] == r2_name

        # Query image reviews endpoint
        reviews_resp = await client.get(f"/api/v1/audits/images/{img_id}/reviews")
        assert reviews_resp.status_code == 200
        reviews_data = reviews_resp.json()
        reviewer_names = [r["reviewer_username"] for r in reviews_data]
        assert r1_name in reviewer_names
        assert r2_name in reviewer_names

        # Test SQLite Export
        sqlite_resp = await client.get("/api/v1/exports/sqlite")
        assert sqlite_resp.status_code == 200
        assert sqlite_resp.headers["content-type"] == "application/x-sqlite3"
        assert len(sqlite_resp.content) > 0

        # Verify SQLite integrity
        with tempfile_named(sqlite_resp.content) as temp_sqlite:
            conn = sqlite3.connect(temp_sqlite)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            assert count >= 2
            conn.close()

        # Test CSV Export
        csv_resp = await client.get(f"/api/v1/exports/csv?job_id={job_id}")
        assert csv_resp.status_code == 200
        csv_text = csv_resp.text
        assert "job_id,job_name,job_provider" in csv_text
        assert "reviewer_username" in csv_text
        assert r1_name in csv_text
        assert r2_name in csv_text

        # Test Images Zip Export
        zip_resp = await client.get(f"/api/v1/exports/images.zip?job_id={job_id}")
        assert zip_resp.status_code == 200
        assert "zip" in zip_resp.headers["content-type"]
        zip_file = zipfile.ZipFile(io.BytesIO(zip_resp.content))
        assert "manifest.csv" in zip_file.namelist()
