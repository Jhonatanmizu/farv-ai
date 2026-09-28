from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db_session
from app.domain.models.audit import AuditJob, GeneratedImage, QualitativeAudit
from app.domain.schemas.audit import (
    AuditJobCreate,
    AuditJobDetailResponse,
    AuditJobResponse,
    QualitativeAuditResponse,
    QualitativeAuditUpdate,
)
from app.services.audit_runner import AuditRunnerService

router = APIRouter(prefix="/audits", tags=["Audits"])
runner = AuditRunnerService()


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
    db: AsyncSession = Depends(get_db_session),
) -> AuditJob:
    """Retrieves audit job with generated images, ITA metrics, and qualitative tags."""
    stmt = (
        select(AuditJob)
        .where(AuditJob.id == job_id)
        .options(
            selectinload(AuditJob.images).selectinload(GeneratedImage.quantitative_metric),
            selectinload(AuditJob.images).selectinload(GeneratedImage.qualitative_audit),
        )
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Audit job not found")
    return job


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


@router.patch("/images/{image_id}/qualitative", response_model=QualitativeAuditResponse)
async def update_qualitative_audit(
    image_id: str,
    payload: QualitativeAuditUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> QualitativeAudit:
    """Allows researchers to manually edit and verify qualitative codebook audit tags."""
    stmt = select(QualitativeAudit).where(QualitativeAudit.image_id == image_id)
    result = await db.execute(stmt)
    qual = result.scalar_one_or_none()
    if not qual:
        raise HTTPException(status_code=404, detail="Qualitative audit record not found")

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

    await db.commit()
    await db.refresh(qual)
    return qual
