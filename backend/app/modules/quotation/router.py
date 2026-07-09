"""
Genba Management System — Quotation Router.

REST API routes for quotation management.
Permissions: QUOTATION_READ, QUOTATION_WRITE, APPROVAL_SUBMIT (SEC§2.2).
"""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUser, DbSession, require_permission
from app.core.permissions import Permission
from app.modules.quotation.schemas import QuotationCreate, QuotationResponse
from app.modules.quotation.service import quotation_service

router = APIRouter()


@router.post(
    "/{genba_id}/quotations",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="現場の見積を作成",
    dependencies=[Depends(require_permission(Permission.QUOTATION_WRITE))],
)
async def create_quotation(
    genba_id: str,
    data: QuotationCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Create a new quotation with items.
    Initial status will be DRAFT.
    """
    return await quotation_service.create_quotation(db, genba_id, data, current_user)


@router.get(
    "/{genba_id}/quotations",
    response_model=list[QuotationResponse],
    summary="現場の見積一覧を取得",
    dependencies=[Depends(require_permission(Permission.QUOTATION_READ))],
)
async def list_quotations(
    genba_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """List all quotations associated with a specific genba."""
    return await quotation_service.list_by_genba(db, genba_id, current_user)


@router.get(
    "/{genba_id}/quotations/{quotation_id}",
    response_model=QuotationResponse,
    summary="見積の詳細を取得",
    dependencies=[Depends(require_permission(Permission.QUOTATION_READ))],
)
async def get_quotation(
    genba_id: str,
    quotation_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get detailed information about a specific quotation."""
    return await quotation_service.get_quotation(db, quotation_id, current_user)


@router.post(
    "/{genba_id}/quotations/{quotation_id}/approve",
    response_model=QuotationResponse,
    summary="見積を承認申請",
    dependencies=[Depends(require_permission(Permission.APPROVAL_SUBMIT))],
)
async def request_approval(
    genba_id: str,
    quotation_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Submit a quotation for manager approval.
    Changes status from DRAFT to PENDING_APPROVAL.
    Only INTERNAL_STAFF and SENIOR_STAFF can submit (APPROVAL_SUBMIT permission).
    """
    return await quotation_service.request_approval(db, quotation_id, current_user)
