from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Framework de Auditoria de Representações Visuais em IA Generativa",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated audit images as static assets
app.mount("/static/images", StaticFiles(directory=settings.IMAGES_DIR), name="static_images")

# Mount API routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "healthy", "service": settings.PROJECT_NAME}
