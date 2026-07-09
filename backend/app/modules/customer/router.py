"""
Genba Management System — Customer Module: Router.

REST API routes for customers and contacts management.
"""

import uuid
from typing import Annotated, Generic, TypeVar
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.core.dependencies import DbSession, CurrentUser, require_permission, require_roles
from app.core.pagination import PaginationParams, PaginatedResponse, build_paginated_response
from app.core.permissions import Permission, Role
from app.modules.customer.service import CustomerService
from app.modules.customer.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerDetailResponse,
    CustomerContactCreate,
    CustomerContactUpdate,
    CustomerContactResponse,
)

T = TypeVar("T")

class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""
    data: T


router = APIRouter()


# =============================================================================
# Customer Endpoints
# =============================================================================

@router.get(
    "",
    response_model=PaginatedResponse[CustomerResponse],
    dependencies=[Depends(require_permission(Permission.CUSTOMER_READ))],
)
async def list_customers(
    db: DbSession,
    pagination: Annotated[PaginationParams, Depends()],
    search: str | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[CustomerResponse]:
    """List all customers with filters and pagination."""
    items, total = await CustomerService.list_customers(
        db,
        skip=pagination.offset,
        limit=pagination.limit,
        is_active=is_active,
        search_query=search,
    )
    return build_paginated_response(list(items), total, pagination)


@router.post(
    "",
    response_model=DataEnvelope[CustomerResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.CUSTOMER_WRITE))],
)
async def create_customer(
    db: DbSession,
    data: CustomerCreate,
    current_user: CurrentUser,
) -> DataEnvelope[CustomerResponse]:
    """Create a new customer company."""
    customer = await CustomerService.create_customer(db, data, current_user["id"])
    return DataEnvelope(data=CustomerResponse.model_validate(customer))


@router.get(
    "/{id}",
    response_model=DataEnvelope[CustomerDetailResponse],
    dependencies=[Depends(require_permission(Permission.CUSTOMER_READ))],
)
async def get_customer(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[CustomerDetailResponse]:
    """Retrieve detailed customer information including contacts and genbas."""
    customer = await CustomerService.get_customer(db, id, current_user["id"])
    return DataEnvelope(data=CustomerDetailResponse.model_validate(customer))


@router.put(
    "/{id}",
    response_model=DataEnvelope[CustomerResponse],
    dependencies=[Depends(require_permission(Permission.CUSTOMER_WRITE))],
)
async def update_customer(
    db: DbSession,
    id: uuid.UUID,
    data: CustomerUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[CustomerResponse]:
    """Update an existing customer."""
    customer = await CustomerService.update_customer(db, id, data, current_user["id"])
    return DataEnvelope(data=CustomerResponse.model_validate(customer))


# =============================================================================
# Contact Endpoints
# =============================================================================

@router.get(
    "/{id}/contacts",
    response_model=DataEnvelope[list[CustomerContactResponse]],
    dependencies=[Depends(require_permission(Permission.CUSTOMER_READ))],
)
async def list_contacts(
    db: DbSession,
    id: uuid.UUID,
) -> DataEnvelope[list[CustomerContactResponse]]:
    """Retrieve list of contacts for a customer."""
    contacts = await CustomerService.list_contacts(db, id)
    return DataEnvelope(
        data=[CustomerContactResponse.model_validate(c) for c in contacts]
    )


@router.post(
    "/{id}/contacts",
    response_model=DataEnvelope[CustomerContactResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.CUSTOMER_WRITE))],
)
async def create_contact(
    db: DbSession,
    id: uuid.UUID,
    data: CustomerContactCreate,
    current_user: CurrentUser,
) -> DataEnvelope[CustomerContactResponse]:
    """Create a new contact person for a customer."""
    contact = await CustomerService.create_contact(db, id, data, current_user["id"])
    return DataEnvelope(data=CustomerContactResponse.model_validate(contact))


@router.put(
    "/{id}/contacts/{cid}",
    response_model=DataEnvelope[CustomerContactResponse],
    dependencies=[Depends(require_permission(Permission.CUSTOMER_WRITE))],
)
async def update_contact(
    db: DbSession,
    id: uuid.UUID,
    cid: uuid.UUID,
    data: CustomerContactUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[CustomerContactResponse]:
    """Update contact details."""
    contact = await CustomerService.update_contact(db, id, cid, data, current_user["id"])
    return DataEnvelope(data=CustomerContactResponse.model_validate(contact))


@router.delete(
    "/{id}/contacts/{cid}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
async def delete_contact(
    db: DbSession,
    id: uuid.UUID,
    cid: uuid.UUID,
    current_user: CurrentUser,
) -> None:
    """Delete a customer contact (ADMIN only)."""
    await CustomerService.delete_contact(db, id, cid, current_user["id"])
