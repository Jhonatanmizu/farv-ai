import asyncio
import time
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session_maker
from app.domain.models.audit import AuditJob, GeneratedImage, QualitativeAudit, QuantitativeMetric
from app.domain.schemas.audit import AuditJobCreate
from app.services.image_generators.factory import get_image_generator
from app.services.metrics.skin_sampler import SkinColorSampler
from app.services.prompt_engine import PromptEngineService
from app.services.qualitative.codebook_chain import CodebookAuditor
from app.services.websocket_manager import ws_manager


class AuditRunnerService:
    def __init__(self) -> None:
        self.prompt_engine = PromptEngineService()
        self.skin_sampler = SkinColorSampler()
        self.codebook_auditor = CodebookAuditor()

    async def create_and_start_job(self, request: AuditJobCreate) -> AuditJob:
        conditions = self.prompt_engine.generate_all_conditions(
            systems=request.systems,
            identities=request.identities,
            occupations=request.occupations,
            regions=request.regions,
        )
        total_conditions = len(conditions)
        total_images = total_conditions * request.repetitions

        async with async_session_maker() as session:
            job = AuditJob(
                id=str(uuid4()),
                name=request.name,
                provider=request.provider,
                repetitions=request.repetitions,
                total_conditions=total_conditions,
                total_images=total_images,
                completed_images=0,
                failed_images=0,
                status="running",
            )
            session.add(job)

            # Pre-populate image rows
            for cond in conditions:
                prompt_pt, prompt_en = self.prompt_engine.build_prompt(
                    cond, translate_to_en=request.translate_to_en
                )
                for rep in range(request.repetitions):
                    img = GeneratedImage(
                        id=str(uuid4()),
                        job_id=job.id,
                        system=cond.system.value,
                        identity_formulation=cond.identity_formulation.value,
                        occupation=cond.occupation.value,
                        region=cond.region.value,
                        repetition_index=rep,
                        prompt_pt=prompt_pt,
                        prompt_en=prompt_en,
                        status="pending",
                    )
                    session.add(img)

            await session.commit()
            await session.refresh(job)

        # Trigger background processing
        asyncio.create_task(self._process_job(job.id, request.provider))
        return job

    async def _process_job(self, job_id: str, provider_name: str) -> None:
        generator = get_image_generator(provider_name)
        semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_GENERATIONS)

        job_dir = settings.IMAGES_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        async with async_session_maker() as session:
            stmt = (
                select(GeneratedImage)
                .where(GeneratedImage.job_id == job_id)
                .order_by(GeneratedImage.created_at)
            )
            result = await session.execute(stmt)
            images = list(result.scalars().all())

        async def process_single_image(img_record: GeneratedImage) -> None:
            async with semaphore:
                start_time = time.monotonic()
                try:
                    prompt_to_use = (
                        img_record.prompt_en if img_record.prompt_en else img_record.prompt_pt
                    )
                    image_bytes, gen_meta = await generator.generate(prompt=prompt_to_use)
                    latency = int((time.monotonic() - start_time) * 1000)

                    file_path = job_dir / f"{img_record.id}.png"
                    file_path.write_bytes(image_bytes)

                    # Computational skin metrics (ITA, Monk Scale)
                    metrics_result = self.skin_sampler.analyze_image(image_bytes)

                    # Qualitative Codebook Audit
                    qual_result = self.codebook_auditor.evaluate(
                        prompt=prompt_to_use,
                        occupation=img_record.occupation,
                        identity=img_record.identity_formulation,
                        region=img_record.region,
                        synthetic_metadata=gen_meta,
                    )

                    relative_file_path = f"/static/images/{job_id}/{img_record.id}.png"

                    async with async_session_maker() as save_session:
                        img_to_update = await save_session.get(GeneratedImage, img_record.id)
                        if img_to_update:
                            img_to_update.status = "completed"
                            img_to_update.file_path = relative_file_path
                            img_to_update.latency_ms = latency

                            quant = QuantitativeMetric(
                                id=str(uuid4()),
                                image_id=img_to_update.id,
                                ita_angle=float(metrics_result["ita_angle"]),
                                ita_category=str(metrics_result["ita_category"]),
                                monk_tone=int(metrics_result["monk_tone"]),
                                monk_delta_e=float(metrics_result["monk_delta_e"]),
                                l_star=float(metrics_result["l_star"]),
                                a_star=float(metrics_result["a_star"]),
                                b_star=float(metrics_result["b_star"]),
                                face_detected=bool(metrics_result["face_detected"]),
                            )
                            save_session.add(quant)

                            qual = QualitativeAudit(
                                id=str(uuid4()),
                                image_id=img_to_update.id,
                                prompt_adherence_score=qual_result.prompt_adherence_score,
                                detected_environment=qual_result.detected_environment,
                                visual_markers=qual_result.visual_markers,
                                stereotypical_bias_detected=qual_result.stereotypical_bias_detected,
                                notes=qual_result.notes,
                            )
                            save_session.add(qual)

                            parent_job = await save_session.get(AuditJob, job_id)
                            if parent_job:
                                parent_job.completed_images += 1
                                if (
                                    parent_job.completed_images + parent_job.failed_images
                                    >= parent_job.total_images
                                ):
                                    parent_job.status = "completed"

                            await save_session.commit()

                    await ws_manager.broadcast(
                        {
                            "event": "image_completed",
                            "job_id": job_id,
                            "image_id": img_record.id,
                            "system": img_record.system,
                            "identity": img_record.identity_formulation,
                            "occupation": img_record.occupation,
                            "region": img_record.region,
                            "ita_angle": metrics_result["ita_angle"],
                            "monk_tone": metrics_result["monk_tone"],
                            "file_path": relative_file_path,
                        }
                    )

                except Exception as exc:
                    async with async_session_maker() as err_session:
                        img_to_update = await err_session.get(GeneratedImage, img_record.id)
                        if img_to_update:
                            img_to_update.status = "failed"
                            img_to_update.error_message = str(exc)

                            parent_job = await err_session.get(AuditJob, job_id)
                            if parent_job:
                                parent_job.failed_images += 1
                                if (
                                    parent_job.completed_images + parent_job.failed_images
                                    >= parent_job.total_images
                                ):
                                    parent_job.status = "completed"

                            await err_session.commit()

                    await ws_manager.broadcast(
                        {
                            "event": "image_failed",
                            "job_id": job_id,
                            "image_id": img_record.id,
                            "error": str(exc),
                        }
                    )

        # Run tasks with concurrency limit
        tasks = [process_single_image(img) for img in images]
        await asyncio.gather(*tasks, return_exceptions=True)

        async with async_session_maker() as finish_session:
            final_job = await finish_session.get(AuditJob, job_id)
            if final_job and final_job.status != "completed":
                final_job.status = "completed"
                final_job.updated_at = datetime.now(UTC)
                await finish_session.commit()

        await ws_manager.broadcast(
            {
                "event": "job_completed",
                "job_id": job_id,
            }
        )
