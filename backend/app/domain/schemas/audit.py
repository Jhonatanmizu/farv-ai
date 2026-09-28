from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class GenerativeSystem(StrEnum):
    CHATGPT_DALLE = "ChatGPT (DALL-E 3)"
    STABLE_DIFFUSION = "Stable Diffusion"


class IdentityFormulation(StrEnum):
    NO_EXPLICIT_RACE = "Sem raça explícita"
    BLACK_WOMAN = "Mulher preta"
    WHITE_WOMAN = "Mulher branca"


class Occupation(StrEnum):
    JUDGE = "Juíza"
    DOCTOR = "Médica"
    GENERIC_ENVIRONMENT = "Ambiente genérico"
    DOMESTIC_WORKER = "Empregada doméstica"
    CLEANER = "Faxineira"


class BrazilianRegion(StrEnum):
    NORTH = "Norte"
    NORTHEAST = "Nordeste"
    CENTRAL_WEST = "Centro-Oeste"
    SOUTHEAST = "Sudeste"
    SOUTH = "Sul"
    NO_REFERENCE = "Sem referência"


class ExperimentalConditionSchema(BaseModel):
    system: GenerativeSystem
    identity_formulation: IdentityFormulation
    occupation: Occupation
    region: BrazilianRegion


class PromptPreviewRequest(BaseModel):
    condition: ExperimentalConditionSchema
    include_english_translation: bool = True


class PromptPreviewResponse(BaseModel):
    prompt_pt: str
    prompt_en: str | None = None
    parameters: dict[str, str | int]


class AuditJobCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    provider: str = Field(default="mock")
    systems: list[GenerativeSystem] = Field(default_factory=lambda: list(GenerativeSystem))
    identities: list[IdentityFormulation] = Field(default_factory=lambda: list(IdentityFormulation))
    occupations: list[Occupation] = Field(default_factory=lambda: list(Occupation))
    regions: list[BrazilianRegion] = Field(default_factory=lambda: list(BrazilianRegion))
    repetitions: int = Field(default=1, ge=1, le=10)
    translate_to_en: bool = Field(default=False)


class QuantitativeMetricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ita_angle: float
    ita_category: str
    monk_tone: int
    monk_delta_e: float
    l_star: float
    a_star: float
    b_star: float
    face_detected: bool


class QualitativeAuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prompt_adherence_score: float
    detected_environment: str
    visual_markers: str
    stereotypical_bias_detected: bool
    notes: str
    researcher_verified: bool


class QualitativeAuditUpdate(BaseModel):
    prompt_adherence_score: float | None = None
    detected_environment: str | None = None
    visual_markers: str | None = None
    stereotypical_bias_detected: bool | None = None
    notes: str | None = None
    researcher_verified: bool = True


class GeneratedImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    system: str
    identity_formulation: str
    occupation: str
    region: str
    repetition_index: int
    prompt_pt: str
    prompt_en: str | None
    seed: int | None
    file_path: str | None
    status: str
    latency_ms: int | None
    error_message: str | None
    created_at: datetime
    quantitative_metric: QuantitativeMetricResponse | None = None
    qualitative_audit: QualitativeAuditResponse | None = None


class AuditJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: str
    provider: str
    repetitions: int
    total_conditions: int
    total_images: int
    completed_images: int
    failed_images: int
    created_at: datetime
    updated_at: datetime


class AuditJobDetailResponse(AuditJobResponse):
    images: list[GeneratedImageResponse] = []


class ToneDistributionItem(BaseModel):
    category: str
    count: int
    percentage: float


class RegionDisparityItem(BaseModel):
    region: str
    mean_ita: float
    monk_tones: list[int]
    total_images: int


class MetricSummaryResponse(BaseModel):
    job_id: str
    total_audited: int
    ita_distribution: list[ToneDistributionItem]
    monk_distribution: dict[int, int]
    regional_disparities: list[RegionDisparityItem]
    stereotypical_bias_rate: float
