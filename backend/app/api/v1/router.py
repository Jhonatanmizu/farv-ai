from fastapi import APIRouter

from app.api.v1.endpoints.audits import router as audits_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.conditions import router as conditions_router
from app.api.v1.endpoints.exports import router as exports_router
from app.api.v1.endpoints.metrics import router as metrics_router
from app.api.v1.endpoints.ws import router as ws_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(conditions_router)
api_v1_router.include_router(audits_router)
api_v1_router.include_router(metrics_router)
api_v1_router.include_router(exports_router)
api_v1_router.include_router(ws_router)
