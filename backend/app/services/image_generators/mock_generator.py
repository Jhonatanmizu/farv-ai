import hashlib
import io
from typing import Any

from PIL import Image, ImageDraw


class MockImageGenerator:
    """Deterministic synthetic image generator for local development and unit tests."""

    SKIN_PRESETS = [
        (245, 220, 200),  # Very Light (Chardon ITA > 55)
        (225, 185, 155),  # Light
        (195, 145, 110),  # Intermediate
        (150, 95, 60),  # Tan / Brown
        (90, 55, 35),  # Dark
        (50, 30, 20),  # Very Dark
    ]

    async def generate(
        self,
        prompt: str,
        seed: int | None = None,
        extra_params: dict[str, Any] | None = None,
    ) -> tuple[bytes, dict[str, Any]]:
        if seed is None:
            digest = hashlib.md5(prompt.encode("utf-8")).hexdigest()
            resolved_seed = int(digest[:8], 16)
        else:
            resolved_seed = seed

        # Bias selection based on prompt keywords if present, else seed
        prompt_lower = prompt.lower()
        if "preta" in prompt_lower or "negra" in prompt_lower or "black" in prompt_lower:
            skin_rgb = self.SKIN_PRESETS[3 + (resolved_seed % 3)]
        elif "branca" in prompt_lower or "white" in prompt_lower:
            skin_rgb = self.SKIN_PRESETS[resolved_seed % 2]
        else:
            # Default spontaneous distribution (shows algorithmic bias toward lighter tones)
            distribution_weights = [0, 1, 1, 2, 3, 4]
            idx = distribution_weights[resolved_seed % len(distribution_weights)]
            skin_rgb = self.SKIN_PRESETS[idx]

        img = Image.new("RGB", (512, 512), color=(235, 238, 242))
        draw = ImageDraw.Draw(img)

        # Draw torso / shoulders
        draw.ellipse([100, 320, 412, 600], fill=(60, 75, 95))

        # Draw neck
        draw.rectangle([220, 260, 292, 350], fill=skin_rgb)

        # Draw face oval
        draw.ellipse([160, 100, 352, 320], fill=skin_rgb)

        # Draw hair silhouette
        hair_color = (30, 25, 25)
        draw.arc([140, 80, 372, 280], start=180, end=360, fill=hair_color, width=30)

        # Output to PNG bytes
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()

        metadata = {
            "generator": "MockImageGenerator",
            "seed": resolved_seed,
            "dimensions": "512x512",
            "format": "PNG",
            "synthetic_skin_rgb": list(skin_rgb),
        }
        return image_bytes, metadata
