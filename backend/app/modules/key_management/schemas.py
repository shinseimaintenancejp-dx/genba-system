"""
Genba Management System — Key Management Pydantic Schemas.

Defines request/response DTOs for key management endpoints.
Plaintext key codes are ONLY returned via the dedicated reveal endpoint.
Normal list/detail responses return masked values (●●●●●●).

See: SEC§4.2
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    """Base schema with standard configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
    )


# =============================================================================
# Request Schemas
# =============================================================================


class KeyInfoCreate(BaseSchema):
    """Schema for creating a new key info entry."""

    key_label: str = Field(..., max_length=100, description="Key label/name")
    key_code: str | None = Field(
        None, max_length=100, description="Key code (plaintext — will be encrypted)"
    )
    keybanker_code: str | None = Field(
        None,
        max_length=100,
        description="Keybanker code (plaintext — will be encrypted)",
    )
    location_description: str | None = Field(
        None, max_length=500, description="Location description"
    )
    notes: str | None = Field(None, max_length=1000, description="Additional notes")
    sort_order: int = Field(default=0, ge=0, description="Display order")


class KeyInfoUpdate(BaseSchema):
    """Schema for updating a key info entry."""

    key_label: str | None = Field(None, max_length=100)
    key_code: str | None = Field(
        None,
        max_length=100,
        description="New key code (plaintext — will be re-encrypted)",
    )
    keybanker_code: str | None = Field(
        None,
        max_length=100,
        description="New keybanker code (plaintext — will be re-encrypted)",
    )
    location_description: str | None = Field(None, max_length=500)
    notes: str | None = Field(None, max_length=1000)
    sort_order: int | None = Field(None, ge=0)


# =============================================================================
# Response Schemas
# =============================================================================


class KeyInfoResponse(BaseSchema):
    """Response schema with masked key codes (default for list/detail)."""

    id: UUID
    genba_id: UUID
    key_label: str
    has_key_code: bool = Field(description="Whether a key code is stored")
    has_keybanker_code: bool = Field(description="Whether a keybanker code is stored")
    key_code_masked: str = Field(
        default="●●●●●●", description="Masked key code (never plaintext)"
    )
    keybanker_code_masked: str = Field(
        default="●●●●●●", description="Masked keybanker code (never plaintext)"
    )
    location_description: str | None
    notes: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime


class KeyInfoDecryptedResponse(BaseSchema):
    """Response schema with decrypted plaintext key codes (reveal endpoint only).

    WARNING: This schema returns sensitive plaintext data.
    NEVER log the contents of this response (SEC§4.2).
    """

    id: UUID
    genba_id: UUID
    key_label: str
    key_code: str | None = Field(
        None, description="Decrypted key code (SENSITIVE — do not log)"
    )
    keybanker_code: str | None = Field(
        None, description="Decrypted keybanker code (SENSITIVE — do not log)"
    )
    location_description: str | None
    notes: str | None
