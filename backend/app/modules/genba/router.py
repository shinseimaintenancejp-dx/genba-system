"""
Genba Management System — Genba Module: Router.

REST API routes for Genba worksites.
"""

import uuid
from typing import Annotated, Generic, TypeVar, Union, cast

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, DbSession, require_permission
from app.core.pagination import PaginatedResponse, PaginationParams, build_paginated_response
from app.core.permissions import Permission
from app.modules.genba.schemas import (
    DuplicateWarningResponse,
    GenbaCreate,
    GenbaDetailResponse,
    GenbaResponse,
    GenbaUpdate,
)
from app.modules.genba.service import GenbaService

T = TypeVar("T")

class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""
    data: T


router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[GenbaResponse],
    dependencies=[Depends(require_permission(Permission.GENBA_READ))],
)
async def list_genbas(
    db: DbSession,
    pagination: Annotated[PaginationParams, Depends()],
    status: str | None = None,
    customer_ids: list[uuid.UUID] | None = Query(None),
    staff_id: str | None = Query(None),
    search: str | None = None,
    has_periodic: bool | None = Query(None, description="Lọc genba có hợp đồng định kỳ"),
    periodic_month: int | None = Query(None, ge=1, le=12, description="Lọc theo tháng hợp đồng định kỳ"),
) -> PaginatedResponse[GenbaResponse]:
    """
    List all Genba worksites with filters and pagination.
    
    Data scope is automatically restricted by PostgreSQL Row-Level Security (RLS)
    based on the logged-in user's role and associated entity ID.
    """
    items, total = await GenbaService.list_genbas(
        db,
        skip=pagination.offset,
        limit=pagination.limit,
        status=status,
        customer_ids=customer_ids,
        staff_id=staff_id,
        search_query=search,
        has_periodic=has_periodic,
        periodic_month=periodic_month,
    )
    return cast(PaginatedResponse[GenbaResponse], build_paginated_response(list(items), total, pagination))


@router.post(
    "",
    response_model=Union[DataEnvelope[GenbaResponse], DuplicateWarningResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.GENBA_WRITE))],
)
async def create_genba(
    db: DbSession,
    data: GenbaCreate,
    current_user: CurrentUser,
    response: Response,
) -> DataEnvelope[GenbaResponse] | DuplicateWarningResponse:
    """
    Create a new Genba worksite.
    
    Checks for similar property names. If potential duplicates are found,
    returns HTTP 200 with the list of matching worksites.
    """
    created_genba, similar_list = await GenbaService.create_genba(
        db, data, current_user["id"]
    )
    if similar_list:
        response.status_code = status.HTTP_200_OK
        return DuplicateWarningResponse(
            warning="類似名の現場が存在します",
            duplicates=[GenbaResponse.model_validate(g) for g in similar_list],
        )

    return DataEnvelope(data=GenbaResponse.model_validate(created_genba))


@router.get(
    "/{id}",
    response_model=DataEnvelope[GenbaDetailResponse],
    dependencies=[Depends(require_permission(Permission.GENBA_READ))],
)
async def get_genba(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaDetailResponse]:
    """Retrieve detailed Genba details including customer information."""
    genba = await GenbaService.get_genba(db, id, current_user["id"])
    return DataEnvelope(data=GenbaDetailResponse.model_validate(genba))


@router.put(
    "/{id}",
    response_model=DataEnvelope[GenbaResponse],
    dependencies=[Depends(require_permission(Permission.GENBA_WRITE))],
)
async def update_genba(
    db: DbSession,
    id: uuid.UUID,
    data: GenbaUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaResponse]:
    """Update Genba details."""
    genba = await GenbaService.update_genba(db, id, data, current_user["id"])
    return DataEnvelope(data=GenbaResponse.model_validate(genba))


@router.patch(
    "/{id}/terminate",
    response_model=DataEnvelope[GenbaResponse],
    dependencies=[Depends(require_permission(Permission.GENBA_WRITE))],
)
async def terminate_genba(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[GenbaResponse]:
    """Terminate a Genba worksite (set status to TERMINATED)."""
    genba = await GenbaService.terminate_genba(db, id, current_user["id"])
    return DataEnvelope(data=GenbaResponse.model_validate(genba))
