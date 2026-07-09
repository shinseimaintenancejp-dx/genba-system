"""
Genba Management System — Worker Module: Router.

REST API routes for worker management and genba assignments.
"""

import uuid
from typing import Annotated, Generic, TypeVar
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.core.dependencies import DbSession, CurrentUser, require_permission
from app.core.pagination import PaginationParams, PaginatedResponse, build_paginated_response
from app.core.permissions import Permission
from app.modules.worker.service import WorkerService
from app.modules.worker.schemas import (
    WorkerCreate,
    WorkerUpdate,
    WorkerResponse,
    GenbaWorkerCreate,
    GenbaWorkerResponse,
)

T = TypeVar("T")

class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""
    data: T


router = APIRouter()


# =============================================================================
# Worker Endpoints
# =============================================================================

@router.get(
    "",
    response_model=PaginatedResponse[WorkerResponse],
    dependencies=[Depends(require_permission(Permission.WORKER_READ))],
)
async def list_workers(
    db: DbSession,
    pagination: Annotated[PaginationParams, Depends()],
    search: str | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[WorkerResponse]:
    """List all workers with filters and pagination."""
    items, total = await WorkerService.list_workers(
        db,
        skip=pagination.offset,
        limit=pagination.limit,
        is_active=is_active,
        search_query=search,
    )
    return build_paginated_response(
        [WorkerResponse.model_validate(item) for item in items],
        total,
        pagination
    )


@router.post(
    "",
    response_model=DataEnvelope[WorkerResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.WORKER_WRITE))],
)
async def create_worker(
    db: DbSession,
    data: WorkerCreate,
    current_user: CurrentUser,
) -> DataEnvelope[WorkerResponse]:
    """Create a new worker."""
    worker = await WorkerService.create_worker(db, data, current_user["id"])
    return DataEnvelope(data=WorkerResponse.model_validate(worker))


@router.get(
    "/{id}",
    response_model=DataEnvelope[WorkerResponse],
    dependencies=[Depends(require_permission(Permission.WORKER_READ))],
)
async def get_worker(
    db: DbSession,
    id: uuid.UUID,
) -> DataEnvelope[WorkerResponse]:
    """Retrieve details of a worker."""
    worker = await WorkerService.get_worker(db, id)
    return DataEnvelope(data=WorkerResponse.model_validate(worker))


@router.put(
    "/{id}",
    response_model=DataEnvelope[WorkerResponse],
    dependencies=[Depends(require_permission(Permission.WORKER_WRITE))],
)
async def update_worker(
    db: DbSession,
    id: uuid.UUID,
    data: WorkerUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[WorkerResponse]:
    """Update details of a worker."""
    worker = await WorkerService.update_worker(db, id, data, current_user["id"])
    return DataEnvelope(data=WorkerResponse.model_validate(worker))


# =============================================================================
# Genba Worker Assignment Endpoints
# =============================================================================

@router.get(
    "/genba/{genba_id}",
    response_model=DataEnvelope[list[GenbaWorkerResponse]],
    dependencies=[Depends(require_permission(Permission.GENBA_READ))],
)
async def list_genba_workers(
    db: DbSession,
    genba_id: uuid.UUID,
    only_active: bool = True,
) -> DataEnvelope[list[GenbaWorkerResponse]]:
    """List all worker assignments for a specific Genba worksite."""
    assignments = await WorkerService.list_genba_workers(db, genba_id, only_active=only_active)
    return DataEnvelope(
        data=[GenbaWorkerResponse.model_validate(w) for w in assignments]
    )


@router.post(
    "/genba/{genba_id}",
    response_model=DataEnvelope[GenbaWorkerResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.GENBA_WRITE))],
)
async def assign_worker_to_genba(
    db: DbSession,
    genba_id: uuid.UUID,
    data: GenbaWorkerCreate,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaWorkerResponse]:
    """Assign a worker to a Genba worksite."""
    assignment = await WorkerService.assign_worker_to_genba(
        db,
        genba_id=genba_id,
        worker_id=data.worker_id,
        current_user_id=current_user["id"],
    )
    return DataEnvelope(data=GenbaWorkerResponse.model_validate(assignment))


@router.delete(
    "/genba/{genba_id}/{worker_id}",
    response_model=DataEnvelope[GenbaWorkerResponse],
    dependencies=[Depends(require_permission(Permission.GENBA_WRITE))],
)
async def unassign_worker_from_genba(
    db: DbSession,
    genba_id: uuid.UUID,
    worker_id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaWorkerResponse]:
    """Remove (deactivate) a worker assignment from a Genba worksite."""
    assignment = await WorkerService.unassign_worker_from_genba(
        db,
        genba_id=genba_id,
        worker_id=worker_id,
        current_user_id=current_user["id"],
    )
    return DataEnvelope(data=GenbaWorkerResponse.model_validate(assignment))
