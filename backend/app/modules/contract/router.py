"""
Genba Management System — Contract Module: Router.

REST API routes for contract management.
"""

import os
import uuid
from typing import Annotated, Generic, TypeVar

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, DbSession, require_permission
from app.core.pagination import PaginatedResponse, PaginationParams, build_paginated_response
from app.core.permissions import Permission
from app.modules.contract.schemas import (
    ContractCreate,
    ContractResponse,
    ContractUpdate,
)
from app.modules.contract.service import contract_service

T = TypeVar("T")


class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""

    data: T


router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[ContractResponse],
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def list_contracts(
    db: DbSession,
    pagination: Annotated[PaginationParams, Depends()],
    status: str | None = None,
    contract_type: str | None = None,
    genba_id: uuid.UUID | None = None,
    customer_id: uuid.UUID | None = None,
    customer_ids: list[uuid.UUID] | None = Query(default=None),
    partner_id: uuid.UUID | None = None,
    service_category: str | None = None,
    search: str | None = None,
    staff_id: str | None = Query(default=None),
    periodic_month: int | None = Query(default=None),
) -> PaginatedResponse[ContractResponse]:
    """List all contracts with filters and pagination."""
    items, total = await contract_service.list_contracts(
        db,
        skip=pagination.offset,
        limit=pagination.limit,
        status=status,
        contract_type=contract_type,
        genba_id=genba_id,
        customer_id=customer_id,
        customer_ids=customer_ids,
        partner_id=partner_id,
        service_category=service_category,
        search_query=search,
        staff_id=staff_id,
        periodic_month=periodic_month,
    )
    response_items = [ContractResponse.model_validate(item) for item in items]
    return build_paginated_response(response_items, total, pagination)


@router.post(
    "",
    response_model=DataEnvelope[ContractResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def create_contract(
    db: DbSession,
    data: ContractCreate,
    current_user: CurrentUser,
) -> DataEnvelope[ContractResponse]:
    """Create a new contract."""
    contract = await contract_service.create_contract(db, data, current_user["id"])
    return DataEnvelope(data=ContractResponse.model_validate(contract))


@router.get(
    "/{id}",
    response_model=DataEnvelope[ContractResponse],
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def get_contract(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> DataEnvelope[ContractResponse]:
    """Retrieve detailed contract information."""
    contract = await contract_service.get_contract(db, id, current_user["id"])
    return DataEnvelope(data=ContractResponse.model_validate(contract))


@router.put(
    "/{id}",
    response_model=DataEnvelope[ContractResponse],
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def update_contract(
    db: DbSession,
    id: uuid.UUID,
    data: ContractUpdate,
    current_user: CurrentUser,
) -> DataEnvelope[ContractResponse]:
    """Update an existing contract."""
    contract = await contract_service.update_contract(db, id, data, current_user["id"])
    return DataEnvelope(data=ContractResponse.model_validate(contract))


@router.post(
    "/{id}/upload-pdf",
    response_model=DataEnvelope[dict],
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def upload_contract_pdf(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> DataEnvelope[dict]:
    """Upload a PDF document for the contract (Placeholder for Sprint 8 S3)."""
    # Verify contract exists
    contract = await contract_service.get_contract(db, id, current_user["id"])

    # Placeholder: save file locally
    temp_dir = "/tmp/genba_contracts"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f"{id}_{file.filename}")

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # Update model
    contract_pdf_url = f"local://{file_path}"
    contract.contract_pdf_url = contract_pdf_url
    await db.flush()

    return DataEnvelope(data={"url": contract_pdf_url, "message": "File uploaded successfully"})


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def delete_contract(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> None:
    """Delete an existing contract."""
    await contract_service.delete_contract(db, id, current_user["id"])
