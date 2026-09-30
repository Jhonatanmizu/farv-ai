import base64
from typing import Any

import httpx
from openai import AsyncOpenAI

from app.core.config import settings


class DalleImageGenerator:
    """OpenAI image generator adapter supporting DALL-E 3 and newer GPT Image models."""

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
        # Candidate model names to support both standard DALL-E and project-scoped OpenAI keys
        models_to_try = ["chatgpt-image-latest", "gpt-image-1", "dall-e-3"]
        last_error: Exception | None = None

        for model_name in models_to_try:
            try:
                response = await self.client.images.generate(
                    model=model_name,
                    prompt=prompt,
                    n=1,
                )
                first_image = response.data[0]
                if first_image.b64_json:
                    image_bytes = base64.b64decode(first_image.b64_json)
                elif first_image.url:
                    async with httpx.AsyncClient(timeout=45.0) as http_client:
                        resp = await http_client.get(first_image.url)
                        resp.raise_for_status()
                        image_bytes = resp.content
                else:
                    continue

                metadata = {
                    "generator": "DalleImageGenerator",
                    "model": model_name,
                    "revised_prompt": getattr(first_image, "revised_prompt", None),
                    "dimensions": "1024x1024",
                    "seed": seed,
                }
                return image_bytes, metadata
            except Exception as exc:
                last_error = exc
                continue

        raise RuntimeError(f"All OpenAI image models failed. Last error: {last_error}")


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
