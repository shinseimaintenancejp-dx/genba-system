"""
Genba Management System — Partner Module: Router.

REST API routes for partner companies (協力会社).
"""

import uuid
from typing import Annotated, Generic, TypeVar
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.core.dependencies import DbSession, CurrentUser, require_permission
from app.core.pagination import PaginationParams, PaginatedResponse, build_paginated_response
from app.core.permissions import Permission
from app.modules.partner.service import PartnerService
from app.modules.partner.schemas import (
    PartnerCompanyCreate,
    PartnerCompanyUpdate,
    PartnerCompanyResponse,
    ReorderRequest,
)

T = TypeVar("T")

class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""
    data: T


router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[PartnerCompanyResponse],
    dependencies=[Depends(require_permission(Permission.PARTNER_READ))],
)
async def list_partners(
    db: DbSession,
    pagination: Annotated[PaginationParams, Depends()],
    search: str | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[PartnerCompanyResponse]:
    """List all partner companies with filters and pagination."""
    items, total = await PartnerService.list_partners(
        db,
        skip=pagination.offset,
        limit=pagination.limit,
        is_active=is_active,
        search_query=search,
    )
    return build_paginated_response(list(items), total, pagination)


@router.put(
    "/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(Permission.PARTNER_WRITE))],
)
async def reorder_partners(
    db: DbSession,
    user: CurrentUser,
    data: ReorderRequest,
) -> None:
    """Bulk update display orders."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Reordering partners: {len(data.items)} items received")
    
    await PartnerService.reorder_partners(db, data, user["id"])
    await db.commit()
    logger.info("Reorder committed successfully")


@router.post(
    "",
    response_model=DataEnvelope[PartnerCompanyResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.PARTNER_WRITE))],
)
async def create_partner(
    db: DbSession,
    data: PartnerCompanyCreate,
    current_user: CurrentUser,
) -> DataEnvelope[PartnerCompanyResponse]:
    """Create a new partner company."""
    partner = await PartnerService.create_partner(db, data, current_user["id"])
    return DataEnvelope(data=PartnerCompanyResponse.model_validate(partner))


@router.get(
    "/{id}",
    response_model=DataEnvelope[PartnerCompanyResponse],
    dependencies=[Depends(require_permission(Permission.PARTNER_READ))],
)
async def get_partner(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[PartnerCompanyResponse]:
    """Retrieve detailed partner information."""
    partner = await PartnerService.get_partner(db, id, current_user["id"])
    return DataEnvelope(data=PartnerCompanyResponse.model_validate(partner))


@router.put(
    "/{id}",
    response_model=DataEnvelope[PartnerCompanyResponse],
    dependencies=[Depends(require_permission(Permission.PARTNER_WRITE))],
)
async def update_partner(
    db: DbSession,
    id: uuid.UUID,
    data: PartnerCompanyUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[PartnerCompanyResponse]:
    """Update an existing partner company."""
    partner = await PartnerService.update_partner(db, id, data, current_user["id"])
    return DataEnvelope(data=PartnerCompanyResponse.model_validate(partner))
