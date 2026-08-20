"""
Genba Management System — Manual Module: Pydantic Schemas.

Defines validation and serialization models for:
- Entry/Exit Instructions
- Daily Cleaning Tasks
- CleaningAreas (master data)
- Memos
- Memo Attachments
"""

import uuid
from datetime import datetime, time
from pydantic import BaseModel, ConfigDict, Field
from app.modules.auth.schemas import UserResponse
from app.modules.contract.schemas import WorkSlotResponse, WorkerCountResponse


# =============================================================================
# Base Schema (strictly aligned with BE§5.1)
# =============================================================================
class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,       # ORM mode
        str_strip_whitespace=True,   # Auto-strip whitespace
        strict=False,                # Allow type coercion for strings to time/datetime
    )


# =============================================================================
# Entry/Exit Instructions
# =============================================================================
class EntryExitUpsert(BaseSchema):
    """Request schema for creating or updating entry/exit instructions."""

    entry_method: str | None = Field(default=None, description="入館手順 (Rich text / Plain text)")
    exit_method: str | None = Field(default=None, description="退館手順 (Rich text / Plain text)")
    safety_notes: str | None = Field(default=None, description="安全注意事項")


class EntryExitResponse(BaseSchema):
    """Response schema representing entry/exit instructions."""

    id: uuid.UUID
    genba_id: uuid.UUID
    entry_method: str | None
    exit_method: str | None
    safety_notes: str | None
    updated_at: datetime


# =============================================================================
# Daily Cleaning Tasks
# =============================================================================
class DailyCleaningTaskContentCreate(BaseSchema):
    area_name: str = Field(..., min_length=1, max_length=500)
    work_content: str = Field(..., min_length=1)
    sort_order: int = Field(default=0, ge=0)


class DailyCleaningTaskContentResponse(BaseSchema):
    id: uuid.UUID
    task_id: uuid.UUID
    area_name: str
    work_content: str
    sort_order: int


class DailyCleaningTaskCreate(BaseSchema):
    """Request schema for creating a daily cleaning task."""

    contract_id: uuid.UUID | None = Field(default=None, description="契約ID")
    day_of_week: str | None = Field(
        default=None,
        max_length=50,
        description="曜日 (NULL=毎日, or comma-separated e.g. '月,火,水')",
    )
    start_time: time | None = Field(default=None, description="開始時間 (optional)")
    floor: str | None = Field(default=None, max_length=50, description="階数")
    contents: list[DailyCleaningTaskContentCreate] = Field(default_factory=list, description="作業内容リスト")
    special_notes: str | None = Field(default=None, description="特記事項")


class DailyCleaningTaskUpdate(BaseSchema):
    """Request schema for updating a daily cleaning task."""

    contract_id: uuid.UUID | None = Field(default=None)
    day_of_week: str | None = Field(default=None, max_length=50)
    start_time: time | None = Field(default=None)
    floor: str | None = Field(default=None, max_length=50)
    contents: list[DailyCleaningTaskContentCreate] | None = Field(default=None)
    special_notes: str | None = Field(default=None)


class ContractDailyBriefResponse(BaseSchema):
    """Brief contract representation including nested schedule info for daily tasks."""
    id: uuid.UUID
    contract_name: str | None = None
    service_category: str = "OTHER"
    weekly_frequency: int | None = None
    work_days: str | None = None
    work_start_time: time | None = None
    work_end_time: time | None = None
    work_duration_hours: float | None = None
    work_slots: list[WorkSlotResponse] | None = None
    worker_counts: list[WorkerCountResponse] | None = None


class DailyCleaningTaskResponse(BaseSchema):
    """Response schema representing a daily cleaning task."""

    id: uuid.UUID
    genba_id: uuid.UUID
    contract_id: uuid.UUID | None = None
    contract: ContractDailyBriefResponse | None = None
    day_of_week: str | None
    start_time: time | None  # Nullable — may not be specified
    floor: str | None
    contents: list[DailyCleaningTaskContentResponse] = []
    special_notes: str | None
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Cleaning Areas (Master Data)
# =============================================================================
class CleaningAreaCreate(BaseSchema):
    """Request schema for creating a cleaning area master entry."""

    name: str = Field(..., min_length=1, max_length=100, description="エリア名称")
    sort_order: int = Field(default=0, ge=0, description="表示順")


class CleaningAreaUpdate(BaseSchema):
    """Request schema for updating a cleaning area master entry."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = Field(default=None)


class CleaningAreaResponse(BaseSchema):
    """Response schema representing a cleaning area master entry."""

    id: uuid.UUID
    name: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Daily Work Types (Master Data)
# =============================================================================
class DailyWorkTypeCreate(BaseSchema):
    """Request schema for creating a daily work type master entry."""

    name: str = Field(..., min_length=1, max_length=100, description="作業内容名称")
    sort_order: int = Field(default=0, ge=0, description="表示順")


class DailyWorkTypeUpdate(BaseSchema):
    """Request schema for updating a daily work type master entry."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = Field(default=None)


class DailyWorkTypeResponse(BaseSchema):
    """Response schema representing a daily work type master entry."""

    id: uuid.UUID
    name: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Frequencies (Master Data)
# =============================================================================
class FrequencyCreate(BaseSchema):
    """Request schema for creating a frequency master entry."""

    name: str = Field(..., min_length=1, max_length=100, description="頻度名称")
    sort_order: int = Field(default=0, ge=0, description="表示順")


class FrequencyUpdate(BaseSchema):
    """Request schema for updating a frequency master entry."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = Field(default=None)


class FrequencyResponse(BaseSchema):
    """Response schema representing a frequency master entry."""

    id: uuid.UUID
    name: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Periodic Work Types (Master Data)
# =============================================================================
class PeriodicWorkTypeCreate(BaseSchema):
    """Request schema for creating a periodic work type master entry."""

    name: str = Field(..., min_length=1, max_length=100, description="作業内容名称")
    sort_order: int = Field(default=0, ge=0, description="表示順")


class PeriodicWorkTypeUpdate(BaseSchema):
    """Request schema for updating a periodic work type master entry."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = Field(default=None)


class PeriodicWorkTypeResponse(BaseSchema):
    """Response schema representing a periodic work type master entry."""

    id: uuid.UUID
    name: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Memos & Attachments
# =============================================================================
class MemoAttachmentResponse(BaseSchema):
    """Response schema representing a memo attachment."""

    id: uuid.UUID
    memo_id: uuid.UUID
    file_name: str
    file_url: str
    file_size: int | None
    file_type: str | None
    created_at: datetime


class MemoCreate(BaseSchema):
    """Request schema for creating a memo."""

    memo_date: datetime = Field(..., description="メモ日時")
    content: str = Field(..., min_length=1, description="内容")


class MemoUpdate(BaseSchema):
    """Request schema for updating a memo."""

    memo_date: datetime | None = Field(default=None)
    content: str | None = Field(default=None, min_length=1)


class MemoResponse(BaseSchema):
    """Response schema representing a memo."""

    id: uuid.UUID
    genba_id: uuid.UUID
    memo_date: datetime
    content: str
    created_by: uuid.UUID | None
    creator: UserResponse | None = None
    attachments: list[MemoAttachmentResponse] = []
    created_at: datetime
    updated_at: datetime
