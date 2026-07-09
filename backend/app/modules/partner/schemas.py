"""
Genba Management System — Partner Module: Pydantic Schemas.

Defines validation and serialization models for Partner Companies.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PartnerCompanyBase(BaseModel):
    """Base partner company schema containing shared attributes."""

    company_name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=20)
    fax: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    contact_person: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None)


class PartnerCompanyCreate(PartnerCompanyBase):
    """Request schema for creating a new partner company."""

    pass


class PartnerCompanyUpdate(BaseModel):
    """Request schema for updating an existing partner company."""

    company_name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=20)
    fax: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    contact_person: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class PartnerCompanyResponse(PartnerCompanyBase):
    """Response schema representing a partner company."""

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, strict=True)
