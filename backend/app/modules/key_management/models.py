"""
Genba Management System — Key Info ORM Model.

Stores encrypted key codes (key_code, keybanker_code) using pgcrypto
AES-256-CBC. The encrypted data is stored as BYTEA and MUST NOT be
logged or returned in plaintext outside of the explicit reveal endpoint.

See: SEC§4.1
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class KeyInfoModel(Base):
    """Encrypted key information for a genba (worksite)."""

    __tablename__ = "key_infos"

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
    key_label: Mapped[str] = mapped_column(String(100), nullable=False)
    key_code_encrypted: Mapped[bytes | None] = mapped_column(
        LargeBinary(), nullable=True,
    )
    keybanker_code_encrypted: Mapped[bytes | None] = mapped_column(
        LargeBinary(), nullable=True,
    )
    location_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationship back to genba (lazy="selectin" for async-safe loading)
    genba: Mapped["GenbaModel"] = relationship(lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"KeyInfo(id={self.id}, genba_id={self.genba_id}, label={self.key_label})"
