from typing import Any, Protocol


class ImageGenerator(Protocol):
    async def generate(
        self,
        prompt: str,
        seed: int | None = None,
        extra_params: dict[str, Any] | None = None,
    ) -> tuple[bytes, dict[str, Any]]:
        """Generates image bytes and metadata dictionary."""
        ...
