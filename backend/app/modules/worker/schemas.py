"""
Genba Management System — Worker Module: Pydantic Schemas.

Defines schemas for worker validation and serialization.
"""

import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr


class WorkerBase(BaseModel):
    """Base schema for Worker."""

    full_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None)
    birth_date: date | None = Field(default=None)
    notes: str | None = Field(default=None)


class WorkerCreate(WorkerBase):
    """Request schema for creating a new Worker."""
    pass


class WorkerUpdate(BaseModel):
    """Request schema for updating a Worker."""

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = Field(default=None)
    birth_date: date | None = Field(default=None)
    notes: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class WorkerResponse(WorkerBase):
    """Response schema representing a Worker."""

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, strict=True)


# =============================================================================
# Worker Assignment Schemas
# =============================================================================

class GenbaWorkerCreate(BaseModel):
    """Request schema for assigning a Worker to a Genba worksite."""

    worker_id: uuid.UUID


class GenbaWorkerResponse(BaseModel):
    """Response schema representing a Worker assignment on a Genba."""

    id: uuid.UUID
    genba_id: uuid.UUID
    worker_id: uuid.UUID
    is_active: bool
    assigned_at: datetime
    removed_at: datetime | None = None
    worker: WorkerResponse

    model_config = ConfigDict(from_attributes=True, strict=True)
