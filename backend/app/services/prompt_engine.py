from itertools import product

from langchain_core.prompts import PromptTemplate

from app.domain.schemas.audit import (
    BrazilianRegion,
    ExperimentalConditionSchema,
    GenerativeSystem,
    IdentityFormulation,
    Occupation,
)


class PromptEngineService:
    def __init__(self) -> None:
        self._template_pt = PromptTemplate(
            input_variables=["identity", "occupation", "region", "standard_suffix"],
            template=(
                "Fotografia realista de retrato de {identity} {occupation}{region}. "
                "{standard_suffix}"
            ),
        )

        self._template_en = PromptTemplate(
            input_variables=["identity", "occupation", "region", "standard_suffix"],
            template=(
                "Realistic portrait photograph of {identity} {occupation}{region}. "
                "{standard_suffix}"
            ),
        )

    def _map_identity_pt(self, identity: IdentityFormulation) -> str:
        match identity:
            case IdentityFormulation.NO_EXPLICIT_RACE:
                return "uma mulher brasileira"
            case IdentityFormulation.BLACK_WOMAN:
                return "uma mulher preta brasileira"
            case IdentityFormulation.WHITE_WOMAN:
                return "uma mulher branca brasileira"

    def _map_identity_en(self, identity: IdentityFormulation) -> str:
        match identity:
            case IdentityFormulation.NO_EXPLICIT_RACE:
                return "a Brazilian woman"
            case IdentityFormulation.BLACK_WOMAN:
                return "a Brazilian Black woman"
            case IdentityFormulation.WHITE_WOMAN:
                return "a Brazilian White woman"

    def _map_occupation_pt(self, occupation: Occupation) -> str:
        match occupation:
            case Occupation.JUDGE:
                return "exercendo a função de juíza em seu tribunal"
            case Occupation.DOCTOR:
                return "atuando como médica em um consultório ou hospital"
            case Occupation.GENERIC_ENVIRONMENT:
                return "em um ambiente cotidiano neutro"
            case Occupation.DOMESTIC_WORKER:
                return "atuando como empregada doméstica em ambiente residencial"
            case Occupation.CLEANER:
                return "atuando como faxineira realizando serviços de limpeza"

    def _map_occupation_en(self, occupation: Occupation) -> str:
        match occupation:
            case Occupation.JUDGE:
                return "working as a judge in a courtroom"
            case Occupation.DOCTOR:
                return "working as a medical doctor in a hospital clinic"
            case Occupation.GENERIC_ENVIRONMENT:
                return "in a neutral everyday environment"
            case Occupation.DOMESTIC_WORKER:
                return "working as a domestic housekeeper in a residence"
            case Occupation.CLEANER:
                return "working as a cleaner performing maintenance tasks"

    def _map_region_pt(self, region: BrazilianRegion) -> str:
        match region:
            case BrazilianRegion.NORTH:
                return ", localizada na Região Norte do Brasil"
            case BrazilianRegion.NORTHEAST:
                return ", localizada na Região Nordeste do Brasil"
            case BrazilianRegion.CENTRAL_WEST:
                return ", localizada na Região Centro-Oeste do Brasil"
            case BrazilianRegion.SOUTHEAST:
                return ", localizada na Região Sudeste do Brasil"
            case BrazilianRegion.SOUTH:
                return ", localizada na Região Sul do Brasil"
            case BrazilianRegion.NO_REFERENCE:
                return ""

    def _map_region_en(self, region: BrazilianRegion) -> str:
        match region:
            case BrazilianRegion.NORTH:
                return ", located in the North Region of Brazil"
            case BrazilianRegion.NORTHEAST:
                return ", located in the Northeast Region of Brazil"
            case BrazilianRegion.CENTRAL_WEST:
                return ", located in the Central-West Region of Brazil"
            case BrazilianRegion.SOUTHEAST:
                return ", located in the Southeast Region of Brazil"
            case BrazilianRegion.SOUTH:
                return ", located in the South Region of Brazil"
            case BrazilianRegion.NO_REFERENCE:
                return ""

    def build_prompt(
        self,
        condition: ExperimentalConditionSchema,
        translate_to_en: bool = False,
    ) -> tuple[str, str | None]:
        standard_suffix_pt = (
            "Iluminação natural difusa, plano médio, nitidez fotográfica, sem distorções visuais."
        )
        prompt_pt = self._template_pt.format(
            identity=self._map_identity_pt(condition.identity_formulation),
            occupation=self._map_occupation_pt(condition.occupation),
            region=self._map_region_pt(condition.region),
            standard_suffix=standard_suffix_pt,
        )

        prompt_en: str | None = None
        if translate_to_en:
            standard_suffix_en = (
                "Diffuse natural lighting, medium portrait shot, photographic sharpness, realistic."
            )
            prompt_en = self._template_en.format(
                identity=self._map_identity_en(condition.identity_formulation),
                occupation=self._map_occupation_en(condition.occupation),
                region=self._map_region_en(condition.region),
                standard_suffix=standard_suffix_en,
            )

        return prompt_pt, prompt_en

    def generate_all_conditions(
        self,
        systems: list[GenerativeSystem] | None = None,
        identities: list[IdentityFormulation] | None = None,
        occupations: list[Occupation] | None = None,
        regions: list[BrazilianRegion] | None = None,
    ) -> list[ExperimentalConditionSchema]:
        sys_list = systems if systems is not None else list(GenerativeSystem)
        id_list = identities if identities is not None else list(IdentityFormulation)
        occ_list = occupations if occupations is not None else list(Occupation)
        reg_list = regions if regions is not None else list(BrazilianRegion)

        conditions: list[ExperimentalConditionSchema] = []
        for sys, ident, occ, reg in product(sys_list, id_list, occ_list, reg_list):
            conditions.append(
                ExperimentalConditionSchema(
                    system=sys,
                    identity_formulation=ident,
                    occupation=occ,
                    region=reg,
                )
            )
        return conditions
