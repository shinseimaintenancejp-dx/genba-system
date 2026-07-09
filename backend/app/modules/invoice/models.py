"""
Genba Management System — Invoice Models.
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import DECIMAL, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class InvoiceModel(Base):
    """
    SQLAlchemy model for invoices.
    """

    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    
    # 'OUTGOING', 'INCOMING'
    invoice_type: Mapped[str] = mapped_column(String(20), nullable=False)
    
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    billing_period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    billing_period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    
    amount: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)
    tax_amount: Mapped[float] = mapped_column(DECIMAL(12, 2), default=0)
    
    # 'AUTO_GENERATED', 'DRAFT', 'PENDING_APPROVAL', 'ISSUED', 'PAID', 'CANCELLED'
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", server_default="DRAFT")
    is_auto_generated: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    contract_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contracts.id"), nullable=False)
    
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc)
    )
