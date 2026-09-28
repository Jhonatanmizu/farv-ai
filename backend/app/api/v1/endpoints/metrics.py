from collections import Counter, defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db_session
from app.domain.models.audit import AuditJob, GeneratedImage
from app.domain.schemas.audit import (
    MetricSummaryResponse,
    RegionDisparityItem,
    ToneDistributionItem,
)

router = APIRouter(prefix="/metrics", tags=["Statistical Metrics"])


@router.get("/{job_id}/summary", response_model=MetricSummaryResponse)
async def get_metrics_summary(
    job_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> MetricSummaryResponse:
    """Aggregates quantitative ITA, Monk tones, and regional disparity metrics."""
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

    ita_categories: Counter[str] = Counter()
    monk_counter: Counter[int] = Counter()
    regional_itas: dict[str, list[float]] = defaultdict(list)
    regional_monks: dict[str, list[int]] = defaultdict(list)
    stereotypical_bias_count = 0
    total_audited = 0

    for img in job.images:
        if img.status == "completed" and img.quantitative_metric:
            total_audited += 1
            qm = img.quantitative_metric
            ita_categories[qm.ita_category] += 1
            monk_counter[qm.monk_tone] += 1

            regional_itas[img.region].append(qm.ita_angle)
            regional_monks[img.region].append(qm.monk_tone)

            if img.qualitative_audit and img.qualitative_audit.stereotypical_bias_detected:
                stereotypical_bias_count += 1

    tone_items: list[ToneDistributionItem] = []
    for cat, count in ita_categories.items():
        percentage = round((count / total_audited) * 100, 2) if total_audited > 0 else 0.0
        tone_items.append(ToneDistributionItem(category=cat, count=count, percentage=percentage))

    region_items: list[RegionDisparityItem] = []
    for region, itas in regional_itas.items():
        mean_ita = round(sum(itas) / len(itas), 2) if itas else 0.0
        region_items.append(
            RegionDisparityItem(
                region=region,
                mean_ita=mean_ita,
                monk_tones=regional_monks[region],
                total_images=len(itas),
            )
        )

    bias_rate = round(stereotypical_bias_count / total_audited, 3) if total_audited > 0 else 0.0

    return MetricSummaryResponse(
        job_id=job.id,
        total_audited=total_audited,
        ita_distribution=tone_items,
        monk_distribution=dict(monk_counter),
        regional_disparities=region_items,
        stereotypical_bias_rate=bias_rate,
    )
