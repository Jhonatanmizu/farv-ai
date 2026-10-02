from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FARV-IA"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # Storage paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    IMAGES_DIR: Path | None = None
    SQLITE_DB_PATH: Path | None = None
    STATIC_FRONTEND_DIR: Path | None = None

    # API Keys for generative providers
    OPENAI_API_KEY: str | None = None
    STABILITY_API_KEY: str | None = None

    # Model settings
    DEFAULT_PROVIDER: str = "mock"
    MAX_CONCURRENT_GENERATIONS: int = 3

    # Authentication & Security
    SECRET_KEY: str = "farv-ia-super-secret-key-change-in-production-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    # Public Fly.io URL override for exports (defaults to request host if not set)
    PUBLIC_BASE_URL: str | None = None

    model_config = SettingsConfigDict(
        env_file=[
            str(Path(__file__).resolve().parent.parent.parent / ".env"),
            ".env",
        ],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def set_default_paths(self) -> "Settings":
        if self.IMAGES_DIR is None:
            self.IMAGES_DIR = self.DATA_DIR / "images"
        if self.SQLITE_DB_PATH is None:
            self.SQLITE_DB_PATH = self.DATA_DIR / "farv_ia.sqlite"
        if self.STATIC_FRONTEND_DIR is None:
            potential_frontend = self.BASE_DIR.parent / "frontend" / "dist"
            if potential_frontend.exists():
                self.STATIC_FRONTEND_DIR = potential_frontend
        return self

    @property
    def has_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.strip())

    @property
    def has_stability(self) -> bool:
        return bool(self.STABILITY_API_KEY and self.STABILITY_API_KEY.strip())


settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
if settings.IMAGES_DIR:
    settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)

