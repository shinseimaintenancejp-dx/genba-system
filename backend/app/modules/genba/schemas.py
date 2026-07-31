"""
Genba Management System — Genba Module: Pydantic Schemas.

Defines schemas for worksite validation, duplicate verification, and response serialization.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

# =============================================================================
# Inline Creation Schemas (Sprint 5)
# =============================================================================

class NewContactInline(BaseModel):
    """Schema for creating a new customer contact inline during Genba registration."""

    full_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=100)
    position: str | None = Field(default=None, max_length=100)


class StaffAssignmentInline(BaseModel):
    """Schema for assigning internal staff inline during Genba registration."""

    staff_id: uuid.UUID
    role_type: str = Field(default="MAIN", pattern="^(MAIN|SUB)$")


# =============================================================================
# Genba Base Schemas
# =============================================================================

class GenbaBase(BaseModel):
    """Base schema for Genba containing shared attributes."""

    property_name: str = Field(min_length=1, max_length=200)
    address: str = Field(max_length=500, default="")
    transportation: str | None = Field(default=None)
    phone: str | None = Field(default=None, max_length=20)
    external_partner_code: str | None = Field(default=None, max_length=20)
    special_notes: str | None = Field(default=None)
    management_start_date: date | None = Field(default=None)


class GenbaCreate(GenbaBase):
    """Request schema for creating a new Genba worksite."""

    customer_id: uuid.UUID
    confirm_duplicate: bool = Field(default=False, description="Confirm and force creation if a similar name exists")

    # Sprint 5: Genba type and floor information
    genba_type: str | None = Field(default=None, max_length=30, description="MANSION / OFFICE_BUILDING / LOGISTICS_CENTER / OTHER")
    genba_type_other: str | None = Field(default=None, max_length=100, description="Custom type text when genba_type is OTHER")
    floor_above_ground: int | None = Field(default=None, ge=0, le=200, description="Above ground floor count")
    floor_basement: int | None = Field(default=None, ge=0, le=30, description="Basement floor count")

    # Sprint 5: Inline contact and staff assignment
    contact_ids: list[uuid.UUID] = Field(default_factory=list, description="Existing customer contact IDs to assign")
    new_contacts: list[NewContactInline] = Field(default_factory=list, description="New contacts to create inline")
    staff_assignments: list[StaffAssignmentInline] = Field(default_factory=list, description="Staff assignments (MAIN/SUB)")

    @model_validator(mode="after")
    def validate_genba_type_other(self):
        """Ensure genba_type_other is provided when genba_type is OTHER."""
        if self.genba_type == "OTHER" and not self.genba_type_other:
            raise ValueError("現場タイプが「その他」の場合、詳細を入力してください。")
        if self.genba_type and self.genba_type not in ("MANSION", "OFFICE_BUILDING", "LOGISTICS_CENTER", "OTHER"):
            raise ValueError("無効な現場タイプです。")
        return self


class GenbaUpdate(BaseModel):
    """Request schema for updating an existing Genba worksite."""

    property_name: str | None = Field(default=None, min_length=1, max_length=200)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    transportation: str | None = Field(default=None)
    phone: str | None = Field(default=None, max_length=20)
    external_partner_code: str | None = Field(default=None, max_length=20)
    special_notes: str | None = Field(default=None)
    management_start_date: date | None = Field(default=None)
    status: str | None = Field(default=None, max_length=20)
    site_confirmed: bool | None = Field(default=None)
    manual_created: bool | None = None

    # Sprint 5: Genba type and floor information
    genba_type: str | None = Field(default=None, max_length=30)
    genba_type_other: str | None = Field(default=None, max_length=100)
    floor_above_ground: int | None = Field(default=None, ge=0, le=200)
    floor_basement: int | None = Field(default=None, ge=0, le=30)

    # Sprint 5: Contact and staff assignment updates
    contact_ids: list[uuid.UUID] | None = Field(default=None, description="Replace contact assignments")
    new_contacts: list[NewContactInline] | None = Field(default=None, description="New contacts to create inline")
    staff_assignments: list[StaffAssignmentInline] | None = Field(default=None, description="Replace staff assignments")

    @model_validator(mode="after")
    def validate_genba_type_other(self):
        """Ensure genba_type_other is provided when genba_type is OTHER."""
        if self.genba_type == "OTHER" and not self.genba_type_other:
            raise ValueError("現場タイプが「その他」の場合、詳細を入力してください。")
        return self


class GenbaResponse(GenbaBase):
    """Response schema representing a Genba worksite."""

    id: uuid.UUID
    customer_id: uuid.UUID
    status: str
    site_confirmed: bool
    manual_created: bool
    genba_type: str | None = None
    genba_type_other: str | None = None
    has_daily_contract: bool = False
    has_periodic_contract: bool = False
    floor_above_ground: int | None = None
    floor_basement: int | None = None
    terminated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    staff_assignments: list["StaffAssignmentBriefResponse"] = []
    customer: "CustomerBriefResponse | None" = None

    model_config = ConfigDict(from_attributes=True, strict=False)


# =============================================================================
# Duplicate Name Check
# =============================================================================

class DuplicateWarningResponse(BaseModel):
    """Response returned when a potential duplicate worksite name is detected."""

    warning: str
    duplicates: list[GenbaResponse]


# =============================================================================
# Brief Response Schemas (for nested inclusion)
# =============================================================================

class CustomerBriefResponse(BaseModel):
    """Brief representation of a Customer company."""

    id: uuid.UUID
    full_name: str
    short_name: str

    model_config = ConfigDict(from_attributes=True, strict=True)


class StaffBriefResponse(BaseModel):
    """Brief representation of a Staff member."""

    id: uuid.UUID
    last_name: str
    first_name: str
    position: str | None = None

    model_config = ConfigDict(from_attributes=True, strict=True)


class StaffAssignmentBriefResponse(BaseModel):
    """Brief representation of a Staff assignment with role."""

    id: uuid.UUID
    staff_id: uuid.UUID
    role_type: str
    staff: StaffBriefResponse

    model_config = ConfigDict(from_attributes=True, strict=True)


class ContactBriefResponse(BaseModel):
    """Brief representation of a Customer Contact."""

    id: uuid.UUID
    full_name: str
    position: str | None = None
    phone: str | None = None
    email: str | None = None

    model_config = ConfigDict(from_attributes=True, strict=True)


class GenbaDetailResponse(GenbaResponse):
    """Detailed response schema representing a Genba with customer, contacts and staff info."""

    customer: CustomerBriefResponse
    contacts: list[ContactBriefResponse] = []
    staff_assignments: list[StaffAssignmentBriefResponse] = []

    model_config = ConfigDict(from_attributes=True, strict=True)
