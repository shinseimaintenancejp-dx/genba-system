"""
Genba Management System — Staff Module: Pydantic Schemas.

Defines schemas for staff validation and serialization.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr


class StaffBase(BaseModel):
    """Base schema for Staff."""

    full_name: str = Field(min_length=1, max_length=100)
    position: str | None = Field(default=None, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None)


class StaffCreate(StaffBase):
    """Request schema for creating a new Staff member."""
    pass


class StaffUpdate(BaseModel):
    """Request schema for updating a Staff member."""

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    position: str | None = Field(default=None, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class StaffResponse(StaffBase):
    """Response schema representing a Staff member."""

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, strict=True)


# =============================================================================
# Staff Assignment Schemas
# =============================================================================

class GenbaStaffAssignmentCreate(BaseModel):
    """Request schema for assigning a Staff member to a Genba worksite."""

    staff_id: uuid.UUID
    role_type: str = Field(default="MAIN", pattern="^(MAIN|SUB)$")


class GenbaStaffAssignmentResponse(BaseModel):
    """Response schema representing a Staff assignment on a Genba."""

    id: uuid.UUID
    genba_id: uuid.UUID
    staff_id: uuid.UUID
    role_type: str
    assigned_at: datetime
    staff: StaffResponse

    model_config = ConfigDict(from_attributes=True, strict=True)
