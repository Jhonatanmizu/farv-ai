from app.domain.schemas.audit import (
    BrazilianRegion,
    ExperimentalConditionSchema,
    GenerativeSystem,
    IdentityFormulation,
    Occupation,
)
from app.services.prompt_engine import PromptEngineService


def test_matrix_dimensions_equals_270() -> None:
    engine = PromptEngineService()
    conditions = engine.generate_all_conditions()
    assert len(conditions) == 270


def test_build_prompt_portuguese() -> None:
    engine = PromptEngineService()
    condition = ExperimentalConditionSchema(
        system=GenerativeSystem.CHATGPT_DALLE,
        identity_formulation=IdentityFormulation.BLACK_WOMAN,
        occupation=Occupation.JUDGE,
        region=BrazilianRegion.NORTHEAST,
    )
    prompt_pt, prompt_en = engine.build_prompt(condition, translate_to_en=False)
    assert "mulher preta brasileira" in prompt_pt
    assert "exercendo a função de juíza em seu tribunal" in prompt_pt
    assert "Região Nordeste do Brasil" in prompt_pt
    assert prompt_en is None


def test_build_prompt_english_translation() -> None:
    engine = PromptEngineService()
    condition = ExperimentalConditionSchema(
        system=GenerativeSystem.STABLE_DIFFUSION,
        identity_formulation=IdentityFormulation.NO_EXPLICIT_RACE,
        occupation=Occupation.DOCTOR,
        region=BrazilianRegion.NORTH,
    )
    prompt_pt, prompt_en = engine.build_prompt(condition, translate_to_en=True)
    assert prompt_en is not None
    assert "a Brazilian woman" in prompt_en
    assert "working as a medical doctor" in prompt_en
    assert "North Region of Brazil" in prompt_en
