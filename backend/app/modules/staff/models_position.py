"""
Genba Management System — Staff Module: Position Models.

Defines the Position master data and Many-to-Many association with Staff.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# Association table for Many-to-Many relationship between Staff and Positions
staff_positions = Table(
    "staff_positions",
    Base.metadata,
    Column(
        "staff_id",
        PG_UUID(as_uuid=True),
        ForeignKey("staff.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "position_id",
        PG_UUID(as_uuid=True),
        ForeignKey("positions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class PositionModel(Base):
    """
    Master data table for Staff Positions (役職).
    """
    __tablename__ = "positions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
