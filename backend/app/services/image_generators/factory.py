from app.services.image_generators.api_generators import (
    DalleImageGenerator,
    StabilityImageGenerator,
)
from app.services.image_generators.base import ImageGenerator
from app.services.image_generators.mock_generator import MockImageGenerator


def get_image_generator(provider_name: str) -> ImageGenerator:
    normalized = provider_name.strip().lower()
    match normalized:
        case "mock":
            return MockImageGenerator()
        case "dall-e" | "dalle" | "dall-e-3" | "openai":
            return DalleImageGenerator()
        case "stability" | "stable-diffusion" | "sd":
            return StabilityImageGenerator()
        case _:
            # Fallback to mock generator for unknown providers
            return MockImageGenerator()
