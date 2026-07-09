"""
Genba Management System — Photo ORM Model.

Stores metadata for photos uploaded to S3-compatible storage.
The actual file is stored externally — only the S3 object key is persisted here.

See: INFRA§4.2
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class GenbaPhotoModel(Base):
    """Photo metadata linked to a genba — file stored in S3."""

    __tablename__ = "genba_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    genba_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        nullable=False,
    )
    photo_type: Mapped[str] = mapped_column(
        String(20), nullable=False,
    )  # 'SITE' | 'WORK_REPORT'
    file_key: Mapped[str] = mapped_column(
        String(500), nullable=False,
    )  # S3 object key
    file_name: Mapped[str] = mapped_column(
        String(255), nullable=False,
    )  # Original file name
    file_size: Mapped[int] = mapped_column(
        Integer, nullable=False,
    )  # File size in bytes
    content_type: Mapped[str] = mapped_column(
        String(100), nullable=False,
    )  # MIME type (e.g., image/jpeg)
    caption: Mapped[str | None] = mapped_column(
        Text, nullable=True,
    )  # Photo caption/description
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    genba: Mapped["GenbaModel"] = relationship(lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"GenbaPhoto(id={self.id}, genba_id={self.genba_id}, "
            f"type={self.photo_type}, file={self.file_name})"
        )
