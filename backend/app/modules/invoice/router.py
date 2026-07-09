"""
Genba Management System — Invoice Router.

REST API routes for invoice management.
Permissions: INVOICE_READ, INVOICE_WRITE, APPROVAL_SUBMIT (SEC§2.2).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUser, DbSession, require_permission
from app.core.permissions import Permission
from app.modules.invoice.schemas import InvoiceCreate, InvoiceResponse
from app.modules.invoice.service import invoice_service

router = APIRouter()


@router.post(
    "",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新規請求書を作成",
    dependencies=[Depends(require_permission(Permission.INVOICE_WRITE))],
)
async def create_invoice(
    data: InvoiceCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Create a new manual invoice."""
    return await invoice_service.create_invoice(db, data, current_user)


@router.get(
    "/contract/{contract_id}",
    response_model=list[InvoiceResponse],
    summary="契約の請求書一覧を取得",
    dependencies=[Depends(require_permission(Permission.INVOICE_READ))],
)
async def list_invoices_by_contract(
    contract_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """List all invoices associated with a specific contract."""
    return await invoice_service.list_by_contract(db, contract_id, current_user)


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    summary="請求書の詳細を取得",
    dependencies=[Depends(require_permission(Permission.INVOICE_READ))],
)
async def get_invoice(
    invoice_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get detailed information about a specific invoice."""
    return await invoice_service.get_invoice(db, invoice_id, current_user)


@router.post(
    "/{invoice_id}/approve",
    response_model=InvoiceResponse,
    summary="請求書を承認申請",
    dependencies=[Depends(require_permission(Permission.APPROVAL_SUBMIT))],
)
async def request_approval(
    invoice_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Submit an invoice for manager approval.
    Changes status to PENDING_APPROVAL.
    Only INTERNAL_STAFF and SENIOR_STAFF can submit (APPROVAL_SUBMIT permission).
    """
    return await invoice_service.request_approval(db, invoice_id, current_user)
