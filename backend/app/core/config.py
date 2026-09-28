from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FARV-IA"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # Storage paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    IMAGES_DIR: Path = DATA_DIR / "images"
    SQLITE_DB_PATH: Path = DATA_DIR / "farv_ia.sqlite"

    # API Keys for generative providers
    OPENAI_API_KEY: str | None = None
    STABILITY_API_KEY: str | None = None

    # Model settings
    DEFAULT_PROVIDER: str = "mock"
    MAX_CONCURRENT_GENERATIONS: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)
