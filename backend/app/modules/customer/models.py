"""
Genba Management System — Customer Module: SQLAlchemy Models.

Defines CustomerModel and CustomerContactModel.
"""

import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CustomerModel(Base):
    """
    Business Customer (取引先) entity.

    Represents a client company (e.g. Nihon Housing) that contracts cleanings for genbas.
    """

    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str] = mapped_column(String(100), nullable=False)
    branch_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    fax: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

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
    contacts: Mapped[List["CustomerContactModel"]] = relationship(
        "CustomerContactModel",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    genbas: Mapped[List["GenbaModel"]] = relationship(
        "GenbaModel",
        back_populates="customer",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Customer(id={self.id}, short_name={self.short_name})"


class CustomerContactModel(Base):
    """
    Customer Contact Person (取引先担当er) entity.

    Represents a representative of a customer company managing worksites.
    """

    __tablename__ = "customer_contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

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
        back_populates="contacts",
    )
    
    # N:N relationship to Genba via customer_contact_genba
    genbas: Mapped[List["GenbaModel"]] = relationship(
        "GenbaModel",
        secondary="customer_contact_genba",
        back_populates="contacts",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"CustomerContact(id={self.id}, full_name={self.full_name})"
