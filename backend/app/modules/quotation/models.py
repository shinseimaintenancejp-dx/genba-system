"""
Genba Management System — Quotation Models.
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import DECIMAL, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QuotationModel(Base):
    """
    SQLAlchemy model for quotations.
    """

    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    quotation_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)

    total_amount: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)
    tax_amount: Mapped[float] = mapped_column(DECIMAL(12, 2), default=0)

    work_cycle: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_hours: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    special_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 'DRAFT', 'PENDING_APPROVAL', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", server_default="DRAFT")

    genba_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("genba.id"), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False)
    contract_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("contracts.id"), nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc)
    )

    items: Mapped[list["QuotationItemModel"]] = relationship(
        "QuotationItemModel", back_populates="quotation", cascade="all, delete-orphan"
    )


class QuotationItemModel(Base):
    """
    SQLAlchemy model for quotation items.
    """

    __tablename__ = "quotation_items"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False
    )
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    unit_price: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    quotation: Mapped["QuotationModel"] = relationship("QuotationModel", back_populates="items")
