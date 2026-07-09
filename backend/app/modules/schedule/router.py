"""
Genba Management System — Schedule Module: Router.

REST API routes for work schedules, custom holidays, equipment, standards, and periodic plans.
"""

import uuid
from typing import Annotated, Generic, TypeVar
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import DbSession, CurrentUser, require_permission
from app.core.permissions import Permission, Role
from app.core.exceptions import ForbiddenError
from app.modules.schedule.service import ScheduleService
from app.modules.schedule.schemas import (
    WorkScheduleResponse,
    WorkScheduleCreate,
    WorkScheduleUpdate,
    GenbaCustomHolidayResponse,
    GenbaCustomHolidayCreate,
    GenbaCustomHolidayUpdate,
    GenbaEquipmentResponse,
    GenbaEquipmentCreate,
    GenbaEquipmentUpdate,
    CleaningWorkStandardResponse,
    CleaningWorkStandardCreate,
    CleaningWorkStandardUpdate,
    PeriodicCleaningPlanResponse,
    PeriodicCleaningPlanCreate,
    PeriodicCleaningPlanUpdate,
    PeriodicCleaningDetailResponse,
    PeriodicCleaningDetailCreate,
    PeriodicCleaningDetailUpdate,
)

T = TypeVar("T")


class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper."""

    data: T


router = APIRouter()


# =============================================================================
# Work Schedules
# =============================================================================
@router.get(
    "/{id}/work-schedules",
    response_model=DataEnvelope[list[WorkScheduleResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_work_schedules(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[list[WorkScheduleResponse]]:
    """List work schedules for a genba (Staff & Workers only)."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    schedules = await ScheduleService.list_work_schedules(db, id, current_user["id"])
    validated = [WorkScheduleResponse.model_validate(s) for s in schedules]
    return DataEnvelope(data=validated)


@router.post(
    "/{id}/work-schedules",
    response_model=DataEnvelope[WorkScheduleResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_work_schedule(
    db: DbSession,
    id: uuid.UUID,
    data: WorkScheduleCreate,
    current_user: CurrentUser,
) -> DataEnvelope[WorkScheduleResponse]:
    """Create a new work schedule (Staff & Admin only)."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    schedule = await ScheduleService.create_work_schedule(db, id, data, current_user["id"])
    return DataEnvelope(data=WorkScheduleResponse.model_validate(schedule))


@router.put(
    "/{id}/work-schedules/{sid}",
    response_model=DataEnvelope[WorkScheduleResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_work_schedule(
    db: DbSession,
    id: uuid.UUID,
    sid: uuid.UUID,
    data: WorkScheduleUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[WorkScheduleResponse]:
    """Update a work schedule."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    schedule = await ScheduleService.update_work_schedule(db, sid, data, current_user["id"])
    return DataEnvelope(data=WorkScheduleResponse.model_validate(schedule))


@router.delete(
    "/{id}/work-schedules/{sid}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_work_schedule(
    db: DbSession,
    id: uuid.UUID,
    sid: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete a work schedule."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    await ScheduleService.delete_work_schedule(db, sid, current_user["id"])
    return DataEnvelope(data={"message": "勤務スケジュールを削除しました"})


# =============================================================================
# Genba Custom Holidays
# =============================================================================
@router.get(
    "/{id}/custom-holidays",
    response_model=DataEnvelope[list[GenbaCustomHolidayResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_custom_holidays(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[list[GenbaCustomHolidayResponse]]:
    """List custom holidays for a genba (Staff & Workers only)."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    holidays = await ScheduleService.list_custom_holidays(db, id, current_user["id"])
    validated = [GenbaCustomHolidayResponse.model_validate(h) for h in holidays]
    return DataEnvelope(data=validated)


@router.post(
    "/{id}/custom-holidays",
    response_model=DataEnvelope[GenbaCustomHolidayResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_custom_holiday(
    db: DbSession,
    id: uuid.UUID,
    data: GenbaCustomHolidayCreate,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaCustomHolidayResponse]:
    """Create a new custom holiday (Staff & Admin only)."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    holiday = await ScheduleService.create_custom_holiday(db, id, data, current_user["id"])
    return DataEnvelope(data=GenbaCustomHolidayResponse.model_validate(holiday))


@router.put(
    "/{id}/custom-holidays/{hid}",
    response_model=DataEnvelope[GenbaCustomHolidayResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_custom_holiday(
    db: DbSession,
    id: uuid.UUID,
    hid: uuid.UUID,
    data: GenbaCustomHolidayUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaCustomHolidayResponse]:
    """Update a custom holiday."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    holiday = await ScheduleService.update_custom_holiday(db, hid, data, current_user["id"])
    return DataEnvelope(data=GenbaCustomHolidayResponse.model_validate(holiday))


@router.delete(
    "/{id}/custom-holidays/{hid}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_custom_holiday(
    db: DbSession,
    id: uuid.UUID,
    hid: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete a custom holiday."""
    if current_user["role"] == Role.PARTNER:
        raise ForbiddenError()

    await ScheduleService.delete_custom_holiday(db, hid, current_user["id"])
    return DataEnvelope(data={"message": "現場休日を削除しました"})


# =============================================================================
# Genba Equipment
# =============================================================================
@router.get(
    "/{id}/equipment",
    response_model=DataEnvelope[list[GenbaEquipmentResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_equipment(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[list[GenbaEquipmentResponse]]:
    """List equipment entries for a genba."""
    equipment = await ScheduleService.list_equipment(db, id, current_user["id"])
    validated = [GenbaEquipmentResponse.model_validate(e) for e in equipment]
    return DataEnvelope(data=validated)


@router.post(
    "/{id}/equipment",
    response_model=DataEnvelope[GenbaEquipmentResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_equipment(
    db: DbSession,
    id: uuid.UUID,
    data: GenbaEquipmentCreate,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaEquipmentResponse]:
    """Create a new equipment entry (Staff & Admin only)."""
    equipment = await ScheduleService.create_equipment(db, id, data, current_user["id"])
    return DataEnvelope(data=GenbaEquipmentResponse.model_validate(equipment))


@router.put(
    "/{id}/equipment/{eid}",
    response_model=DataEnvelope[GenbaEquipmentResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_equipment(
    db: DbSession,
    id: uuid.UUID,
    eid: uuid.UUID,
    data: GenbaEquipmentUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaEquipmentResponse]:
    """Update equipment details."""
    equipment = await ScheduleService.update_equipment(db, eid, data, current_user["id"])
    return DataEnvelope(data=GenbaEquipmentResponse.model_validate(equipment))


@router.delete(
    "/{id}/equipment/{eid}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_equipment(
    db: DbSession,
    id: uuid.UUID,
    eid: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete equipment entry."""
    await ScheduleService.delete_equipment(db, eid, current_user["id"])
    return DataEnvelope(data={"message": "清掃用具を削除しました"})


# =============================================================================
# Cleaning Work Standards
# =============================================================================
@router.get(
    "/{id}/cleaning-standards",
    response_model=DataEnvelope[list[CleaningWorkStandardResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_work_standards(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[list[CleaningWorkStandardResponse]]:
    """List work standards for a genba."""
    standards = await ScheduleService.list_work_standards(db, id, current_user["id"])
    validated = [CleaningWorkStandardResponse.model_validate(s) for s in standards]
    return DataEnvelope(data=validated)


@router.post(
    "/{id}/cleaning-standards",
    response_model=DataEnvelope[CleaningWorkStandardResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_work_standard(
    db: DbSession,
    id: uuid.UUID,
    data: CleaningWorkStandardCreate,
    current_user: CurrentUser,
) -> DataEnvelope[CleaningWorkStandardResponse]:
    """Create a new work standard (Staff & Admin only)."""
    standard = await ScheduleService.create_work_standard(db, id, data, current_user["id"])
    return DataEnvelope(data=CleaningWorkStandardResponse.model_validate(standard))


@router.put(
    "/{id}/cleaning-standards/{std_id}",
    response_model=DataEnvelope[CleaningWorkStandardResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_work_standard(
    db: DbSession,
    id: uuid.UUID,
    std_id: uuid.UUID,
    data: CleaningWorkStandardUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[CleaningWorkStandardResponse]:
    """Update work standard details."""
    standard = await ScheduleService.update_work_standard(db, std_id, data, current_user["id"])
    return DataEnvelope(data=CleaningWorkStandardResponse.model_validate(standard))


@router.delete(
    "/{id}/cleaning-standards/{std_id}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_work_standard(
    db: DbSession,
    id: uuid.UUID,
    std_id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete a work standard."""
    await ScheduleService.delete_work_standard(db, std_id, current_user["id"])
    return DataEnvelope(data={"message": "清掃作業基準を削除しました"})


# =============================================================================
# Periodic Cleaning Plans & Details
# =============================================================================
@router.get(
    "/{id}/periodic-plans",
    response_model=DataEnvelope[list[PeriodicCleaningPlanResponse]],
    dependencies=[Depends(require_permission(Permission.MANUAL_READ))],
)
async def list_periodic_plans(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[list[PeriodicCleaningPlanResponse]]:
    """List periodic plans for a genba."""
    plans = await ScheduleService.list_periodic_plans(db, id, current_user["id"])
    validated = [PeriodicCleaningPlanResponse.model_validate(p) for p in plans]
    return DataEnvelope(data=validated)


@router.post(
    "/{id}/periodic-plans",
    response_model=DataEnvelope[PeriodicCleaningPlanResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_periodic_plan(
    db: DbSession,
    id: uuid.UUID,
    data: PeriodicCleaningPlanCreate,
    current_user: CurrentUser,
) -> DataEnvelope[PeriodicCleaningPlanResponse]:
    """Create a new periodic plan (Staff & Admin only)."""
    plan = await ScheduleService.create_periodic_plan(db, id, data, current_user["id"])
    return DataEnvelope(data=PeriodicCleaningPlanResponse.model_validate(plan))


@router.put(
    "/{id}/periodic-plans/{pid}",
    response_model=DataEnvelope[PeriodicCleaningPlanResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_periodic_plan(
    db: DbSession,
    id: uuid.UUID,
    pid: uuid.UUID,
    data: PeriodicCleaningPlanUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[PeriodicCleaningPlanResponse]:
    """Update a periodic plan."""
    plan = await ScheduleService.update_periodic_plan(db, pid, data, current_user["id"])
    return DataEnvelope(data=PeriodicCleaningPlanResponse.model_validate(plan))


@router.delete(
    "/{id}/periodic-plans/{pid}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_periodic_plan(
    db: DbSession,
    id: uuid.UUID,
    pid: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete a periodic plan."""
    await ScheduleService.delete_periodic_plan(db, pid, current_user["id"])
    return DataEnvelope(data={"message": "定期清掃計画を削除しました"})


@router.post(
    "/{id}/periodic-plans/{pid}/details",
    response_model=DataEnvelope[PeriodicCleaningDetailResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def create_periodic_detail(
    db: DbSession,
    id: uuid.UUID,
    pid: uuid.UUID,
    data: PeriodicCleaningDetailCreate,
    current_user: CurrentUser,
) -> DataEnvelope[PeriodicCleaningDetailResponse]:
    """Create a new periodic plan detail (Staff & Admin only)."""
    detail = await ScheduleService.create_periodic_detail(db, pid, data, current_user["id"])
    return DataEnvelope(data=PeriodicCleaningDetailResponse.model_validate(detail))


@router.put(
    "/{id}/periodic-plans/{pid}/details/{did}",
    response_model=DataEnvelope[PeriodicCleaningDetailResponse],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def update_periodic_detail(
    db: DbSession,
    id: uuid.UUID,
    pid: uuid.UUID,
    did: uuid.UUID,
    data: PeriodicCleaningDetailUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[PeriodicCleaningDetailResponse]:
    """Update periodic plan detail."""
    detail = await ScheduleService.update_periodic_detail(db, did, data, current_user["id"])
    return DataEnvelope(data=PeriodicCleaningDetailResponse.model_validate(detail))


@router.delete(
    "/{id}/periodic-plans/{pid}/details/{did}",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.MANUAL_WRITE))],
)
async def delete_periodic_detail(
    db: DbSession,
    id: uuid.UUID,
    pid: uuid.UUID,
    did: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[dict]:
    """Delete periodic plan detail."""
    await ScheduleService.delete_periodic_detail(db, did, current_user["id"])
    return DataEnvelope(data={"message": "定期清掃詳細を削除しました"})
