import base64
from typing import Any

import httpx
from openai import AsyncOpenAI

from app.core.config import settings


class DalleImageGenerator:
    """OpenAI DALL-E 3 image generator adapter."""

    def __init__(self, api_key: str | None = None) -> None:
        resolved_key = api_key or settings.OPENAI_API_KEY
        if not resolved_key:
            raise ValueError("OPENAI_API_KEY is required to initialize DalleImageGenerator.")
        self.client = AsyncOpenAI(api_key=resolved_key)

    async def generate(
        self,
        prompt: str,
        seed: int | None = None,
        extra_params: dict[str, Any] | None = None,
    ) -> tuple[bytes, dict[str, Any]]:
        response = await self.client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality="standard",
            response_format="b64_json",
        )
        first_image = response.data[0]
        b64_data = first_image.b64_json
        if not b64_data:
            raise RuntimeError("DALL-E response did not contain b64_json image data.")

        image_bytes = base64.b64decode(b64_data)
        metadata = {
            "generator": "DalleImageGenerator",
            "model": "dall-e-3",
            "revised_prompt": first_image.revised_prompt,
            "dimensions": "1024x1024",
            "seed": seed,
        }
        return image_bytes, metadata


class StabilityImageGenerator:
    """Stability AI REST API image generator adapter."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.STABILITY_API_KEY
        if not self.api_key:
            raise ValueError("STABILITY_API_KEY is required for StabilityImageGenerator.")

    async def generate(
        self,
        prompt: str,
        seed: int | None = None,
        extra_params: dict[str, Any] | None = None,
    ) -> tuple[bytes, dict[str, Any]]:
        url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        body: dict[str, Any] = {
            "text_prompts": [{"text": prompt, "weight": 1.0}],
            "cfg_scale": 7,
            "height": 1024,
            "width": 1024,
            "samples": 1,
            "steps": 30,
        }
        if seed is not None:
            body["seed"] = seed

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

        artifacts = data.get("artifacts", [])
        if not artifacts:
            raise RuntimeError("Stability AI returned empty artifacts list.")

        first_artifact = artifacts[0]
        image_bytes = base64.b64decode(first_artifact["base64"])
        metadata = {
            "generator": "StabilityImageGenerator",
            "finish_reason": first_artifact.get("finishReason"),
            "seed": first_artifact.get("seed", seed),
            "dimensions": "1024x1024",
        }
        return image_bytes, metadata
