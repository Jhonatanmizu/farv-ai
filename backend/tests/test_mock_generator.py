import io

import pytest
from PIL import Image

from app.services.image_generators.mock_generator import MockImageGenerator
from app.services.metrics.skin_sampler import SkinColorSampler


@pytest.mark.asyncio
async def test_mock_image_generation_and_skin_sampling() -> None:
    generator = MockImageGenerator()
    sampler = SkinColorSampler()

    prompt = "Fotografia realista de retrato de uma mulher preta brasileira atuando como médica."
    img_bytes, metadata = await generator.generate(prompt=prompt, seed=42)

    assert len(img_bytes) > 0
    assert metadata["generator"] == "MockImageGenerator"

    # Verify PIL can load the generated image
    pil_image = Image.open(io.BytesIO(img_bytes))
    assert pil_image.size == (512, 512)
    assert pil_image.format == "PNG"

    # Verify sampler processes the mock image
    metrics = sampler.analyze_image(img_bytes)
    assert "ita_angle" in metrics
    assert "monk_tone" in metrics
    assert 1 <= metrics["monk_tone"] <= 10
    assert metrics["face_detected"] is True
