"""
Genba Management System — Staff Module: Router.

REST API routes for staff management and genba assignments.
"""

import uuid
from typing import Annotated, Generic, TypeVar
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.core.dependencies import DbSession, CurrentUser, require_permission
from app.core.pagination import PaginationParams, PaginatedResponse, build_paginated_response
from app.core.permissions import Permission
from app.modules.staff.service import StaffService
from app.modules.staff.schemas import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    GenbaStaffAssignmentCreate,
    GenbaStaffAssignmentResponse,
)

T = TypeVar("T")

class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""
    data: T


router = APIRouter()


# =============================================================================
# Staff Endpoints
# =============================================================================

@router.get(
    "",
    response_model=PaginatedResponse[StaffResponse],
    dependencies=[Depends(require_permission(Permission.STAFF_READ))],
)
async def list_staff(
    db: DbSession,
    pagination: Annotated[PaginationParams, Depends()],
    search: str | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[StaffResponse]:
    """List all staff with filters and pagination."""
    items, total = await StaffService.list_staff(
        db,
        skip=pagination.offset,
        limit=pagination.limit,
        is_active=is_active,
        search_query=search,
    )
    return build_paginated_response(
        [StaffResponse.model_validate(item) for item in items],
        total,
        pagination
    )


@router.post(
    "",
    response_model=DataEnvelope[StaffResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.STAFF_WRITE))],
)
async def create_staff(
    db: DbSession,
    data: StaffCreate,
    current_user: CurrentUser,
) -> DataEnvelope[StaffResponse]:
    """Create a new staff member."""
    staff = await StaffService.create_staff(db, data, current_user["id"])
    return DataEnvelope(data=StaffResponse.model_validate(staff))


@router.get(
    "/{id}",
    response_model=DataEnvelope[StaffResponse],
    dependencies=[Depends(require_permission(Permission.STAFF_READ))],
)
async def get_staff(
    db: DbSession,
    id: uuid.UUID,
) -> DataEnvelope[StaffResponse]:
    """Retrieve details of a staff member."""
    staff = await StaffService.get_staff(db, id)
    return DataEnvelope(data=StaffResponse.model_validate(staff))


@router.put(
    "/{id}",
    response_model=DataEnvelope[StaffResponse],
    dependencies=[Depends(require_permission(Permission.STAFF_WRITE))],
)
async def update_staff(
    db: DbSession,
    id: uuid.UUID,
    data: StaffUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[StaffResponse]:
    """Update details of a staff member."""
    staff = await StaffService.update_staff(db, id, data, current_user["id"])
    return DataEnvelope(data=StaffResponse.model_validate(staff))


# =============================================================================
# Genba Assignment Endpoints
# =============================================================================

@router.get(
    "/genba/{genba_id}",
    response_model=DataEnvelope[list[GenbaStaffAssignmentResponse]],
    dependencies=[Depends(require_permission(Permission.GENBA_READ))],
)
async def list_genba_assignments(
    db: DbSession,
    genba_id: uuid.UUID,
) -> DataEnvelope[list[GenbaStaffAssignmentResponse]]:
    """List all staff assignments for a specific Genba worksite."""
    assignments = await StaffService.list_genba_assignments(db, genba_id)
    return DataEnvelope(
        data=[GenbaStaffAssignmentResponse.model_validate(a) for a in assignments]
    )


@router.post(
    "/genba/{genba_id}",
    response_model=DataEnvelope[GenbaStaffAssignmentResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.GENBA_WRITE))],
)
async def assign_staff_to_genba(
    db: DbSession,
    genba_id: uuid.UUID,
    data: GenbaStaffAssignmentCreate,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaStaffAssignmentResponse]:
    """Assign a staff member to a Genba worksite."""
    assignment = await StaffService.assign_staff_to_genba(
        db,
        genba_id=genba_id,
        staff_id=data.staff_id,
        role_type=data.role_type,
        current_user_id=current_user["id"],
    )
    return DataEnvelope(data=GenbaStaffAssignmentResponse.model_validate(assignment))


@router.delete(
    "/genba/{genba_id}/{staff_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(Permission.GENBA_WRITE))],
)
async def unassign_staff_from_genba(
    db: DbSession,
    genba_id: uuid.UUID,
    staff_id: uuid.UUID,
    current_user: CurrentUser,
) -> None:
    """Remove a staff assignment from a Genba worksite."""
    await StaffService.unassign_staff_from_genba(
        db,
        genba_id=genba_id,
        staff_id=staff_id,
        current_user_id=current_user["id"],
    )
