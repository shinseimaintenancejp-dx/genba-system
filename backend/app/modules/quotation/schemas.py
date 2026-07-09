"""
Genba Management System — Quotation Schemas.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class QuotationItemBase(BaseModel):
    item_name: str = Field(..., max_length=200)
    quantity: float = Field(..., ge=0)
    unit: str = Field(..., max_length=20)
    unit_price: float = Field(..., ge=0)
    remarks: str | None = None
    sort_order: int = Field(default=0)


class QuotationItemCreate(QuotationItemBase):
    pass


class QuotationItemResponse(QuotationItemBase):
    id: uuid.UUID
    quotation_id: uuid.UUID
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class QuotationBase(BaseModel):
    title: str = Field(..., max_length=200)
    issue_date: date
    valid_until: date | None = None
    work_cycle: str | None = None
    work_hours: str | None = Field(None, max_length=200)
    description: str | None = None
    special_conditions: str | None = None
    customer_id: uuid.UUID


class QuotationCreate(QuotationBase):
    items: list[QuotationItemCreate] = Field(..., min_length=1)


class QuotationUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    valid_until: date | None = None
    work_cycle: str | None = None
    work_hours: str | None = Field(None, max_length=200)
    description: str | None = None
    special_conditions: str | None = None
    items: list[QuotationItemCreate] | None = None


class QuotationResponse(QuotationBase):
    id: uuid.UUID
    quotation_number: str
    total_amount: float
    tax_amount: float
    status: str
    genba_id: uuid.UUID
    contract_id: uuid.UUID | None
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    items: list[QuotationItemResponse]

    model_config = ConfigDict(from_attributes=True)


class QuotationStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status for quotation (e.g., SENT, ACCEPTED, REJECTED)")
