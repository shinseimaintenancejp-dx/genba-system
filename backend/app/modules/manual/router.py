"""
Genba Management System — Manual Module: Router.

REST API routes for entry/exit instructions, daily tasks, and memos.
"""

import uuid
from typing import Annotated, Generic, TypeVar
from fastapi import APIRouter, Depends, Query, File, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import DbSession, CurrentUser, require_permission
from app.core.pagination import PaginationParams, PaginatedResponse, build_paginated_response
from app.core.permissions import Permission, Role
from app.core.exceptions import ForbiddenError
from app.modules.manual.service import (
    ManualService,
    CleaningAreaService,
    PeriodicWorkTypeService,
    DailyWorkTypeService,
    FrequencyService,
)
from app.modules.manual.schemas import (
    EntryExitResponse,
    EntryExitUpsert,
    DailyCleaningTaskResponse,
    DailyCleaningTaskCreate,
    DailyCleaningTaskUpdate,
    CleaningAreaResponse,
    CleaningAreaCreate,
    CleaningAreaUpdate,
    PeriodicWorkTypeResponse,
    PeriodicWorkTypeCreate,
    PeriodicWorkTypeUpdate,
    DailyWorkTypeResponse,
    DailyWorkTypeCreate,
    DailyWorkTypeUpdate,
    FrequencyResponse,
    FrequencyCreate,
    FrequencyUpdate,
    MemoResponse,
    MemoCreate,
    MemoUpdate,
    MemoAttachmentResponse,
)

T = TypeVar("T")


class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""

    data: T


router = APIRouter()


# =============================================================================
# Entry/Exit Instructions
# =============================================================================
@router.get(
    "/{id}/entry-exit",
    response_model=DataEnvelope[EntryExitResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def get_entry_exit(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[EntryExitResponse]:
    """Retrieve entry/exit instructions for a genba."""
    instruction = await ManualService.get_entry_exit(db, id, current_user["id"])
    return DataEnvelope(data=EntryExitResponse.model_validate(instruction))


@router.put(
    "/{id}/entry-exit",
    response_model=DataEnvelope[EntryExitResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def upsert_entry_exit(
    db: DbSession,
    id: uuid.UUID,
    data: EntryExitUpsert,
    current_user: CurrentUser,
) -> DataEnvelope[EntryExitResponse]:
    """Create or update entry/exit instructions for a genba."""
    instruction = await ManualService.upsert_entry_exit(db, id, data, current_user["id"])
    return DataEnvelope(data=EntryExitResponse.model_validate(instruction))


# =============================================================================
# Daily Cleaning Tasks
# =============================================================================
@router.get(
    "/{id}/daily-tasks",
    response_model=DataEnvelope[list[DailyCleaningTaskResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_daily_tasks(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
    day_of_week: str | None = Query(default=None, description="曜日フィルター (月, 火...)"),
) -> DataEnvelope[list[DailyCleaningTaskResponse]]:
    """List daily cleaning tasks for a genba, optionally filtered by day of the week."""
    tasks = await ManualService.list_daily_tasks(db, id, day_of_week, current_user["id"])
    validated_tasks = [DailyCleaningTaskResponse.model_validate(t) for t in tasks]
    return DataEnvelope(data=validated_tasks)


@router.post(
    "/{id}/daily-tasks",
    response_model=DataEnvelope[DailyCleaningTaskResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_daily_task(
    db: DbSession,
    id: uuid.UUID,
    data: DailyCleaningTaskCreate,
    current_user: CurrentUser,
) -> DataEnvelope[DailyCleaningTaskResponse]:
    """Create a new daily cleaning task for a genba."""
    task = await ManualService.create_daily_task(db, id, data, current_user["id"])
    return DataEnvelope(data=DailyCleaningTaskResponse.model_validate(task))


@router.put(
    "/{id}/daily-tasks/{tid}",
    response_model=DataEnvelope[DailyCleaningTaskResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_daily_task(
    db: DbSession,
    id: uuid.UUID,
    tid: uuid.UUID,
    data: DailyCleaningTaskUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[DailyCleaningTaskResponse]:
    """Update an existing daily cleaning task."""
    task = await ManualService.update_daily_task(db, tid, data, current_user["id"])
    return DataEnvelope(data=DailyCleaningTaskResponse.model_validate(task))


@router.delete(
    "/{id}/daily-tasks/{tid}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_daily_task(
    db: DbSession,
    id: uuid.UUID,
    tid: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete a daily cleaning task."""
    await ManualService.delete_daily_task(db, tid, current_user["id"])
    return DataEnvelope(data={"message": "日常清掃タスクを削除しました"})


# =============================================================================
# Periodic Work Types (Master Data)
# =============================================================================

@router.get(
    "/master/periodic-work-types",
    response_model=DataEnvelope[list[PeriodicWorkTypeResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_periodic_work_types(db: DbSession) -> DataEnvelope[list[PeriodicWorkTypeResponse]]:
    """List all active periodic work types (master data)."""
    types = await PeriodicWorkTypeService.get_all(db)
    return DataEnvelope(data=[PeriodicWorkTypeResponse.model_validate(t) for t in types])


@router.post(
    "/master/periodic-work-types",
    response_model=DataEnvelope[PeriodicWorkTypeResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_periodic_work_type(
    db: DbSession,
    data: PeriodicWorkTypeCreate,
    current_user: CurrentUser,
) -> DataEnvelope[PeriodicWorkTypeResponse]:
    """Create a new periodic work type."""
    # Assuming role check is handled by MANUAL_WRITE or a specific master data permission
    work_type = await PeriodicWorkTypeService.create(db, data)
    return DataEnvelope(data=PeriodicWorkTypeResponse.model_validate(work_type))


@router.put(
    "/master/periodic-work-types/{type_id}",
    response_model=DataEnvelope[PeriodicWorkTypeResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_periodic_work_type(
    db: DbSession,
    type_id: uuid.UUID,
    data: PeriodicWorkTypeUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[PeriodicWorkTypeResponse]:
    """Update a periodic work type."""
    work_type = await PeriodicWorkTypeService.update(db, type_id, data)
    return DataEnvelope(data=PeriodicWorkTypeResponse.model_validate(work_type))


@router.delete(
    "/master/periodic-work-types/{type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_periodic_work_type(
    db: DbSession,
    type_id: uuid.UUID,
    current_user: CurrentUser,
):
    """Soft-delete a periodic work type."""
    await PeriodicWorkTypeService.delete(db, type_id)
    return DataEnvelope(data={"message": "日常清掃タスクを削除しました"})


# =============================================================================
# Daily Work Types (Master Data)
# =============================================================================

@router.get(
    "/master/daily-work-types",
    response_model=DataEnvelope[list[DailyWorkTypeResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_daily_work_types(db: DbSession) -> DataEnvelope[list[DailyWorkTypeResponse]]:
    """List all active daily work types (master data)."""
    types = await DailyWorkTypeService.get_all(db)
    return DataEnvelope(data=[DailyWorkTypeResponse.model_validate(t) for t in types])


@router.post(
    "/master/daily-work-types",
    response_model=DataEnvelope[DailyWorkTypeResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_daily_work_type(
    db: DbSession,
    data: DailyWorkTypeCreate,
    current_user: CurrentUser,
) -> DataEnvelope[DailyWorkTypeResponse]:
    """Create a new daily work type."""
    work_type = await DailyWorkTypeService.create(db, data)
    return DataEnvelope(data=DailyWorkTypeResponse.model_validate(work_type))


@router.put(
    "/master/daily-work-types/{type_id}",
    response_model=DataEnvelope[DailyWorkTypeResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_daily_work_type(
    db: DbSession,
    type_id: uuid.UUID,
    data: DailyWorkTypeUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[DailyWorkTypeResponse]:
    """Update a daily work type."""
    work_type = await DailyWorkTypeService.update(db, type_id, data)
    return DataEnvelope(data=DailyWorkTypeResponse.model_validate(work_type))


@router.delete(
    "/master/daily-work-types/{type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_daily_work_type(
    db: DbSession,
    type_id: uuid.UUID,
    current_user: CurrentUser,
):
    """Soft-delete a daily work type."""
    await DailyWorkTypeService.delete(db, type_id)
    return DataEnvelope(data={"message": "Deleted"})


# =============================================================================
# Frequencies (Master Data)
# =============================================================================

@router.get(
    "/master/frequencies",
    response_model=DataEnvelope[list[FrequencyResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_frequencies(db: DbSession) -> DataEnvelope[list[FrequencyResponse]]:
    """List all active frequencies (master data)."""
    freqs = await FrequencyService.get_all(db)
    return DataEnvelope(data=[FrequencyResponse.model_validate(f) for f in freqs])


@router.post(
    "/master/frequencies",
    response_model=DataEnvelope[FrequencyResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_frequency(
    db: DbSession,
    data: FrequencyCreate,
    current_user: CurrentUser,
) -> DataEnvelope[FrequencyResponse]:
    """Create a new frequency."""
    freq = await FrequencyService.create(db, data)
    return DataEnvelope(data=FrequencyResponse.model_validate(freq))


@router.put(
    "/master/frequencies/{freq_id}",
    response_model=DataEnvelope[FrequencyResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_frequency(
    db: DbSession,
    freq_id: uuid.UUID,
    data: FrequencyUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[FrequencyResponse]:
    """Update a frequency."""
    freq = await FrequencyService.update(db, freq_id, data)
    return DataEnvelope(data=FrequencyResponse.model_validate(freq))


@router.delete(
    "/master/frequencies/{freq_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_frequency(
    db: DbSession,
    freq_id: uuid.UUID,
    current_user: CurrentUser,
):
    """Soft-delete a frequency."""
    await FrequencyService.delete(db, freq_id)
    return DataEnvelope(data={"message": "Deleted"})


# =============================================================================
# Memos
# =============================================================================
@router.get(
    "/{id}/memos",
    response_model=PaginatedResponse[MemoResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_memos(
    db: DbSession,
    id: uuid.UUID,
    pagination: Annotated[PaginationParams, Depends()],
    current_user: CurrentUser,
) -> PaginatedResponse[MemoResponse]:
    """List internal memos for a genba (Staff & Workers only)."""
    # Enforce Partner security at endpoint level
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    memos, total = await ManualService.list_memos_paginated(
        db, id, page=pagination.page, limit=pagination.limit, user_id=current_user["id"]
    )
    validated_memos = [MemoResponse.model_validate(m) for m in memos]
    return build_paginated_response(validated_memos, total, pagination)


@router.post(
    "/{id}/memos",
    response_model=DataEnvelope[MemoResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_memo(
    db: DbSession,
    id: uuid.UUID,
    data: MemoCreate,
    current_user: CurrentUser,
) -> DataEnvelope[MemoResponse]:
    """Create a new internal memo for a genba."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    memo = await ManualService.create_memo(
        db=db,
        genba_id=id,
        creator_id=uuid.UUID(current_user["id"]),
        data=data,
        user_id=current_user["id"],
    )
    return DataEnvelope(data=MemoResponse.model_validate(memo))


@router.put(
    "/{id}/memos/{mid}",
    response_model=DataEnvelope[MemoResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_memo(
    db: DbSession,
    id: uuid.UUID,
    mid: uuid.UUID,
    data: MemoUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[MemoResponse]:
    """Update an existing memo."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    memo = await ManualService.update_memo(db, mid, data, current_user["id"])
    return DataEnvelope(data=MemoResponse.model_validate(memo))


@router.delete(
    "/{id}/memos/{mid}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_memo(
    db: DbSession,
    id: uuid.UUID,
    mid: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete a memo."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    await ManualService.delete_memo(db, mid, current_user["id"])
    return DataEnvelope(data={"message": "メモを削除しました"})


# =============================================================================
# Memo Attachments
# =============================================================================
@router.post(
    "/{id}/memos/{mid}/attachments",
    response_model=DataEnvelope[MemoAttachmentResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def add_memo_attachment(
    db: DbSession,
    id: uuid.UUID,
    mid: uuid.UUID,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> DataEnvelope[MemoAttachmentResponse]:
    """Add a file attachment to a memo (Staff & Workers only)."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    attachment = await ManualService.add_attachment(db, mid, file, current_user["id"])
    return DataEnvelope(data=MemoAttachmentResponse.model_validate(attachment))


@router.delete(
    "/{id}/memos/{mid}/attachments/{aid}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_memo_attachment(
    db: DbSession,
    id: uuid.UUID,
    mid: uuid.UUID,
    aid: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete a file attachment from a memo."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    await ManualService.delete_attachment(db, aid, current_user["id"])
    return DataEnvelope(data={"message": "添付ファイルを削除しました"})


# =============================================================================
# Cleaning Area Master CRUD (Global for all genba)
# =============================================================================
@router.get(
    "/areas",
    response_model=DataEnvelope[list[CleaningAreaResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_cleaning_areas(
    db: DbSession,
    current_user: CurrentUser,
) -> DataEnvelope[list[CleaningAreaResponse]]:
    """Retrieve all active cleaning area master entries."""
    areas = await CleaningAreaService.get_all(db)
    return DataEnvelope(data=[CleaningAreaResponse.model_validate(a) for a in areas])


@router.post(
    "/areas",
    status_code=status.HTTP_201_CREATED,
    response_model=DataEnvelope[CleaningAreaResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_cleaning_area(
    db: DbSession,
    body: CleaningAreaCreate,
    current_user: CurrentUser,
) -> DataEnvelope[CleaningAreaResponse]:
    """Create a new cleaning area master entry."""
    area = await CleaningAreaService.create(db, body, current_user["id"])
    return DataEnvelope(data=CleaningAreaResponse.model_validate(area))


@router.put(
    "/areas/{area_id}",
    response_model=DataEnvelope[CleaningAreaResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_cleaning_area(
    db: DbSession,
    area_id: uuid.UUID,
    body: CleaningAreaUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[CleaningAreaResponse]:
    """Update an existing cleaning area master entry."""
    area = await CleaningAreaService.update(db, area_id, body, current_user["id"])
    return DataEnvelope(data=CleaningAreaResponse.model_validate(area))


@router.delete(
    "/areas/{area_id}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_cleaning_area(
    db: DbSession,
    area_id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Soft-delete a cleaning area master entry."""
    await CleaningAreaService.delete(db, area_id, current_user["id"])
    return DataEnvelope(data={"message": "エリアを削除しました"})
