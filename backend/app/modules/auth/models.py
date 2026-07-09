"""
Genba Management System — Auth Module: SQLAlchemy Models.

Defines UserModel with 6 roles (SEC§2.1).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.permissions import Role


class UserModel(Base):
    """
    Application user with role-based access control.

    Stores credentials and role assignment.
    Password is stored as bcrypt hash — NEVER plaintext.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    username: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )
    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Role — one of the 6 defined roles (SEC§2.1)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=Role.INTERNAL_STAFF,
    )

    # Linked entity ID — used by RLS to scope data access:
    # - INTERNAL_STAFF → staff.id
    # - GENBA_WORKER   → worker.id
    # - PARTNER        → partner_company.id
    # - ADMIN / SENIOR_STAFF → null (see all)
    related_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,
    )

    # Account state
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps (UTC stored in DB — see INT§3.1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"User(id={self.id}, username={self.username}, role={self.role})"
