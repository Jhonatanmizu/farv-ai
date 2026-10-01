# Multi-stage Dockerfile for FARV-IA (FastAPI + React SPA)
# Stage 1: Build Frontend SPA
FROM node:20-slim AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Static Hosting
FROM python:3.11-slim

# Install uv binary from official distribution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    DATA_DIR=/data \
    STATIC_FRONTEND_DIR=/app/frontend_dist \
    PORT=8000

WORKDIR /app

# Install backend dependencies with uv
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy backend source code and project metadata
COPY backend/ ./
RUN uv sync --frozen --no-dev

# Copy compiled frontend SPA from Stage 1
COPY --from=frontend-builder /build/frontend/dist /app/frontend_dist

# Pre-create data directory for local fallback (persisted by Fly volume in prod)
RUN mkdir -p /data/images

EXPOSE 8000

# Launch Uvicorn server
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
