"""
Genba Management System — Customer Module: Pydantic Schemas.

Defines validation and serialization models for Customers and contacts.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# =============================================================================
# Customer Contact Schemas
# =============================================================================

class CustomerContactBase(BaseModel):
    """Base contact schema containing shared attributes."""

    full_name: str = Field(min_length=1, max_length=100)
    position: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None)
    is_primary: bool = Field(default=False)


class CustomerContactCreate(CustomerContactBase):
    """Request schema for creating a new customer contact."""

    pass


class CustomerContactUpdate(BaseModel):
    """Request schema for updating an existing customer contact."""

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    position: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None)
    is_primary: bool | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class CustomerContactResponse(CustomerContactBase):
    """Response schema representing a customer contact."""

    id: uuid.UUID
    customer_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, strict=True)


# =============================================================================
# Customer Schemas
# =============================================================================

class CustomerBase(BaseModel):
    """Base customer schema containing shared attributes."""

    full_name: str = Field(min_length=1, max_length=200)
    short_name: str = Field(min_length=1, max_length=100)
    branch_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    fax: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None)


class CustomerCreate(CustomerBase):
    """Request schema for creating a new customer."""

    pass


class CustomerUpdate(BaseModel):
    """Request schema for updating an existing customer."""

    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    short_name: str | None = Field(default=None, min_length=1, max_length=100)
    branch_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    fax: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)
    display_order: int | None = Field(default=None)


class CustomerResponse(CustomerBase):
    """Response schema representing a customer."""

    id: uuid.UUID
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, strict=True)


# =============================================================================
# Customer Detailed Response (Contains associated entities)
# =============================================================================

class GenbaBriefResponse(BaseModel):
    """Brief representation of a Genba worksite."""

    id: uuid.UUID
    property_name: str
    address: str
    status: str

    model_config = ConfigDict(from_attributes=True, strict=True)


class CustomerDetailResponse(CustomerResponse):
    """Response schema with nested contacts list and active genba list."""

    contacts: list[CustomerContactResponse] = []
    genbas: list[GenbaBriefResponse] = []

    model_config = ConfigDict(from_attributes=True, strict=True)


# =============================================================================
# Bulk Reorder Schemas
# =============================================================================

class ReorderItem(BaseModel):
    id: uuid.UUID
    display_order: int

class ReorderRequest(BaseModel):
    items: list[ReorderItem]
