from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_optional
from app.core.database import get_db_session
from app.domain.models.audit import AuditJob, GeneratedImage, QualitativeAudit
from app.domain.models.user import User
from app.domain.schemas.audit import (
    AuditJobCreate,
    AuditJobDetailResponse,
    AuditJobResponse,
    GeneratedImageResponse,
    QualitativeAuditResponse,
    QualitativeAuditUpdate,
    QuantitativeMetricResponse,
)
from app.services.audit_runner import AuditRunnerService

router = APIRouter(prefix="/audits", tags=["Audits"])
runner = AuditRunnerService()


def _format_audit_response(qual: QualitativeAudit) -> QualitativeAuditResponse:
    reviewer_name = (
        qual.user.username
        if qual.user
        else ("Automated" if qual.user_id is None else None)
    )
    return QualitativeAuditResponse(
        id=qual.id,
        user_id=qual.user_id,
        reviewer_username=reviewer_name,
        prompt_adherence_score=qual.prompt_adherence_score,
        detected_environment=qual.detected_environment,
        visual_markers=qual.visual_markers,
        stereotypical_bias_detected=qual.stereotypical_bias_detected,
        notes=qual.notes,
        researcher_verified=qual.researcher_verified,
        created_at=qual.created_at,
    )


@router.post("", response_model=AuditJobResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_job(payload: AuditJobCreate) -> AuditJob:
    """Creates and starts an experimental audit generation batch."""
    return await runner.create_and_start_job(payload)


@router.get("", response_model=list[AuditJobResponse])
async def list_audit_jobs(
    db: AsyncSession = Depends(get_db_session),
) -> list[AuditJob]:
    """Lists all audit batch runs sorted by most recent."""
    stmt = select(AuditJob).order_by(desc(AuditJob.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{job_id}", response_model=AuditJobDetailResponse)
async def get_audit_job(
    job_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db_session),
) -> AuditJobDetailResponse:
    """Retrieves audit job with generated images, ITA metrics, and qualitative tags."""
    stmt = (
        select(AuditJob)
        .where(AuditJob.id == job_id)
        .options(
            selectinload(AuditJob.images).selectinload(GeneratedImage.quantitative_metric),
            selectinload(AuditJob.images)
            .selectinload(GeneratedImage.qualitative_audits)
            .selectinload(QualitativeAudit.user),
        )
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Audit job not found")

    # Map image responses with reviewer-aware qualitative audits
    image_responses: list[GeneratedImageResponse] = []
    for img in job.images:
        reviews = [_format_audit_response(q) for q in img.qualitative_audits]

        # Determine user's active review or fallback
        active_audit = None
        if current_user:
            user_review = next(
                (q for q in img.qualitative_audits if q.user_id == current_user.id),
                None,
            )
            if user_review:
                active_audit = _format_audit_response(user_review)

        if not active_audit:
            # Fall back to latest verified or automated
            verified = [q for q in img.qualitative_audits if q.researcher_verified]
            chosen = verified[-1] if verified else (
                img.qualitative_audits[0] if img.qualitative_audits else None
            )
            if chosen:
                active_audit = _format_audit_response(chosen)

        quant_resp = (
            QuantitativeMetricResponse.model_validate(img.quantitative_metric)
            if img.quantitative_metric
            else None
        )

        img_resp = GeneratedImageResponse(
            id=img.id,
            job_id=img.job_id,
            system=img.system,
            identity_formulation=img.identity_formulation,
            occupation=img.occupation,
            region=img.region,
            repetition_index=img.repetition_index,
            prompt_pt=img.prompt_pt,
            prompt_en=img.prompt_en,
            seed=img.seed,
            file_path=img.file_path,
            status=img.status,
            latency_ms=img.latency_ms,
            error_message=img.error_message,
            created_at=img.created_at,
            quantitative_metric=quant_resp,
            qualitative_audit=active_audit,
            reviews=reviews,
        )
        image_responses.append(img_resp)

    return AuditJobDetailResponse(
        id=job.id,
        name=job.name,
        status=job.status,
        provider=job.provider,
        repetitions=job.repetitions,
        total_conditions=job.total_conditions,
        total_images=job.total_images,
        completed_images=job.completed_images,
        failed_images=job.failed_images,
        created_at=job.created_at,
        updated_at=job.updated_at,
        images=image_responses,
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audit_job(
    job_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Deletes audit job and associated records."""
    job = await db.get(AuditJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Audit job not found")
    await db.delete(job)
    await db.commit()


@router.get("/images/{image_id}/reviews", response_model=list[QualitativeAuditResponse])
async def get_image_reviews(
    image_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> list[QualitativeAuditResponse]:
    """Retrieves all qualitative reviews submitted for a specific image."""
    stmt = (
        select(QualitativeAudit)
        .where(QualitativeAudit.image_id == image_id)
        .options(selectinload(QualitativeAudit.user))
        .order_by(QualitativeAudit.created_at)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [_format_audit_response(q) for q in records]


@router.patch("/images/{image_id}/qualitative", response_model=QualitativeAuditResponse)
async def update_qualitative_audit(
    image_id: str,
    payload: QualitativeAuditUpdate,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db_session),
) -> QualitativeAuditResponse:
    """Allows researchers to manually edit, submit, and verify qualitative codebook audit tags."""
    img = await db.get(GeneratedImage, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    qual: QualitativeAudit | None = None
    if current_user:
        stmt = (
            select(QualitativeAudit)
            .where(
                QualitativeAudit.image_id == image_id,
                QualitativeAudit.user_id == current_user.id,
            )
            .options(selectinload(QualitativeAudit.user))
        )
        result = await db.execute(stmt)
        qual = result.scalar_one_or_none()
    else:
        # If unauthenticated fallback (e.g. dev/automated scripts), look for existing
        stmt = (
            select(QualitativeAudit)
            .where(QualitativeAudit.image_id == image_id)
            .options(selectinload(QualitativeAudit.user))
        )
        result = await db.execute(stmt)
        qual = result.scalar_one_or_none()

    if not qual:
        # Create new review for this researcher
        score = (
            payload.prompt_adherence_score
            if payload.prompt_adherence_score is not None
            else 1.0
        )
        qual = QualitativeAudit(
            id=str(uuid4()),
            image_id=image_id,
            user_id=current_user.id if current_user else None,
            prompt_adherence_score=score,
            detected_environment=payload.detected_environment or "Ambiente profissional",
            visual_markers=payload.visual_markers or "",
            stereotypical_bias_detected=bool(payload.stereotypical_bias_detected),
            notes=payload.notes or "",
            researcher_verified=payload.researcher_verified,
            created_at=datetime.now(UTC),
        )
        db.add(qual)
    else:
        if payload.prompt_adherence_score is not None:
            qual.prompt_adherence_score = payload.prompt_adherence_score
        if payload.detected_environment is not None:
            qual.detected_environment = payload.detected_environment
        if payload.visual_markers is not None:
            qual.visual_markers = payload.visual_markers
        if payload.stereotypical_bias_detected is not None:
            qual.stereotypical_bias_detected = payload.stereotypical_bias_detected
        if payload.notes is not None:
            qual.notes = payload.notes
        qual.researcher_verified = payload.researcher_verified
        if current_user and not qual.user_id:
            qual.user_id = current_user.id

    await db.commit()
    await db.refresh(qual)
    if qual.user_id and not qual.user:
        qual.user = await db.get(User, qual.user_id)

    return _format_audit_response(qual)
