from fastapi import APIRouter

from app.core.config import settings
from app.domain.schemas.audit import (
    BrazilianRegion,
    GenerativeSystem,
    IdentityFormulation,
    Occupation,
    PromptPreviewRequest,
    PromptPreviewResponse,
)
from app.services.prompt_engine import PromptEngineService

router = APIRouter(prefix="/conditions", tags=["Experimental Conditions"])
prompt_engine = PromptEngineService()


@router.get("")
def list_experimental_factors() -> dict[str, object]:
    """Returns all 4 experimental factors, matrix dimensions, and active provider status."""
    systems = [s.value for s in GenerativeSystem]
    identities = [i.value for i in IdentityFormulation]
    occupations = [o.value for o in Occupation]
    regions = [r.value for r in BrazilianRegion]
    total_combinations = len(systems) * len(identities) * len(occupations) * len(regions)

    return {
        "factors": {
            "systems": systems,
            "identities": identities,
            "occupations": occupations,
            "regions": regions,
        },
        "formula": f"{len(systems)} x {len(identities)} x {len(occupations)} x {len(regions)}",
        "total_conditions": total_combinations,
        "default_provider": settings.DEFAULT_PROVIDER,
        "providers_status": {
            "mock": True,
            "stability": settings.has_stability,
            "dalle": settings.has_openai,
            "gemini": settings.has_gemini,
        },
    }


@router.post("/preview", response_model=PromptPreviewResponse)
def preview_prompt(request: PromptPreviewRequest) -> PromptPreviewResponse:
    """Pre-renders prompt templates for a specific experimental condition."""
    prompt_pt, prompt_en = prompt_engine.build_prompt(
        request.condition, translate_to_en=request.include_english_translation
    )
    return PromptPreviewResponse(
        prompt_pt=prompt_pt,
        prompt_en=prompt_en,
        parameters={
            "system": request.condition.system.value,
            "identity": request.condition.identity_formulation.value,
            "occupation": request.condition.occupation.value,
            "region": request.condition.region.value,
        },
    )
