"""
Genba Management System — Staff Module: Pydantic Schemas.

Defines schemas for staff validation and serialization.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr


class PositionBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)


class PositionCreate(PositionBase):
    pass


class PositionUpdate(PositionBase):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = Field(default=None)


class PositionResponse(PositionBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, strict=True)


class StaffBase(BaseModel):
    """Base schema for Staff."""

    last_name: str = Field(min_length=1, max_length=100)
    first_name: str = Field(min_length=0, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None)


class StaffCreate(StaffBase):
    """Request schema for creating a new Staff member."""
    position_ids: list[uuid.UUID] = Field(default_factory=list)


class StaffUpdate(BaseModel):
    """Request schema for updating a Staff member."""

    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    first_name: str | None = Field(default=None, min_length=0, max_length=100)
    position_ids: list[uuid.UUID] | None = Field(default=None)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class StaffResponse(StaffBase):
    """Response schema representing a Staff member."""

    id: uuid.UUID
    is_active: bool
    positions: list[PositionResponse] = Field(default_factory=list)
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
    """Response schema representing a Genba-Staff assignment."""

    id: uuid.UUID
    genba_id: uuid.UUID
    staff_id: uuid.UUID
    role_type: str
    staff: StaffResponse
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)

