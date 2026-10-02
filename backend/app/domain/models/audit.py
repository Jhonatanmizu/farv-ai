from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.domain.models.user import User


class AuditJob(Base):
    __tablename__ = "audit_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    repetitions: Mapped[int] = mapped_column(Integer, default=1)
    total_conditions: Mapped[int] = mapped_column(Integer, default=0)
    total_images: Mapped[int] = mapped_column(Integer, default=0)
    completed_images: Mapped[int] = mapped_column(Integer, default=0)
    failed_images: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    images: Mapped[list["GeneratedImage"]] = relationship(
        "GeneratedImage", back_populates="job", cascade="all, delete-orphan"
    )


class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("audit_jobs.id", ondelete="CASCADE"), index=True
    )
    system: Mapped[str] = mapped_column(String(50), nullable=False)
    identity_formulation: Mapped[str] = mapped_column(String(50), nullable=False)
    occupation: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str] = mapped_column(String(50), nullable=False)
    repetition_index: Mapped[int] = mapped_column(Integer, default=0)

    prompt_pt: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)

    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    job: Mapped["AuditJob"] = relationship("AuditJob", back_populates="images")
    quantitative_metric: Mapped["QuantitativeMetric | None"] = relationship(
        "QuantitativeMetric", back_populates="image", uselist=False, cascade="all, delete-orphan"
    )
    qualitative_audits: Mapped[list["QualitativeAudit"]] = relationship(
        "QualitativeAudit", back_populates="image", cascade="all, delete-orphan"
    )

    @property
    def qualitative_audit(self) -> "QualitativeAudit | None":
        """Convenience property for backward compatibility with single-audit callers."""
        verified = [a for a in self.qualitative_audits if a.researcher_verified]
        if verified:
            return verified[-1]
        return self.qualitative_audits[0] if self.qualitative_audits else None


class QuantitativeMetric(Base):
    __tablename__ = "quantitative_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    image_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("generated_images.id", ondelete="CASCADE"), unique=True, index=True
    )

    ita_angle: Mapped[float] = mapped_column(Float, nullable=False)
    ita_category: Mapped[str] = mapped_column(String(50), nullable=False)
    monk_tone: Mapped[int] = mapped_column(Integer, nullable=False)
    monk_delta_e: Mapped[float] = mapped_column(Float, nullable=False)

    l_star: Mapped[float] = mapped_column(Float, nullable=False)
    a_star: Mapped[float] = mapped_column(Float, nullable=False)
    b_star: Mapped[float] = mapped_column(Float, nullable=False)
    face_detected: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    image: Mapped["GeneratedImage"] = relationship(
        "GeneratedImage", back_populates="quantitative_metric"
    )


class QualitativeAudit(Base):
    __tablename__ = "qualitative_audits"
    __table_args__ = (
        UniqueConstraint("image_id", "user_id", name="uq_image_user_review"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    image_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("generated_images.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    prompt_adherence_score: Mapped[float] = mapped_column(Float, default=1.0)
    detected_environment: Mapped[str] = mapped_column(String(100), nullable=False)
    visual_markers: Mapped[str] = mapped_column(Text, default="")
    stereotypical_bias_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    researcher_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    image: Mapped["GeneratedImage"] = relationship(
        "GeneratedImage", back_populates="qualitative_audits"
    )
    user: Mapped["User | None"] = relationship("User", back_populates="audits")
