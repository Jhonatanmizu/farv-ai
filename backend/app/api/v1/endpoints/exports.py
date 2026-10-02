import csv
import io
import sqlite3
import tempfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db_session
from app.domain.models.audit import GeneratedImage, QualitativeAudit

router = APIRouter(prefix="/exports", tags=["Exports"])


def _resolve_base_url(request: Request) -> str:
    """Resolves public base URL (Fly.io host or incoming request base)."""
    if settings.PUBLIC_BASE_URL and settings.PUBLIC_BASE_URL.strip():
        return settings.PUBLIC_BASE_URL.strip().rstrip("/")
    return str(request.base_url).rstrip("/")


@router.get("/sqlite")
def export_sqlite_database() -> FileResponse:
    """Exports an atomically consistent snapshot of the active SQLite database."""
    db_path = settings.SQLITE_DB_PATH
    if not db_path or not Path(db_path).exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de banco de dados SQLite não encontrado.",
        )

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    temp_dir = tempfile.gettempdir()
    snapshot_path = Path(temp_dir) / f"farv_ia_export_{timestamp}.sqlite"

    # Safely perform an online backup to guarantee non-corrupted consistency
    try:
        source_conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        dest_conn = sqlite3.connect(str(snapshot_path))
        with dest_conn:
            source_conn.backup(dest_conn)
        source_conn.close()
        dest_conn.close()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar snapshot do banco de dados SQLite: {exc}",
        ) from exc

    return FileResponse(
        path=str(snapshot_path),
        media_type="application/x-sqlite3",
        filename=f"farv_ia_database_{timestamp}.sqlite",
    )


@router.get("/csv")
async def export_csv(
    request: Request,
    job_id: str | None = Query(default=None, description="Optional job ID to filter export"),
    db: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    """Exports dataset in CSV format with correlated metadata, metrics, and reviews."""
    base_url = _resolve_base_url(request)

    stmt = select(GeneratedImage).options(
        selectinload(GeneratedImage.job),
        selectinload(GeneratedImage.quantitative_metric),
        selectinload(GeneratedImage.qualitative_audits).selectinload(QualitativeAudit.user),
    )
    if job_id:
        stmt = stmt.where(GeneratedImage.job_id == job_id)
    stmt = stmt.order_by(GeneratedImage.created_at)

    result = await db.execute(stmt)
    images = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header definition
    writer.writerow(
        [
            "job_id",
            "job_name",
            "job_provider",
            "image_id",
            "system",
            "identity_formulation",
            "occupation",
            "region",
            "repetition_index",
            "prompt_pt",
            "prompt_en",
            "seed",
            "image_file_path",
            "image_url",
            "image_status",
            "latency_ms",
            "error_message",
            "image_created_at",
            "ita_angle",
            "ita_category",
            "monk_tone",
            "monk_delta_e",
            "l_star",
            "a_star",
            "b_star",
            "face_detected",
            "reviewer_username",
            "reviewer_id",
            "prompt_adherence_score",
            "detected_environment",
            "visual_markers",
            "stereotypical_bias_detected",
            "notes",
            "researcher_verified",
            "review_created_at",
        ]
    )

    for img in images:
        job_name = img.job.name if img.job else ""
        job_provider = img.job.provider if img.job else ""
        full_image_url = (
            f"{base_url}{img.file_path}" if img.file_path and img.file_path.startswith("/") else ""
        )

        quant = img.quantitative_metric
        ita_angle = quant.ita_angle if quant else ""
        ita_category = quant.ita_category if quant else ""
        monk_tone = quant.monk_tone if quant else ""
        monk_delta_e = quant.monk_delta_e if quant else ""
        l_star = quant.l_star if quant else ""
        a_star = quant.a_star if quant else ""
        b_star = quant.b_star if quant else ""
        face_detected = quant.face_detected if quant else ""

        reviews = img.qualitative_audits
        if not reviews:
            # Output image row with empty review fields
            writer.writerow(
                [
                    img.job_id,
                    job_name,
                    job_provider,
                    img.id,
                    img.system,
                    img.identity_formulation,
                    img.occupation,
                    img.region,
                    img.repetition_index,
                    img.prompt_pt,
                    img.prompt_en or "",
                    img.seed or "",
                    img.file_path or "",
                    full_image_url,
                    img.status,
                    img.latency_ms or "",
                    img.error_message or "",
                    img.created_at.isoformat() if img.created_at else "",
                    ita_angle,
                    ita_category,
                    monk_tone,
                    monk_delta_e,
                    l_star,
                    a_star,
                    b_star,
                    face_detected,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            )
        else:
            for rev in reviews:
                reviewer_name = (
                    rev.user.username
                    if rev.user
                    else ("Automated (Codebook)" if rev.user_id is None else rev.user_id)
                )
                writer.writerow(
                    [
                        img.job_id,
                        job_name,
                        job_provider,
                        img.id,
                        img.system,
                        img.identity_formulation,
                        img.occupation,
                        img.region,
                        img.repetition_index,
                        img.prompt_pt,
                        img.prompt_en or "",
                        img.seed or "",
                        img.file_path or "",
                        full_image_url,
                        img.status,
                        img.latency_ms or "",
                        img.error_message or "",
                        img.created_at.isoformat() if img.created_at else "",
                        ita_angle,
                        ita_category,
                        monk_tone,
                        monk_delta_e,
                        l_star,
                        a_star,
                        b_star,
                        face_detected,
                        reviewer_name,
                        rev.user_id or "",
                        rev.prompt_adherence_score,
                        rev.detected_environment,
                        rev.visual_markers,
                        rev.stereotypical_bias_detected,
                        rev.notes,
                        rev.researcher_verified,
                        rev.created_at.isoformat() if rev.created_at else "",
                    ]
                )

    csv_data = output.getvalue()
    output.close()

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    prefix = f"job_{job_id}" if job_id else "all_sessions"
    filename = f"farv_ia_{prefix}_{timestamp}.csv"

    return StreamingResponse(
        io.BytesIO(csv_data.encode("utf-8-sig")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/images.zip")
async def export_images_zip(
    job_id: str | None = Query(default=None, description="Optional job ID to filter image zip"),
    db: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    """Exports a compressed ZIP bundle containing generated PNG images and a metadata index."""
    stmt = select(GeneratedImage).where(GeneratedImage.status == "completed")
    if job_id:
        stmt = stmt.where(GeneratedImage.job_id == job_id)

    result = await db.execute(stmt)
    images = result.scalars().all()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        manifest_lines = [
            "image_id,job_id,system,identity,occupation,region,filename",
        ]

        for img in images:
            if not img.file_path:
                continue

            # Resolve disk file path
            # img.file_path is like /static/images/{job_id}/{image_id}.png
            clean_rel = img.file_path.replace("/static/images/", "").lstrip("/")
            disk_path = settings.IMAGES_DIR / clean_rel
            if disk_path.exists() and disk_path.is_file():
                archive_name = f"images/{clean_rel}"
                zip_file.write(str(disk_path), arcname=archive_name)
                manifest_lines.append(
                    f"{img.id},{img.job_id},{img.system},{img.identity_formulation},{img.occupation},{img.region},{archive_name}"
                )

        zip_file.writestr("manifest.csv", "\n".join(manifest_lines))

    zip_buffer.seek(0)
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    prefix = f"job_{job_id}" if job_id else "all_images"
    filename = f"farv_ia_{prefix}_{timestamp}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
