"""
Genba Management System — Genba Module: SQLAlchemy Models.

Defines GenbaModel, customer_contact_genba association,
and assignment models for staff and workers.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Optional
from typing import List

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, SmallInteger, String, Table, Text, text, Column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# =============================================================================
# Association Tables
# =============================================================================

# N:N Customer Contact ↔ Genba
customer_contact_genba = Table(
    "customer_contact_genba",
    Base.metadata,
    Column(
        "customer_contact_id",
        PG_UUID(as_uuid=True),
        ForeignKey("customer_contacts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "genba_id",
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)



class GenbaModel(Base):
    """
    Genba (現場) — Central Entity.

    Represents a worksite property managed by Shinsei (e.g. BRAVI Shin-Osaka).
    """

    __tablename__ = "genba"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    property_name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    transportation: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # External partner system code (MCD) — optional
    external_partner_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Status (ACTIVE / TERMINATED)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", server_default="ACTIVE", nullable=False)

    site_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    manual_created: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    # Customer association
    customer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )

    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    management_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Genba type and floor information (Sprint 5)
    genba_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True,
    )  # MANSION / OFFICE_BUILDING / LOGISTICS_CENTER / OTHER
    genba_type_other: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
    )  # Custom text when genba_type = 'OTHER'
    floor_above_ground: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True,
    )  # 地上階数
    floor_basement: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True,
    )  # 地下階数
    terminated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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

    # Relationships
    customer: Mapped["CustomerModel"] = relationship(
        "CustomerModel",
        back_populates="genbas",
    )
    contacts: Mapped[List["CustomerContactModel"]] = relationship(
        "CustomerContactModel",
        secondary=customer_contact_genba,
        back_populates="genbas",
        lazy="selectin",
    )
    staff_assignments: Mapped[List["GenbaStaffAssignmentModel"]] = relationship(
        "GenbaStaffAssignmentModel",
        back_populates="genba",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    worker_assignments: Mapped[List["GenbaWorkerModel"]] = relationship(
        "GenbaWorkerModel",
        back_populates="genba",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Genba(id={self.id}, property_name={self.property_name})"


# =============================================================================
# Assignment Models (Sprint 4 — defined here to avoid relationship errors)
# =============================================================================

class GenbaStaffAssignmentModel(Base):
    """N:N Genba ↔ Staff Assignment Model."""

    __tablename__ = "genba_staff_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    genba_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        nullable=False,
    )
    staff_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("staff.id", ondelete="CASCADE"),
        nullable=False,
    )
    role_type: Mapped[str] = mapped_column(
        String(20),
        default="MAIN",
        server_default="MAIN",
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    genba: Mapped["GenbaModel"] = relationship("GenbaModel", back_populates="staff_assignments")
    staff: Mapped["StaffModel"] = relationship("StaffModel", lazy="selectin")


class GenbaWorkerModel(Base):
    """N:N Genba ↔ Workers Assignment Model."""

    __tablename__ = "genba_workers"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    genba_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        nullable=False,
    )
    worker_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workers.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    removed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    genba: Mapped["GenbaModel"] = relationship("GenbaModel", back_populates="worker_assignments")
    worker: Mapped["WorkerModel"] = relationship("WorkerModel", lazy="selectin")
