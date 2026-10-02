from app.services.image_generators.api_generators import (
    DalleImageGenerator,
    GeminiImageGenerator,
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
        case "gemini" | "google" | "imagen" | "imagen-3":
            return GeminiImageGenerator()
        case _:
            return MockImageGenerator()


def resolve_generator_for_condition(provider_name: str, system_name: str) -> ImageGenerator:
    """Resolves appropriate generator, routing automatically if provider is 'auto' or 'live'."""
    normalized_provider = provider_name.strip().lower()
    if normalized_provider in ("auto", "live"):
        sys_lower = system_name.lower()
        if "gemini" in sys_lower or "imagen" in sys_lower or "google" in sys_lower:
            return GeminiImageGenerator()
        if "chatgpt" in sys_lower or "dall" in sys_lower:
            return DalleImageGenerator()
        return StabilityImageGenerator()

    return get_image_generator(provider_name)

