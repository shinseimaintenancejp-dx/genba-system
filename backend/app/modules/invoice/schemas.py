"""
Genba Management System — Invoice Schemas.
"""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class InvoiceBase(BaseModel):
    invoice_type: Literal["OUTGOING", "INCOMING"]
    issue_date: date
    billing_period_year: int = Field(..., ge=2000, le=2100)
    billing_period_month: int = Field(..., ge=1, le=12)
    amount: float = Field(..., ge=0)
    notes: str | None = None
    contract_id: uuid.UUID


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    issue_date: date | None = None
    amount: float | None = Field(None, ge=0)
    notes: str | None = None


class InvoiceResponse(InvoiceBase):
    id: uuid.UUID
    invoice_number: str
    tax_amount: float
    status: str
    is_auto_generated: bool
    attachment_url: str | None
    confirmed_by: uuid.UUID | None
    confirmed_at: datetime | None
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
