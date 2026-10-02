from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

DATABASE_URL = f"sqlite+aiosqlite:///{settings.SQLITE_DB_PATH}"

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def init_db() -> None:
    # Ensure all models are registered with Base.metadata
    from app.core.security import hash_password
    from app.domain.models import (  # noqa: F401
        AuditJob,
        GeneratedImage,
        QualitativeAudit,
        QuantitativeMetric,
        User,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Migration helper for existing databases: check if user_id exists on qualitative_audits
        def check_and_add_columns(connection):
            from sqlalchemy import inspect, text

            inspector = inspect(connection)
            if "qualitative_audits" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("qualitative_audits")]
                if "user_id" not in columns:
                    connection.execute(
                        text("ALTER TABLE qualitative_audits ADD COLUMN user_id VARCHAR(36)")
                    )

                # Ensure image_id index is not unique alone, and create composite index
                indexes = inspector.get_indexes("qualitative_audits")
                for idx in indexes:
                    if idx["name"] == "ix_qualitative_audits_image_id" and idx["unique"]:
                        connection.execute(text("DROP INDEX ix_qualitative_audits_image_id"))
                        connection.execute(
                            text(
                                "CREATE INDEX ix_qualitative_audits_image_id "
                                "ON qualitative_audits (image_id)"
                            )
                        )

                # Create composite unique index if not present
                existing_names = [
                    idx["name"] for idx in inspector.get_indexes("qualitative_audits")
                ]
                if "uq_image_user_review" not in existing_names:
                    connection.execute(
                        text(
                            "CREATE UNIQUE INDEX uq_image_user_review "
                            "ON qualitative_audits (image_id, user_id)"
                        )
                    )

        await conn.run_sync(check_and_add_columns)

    # Seed initial admin user if no users exist
    async with async_session_maker() as session:
        from sqlalchemy import select

        stmt = select(User).limit(1)
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            admin_user = User(
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role="admin",
            )
            session.add(admin_user)
            await session.commit()
