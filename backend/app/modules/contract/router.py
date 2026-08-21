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
    CancelWithLinksPayload,
    LinkedOrderingContractResponse,
    ContractCreate,
    ContractResponse,
    ContractUpdate,
    ProfitReportResponse,
    AvailableReceivingContractItem,
    OrderingLinkCreate,
    OrderingLinkResponse,
    OrderingLinkUpdate,
)
from app.modules.contract.service import contract_service
from app.modules.contract.report_repository import ReportRepository

T = TypeVar("T")


class DataEnvelope(BaseModel, Generic[T]):
    """Generic single item wrapper (INT§1.2)."""

    data: T


router = APIRouter()


@router.get(
    "/{id}/linked-ordering-contracts",
    response_model=list[LinkedOrderingContractResponse],
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def get_linked_ordering_contracts(
    id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> list[dict]:
    """Get all ordering contracts linked to a receiving contract."""
    return await contract_service.get_linked_ordering_contracts(db, id)

@router.post(
    "/{id}/cancel-with-links",
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def cancel_contract_with_links(
    id: uuid.UUID,
    payload: CancelWithLinksPayload,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """Cancel a receiving contract and all its linked ordering contracts."""
    return await contract_service.cancel_contract_with_links(db, id, payload.end_date, current_user["id"])

@router.get(
    "/reports/profit",
    response_model=ProfitReportResponse,
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def get_profit_report(
    db: DbSession,
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
) -> ProfitReportResponse:
    """Get profit report by genba for a specific month."""
    items = await ReportRepository.get_monthly_profit_report(db, year, month)
    
    total_revenue = sum(item["revenue"] for item in items)
    total_partner_cost = sum(item["partner_cost"] for item in items)
    total_inhouse_cost = sum(item["inhouse_cost"] for item in items)
    total_profit = total_revenue - total_partner_cost - total_inhouse_cost
    total_profit_margin = (total_profit / total_revenue * 100.0) if total_revenue > 0 else 0.0

    return ProfitReportResponse(
        year=year,
        month=month,
        total_revenue=total_revenue,
        total_partner_cost=total_partner_cost,
        total_inhouse_cost=total_inhouse_cost,
        total_profit=total_profit,
        total_profit_margin=total_profit_margin,
        genbas=items
    )


@router.get(
    "",
    response_model=PaginatedResponse[ContractResponse],
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def list_contracts(
    db: DbSession,
    pagination: Annotated[PaginationParams, Depends()],
    current_user: CurrentUser,
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
        current_user_id=current_user["id"],
        current_user_role=current_user.get("role"),
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
    "/available-receiving",
    response_model=list[AvailableReceivingContractItem],
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def list_available_receiving_contracts_by_genba(
    db: DbSession,
    genba_id: uuid.UUID,
) -> list[AvailableReceivingContractItem]:
    """List RECEIVING contracts for a specific genba, used when creating a new ORDERING contract."""
    return await OrderingLinkRepository.get_available_receiving_contracts_by_genba(db, genba_id)


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


@router.get(
    "/{id}/history",
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def get_contract_history(
    db: DbSession,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> dict:
    """Get structured audit history for a specific contract.

    Returns a diff-based response with Japanese field labels for each change.
    Only includes entries where actual field values changed (no noise logs).
    """
    import json as _json
    from sqlalchemy import text

    # Field label mapping: technical key -> Japanese display name
    FIELD_LABEL_MAP: dict[str, str] = {
        "contract_name": "契約名",
        "status": "ステータス",
        "contract_type": "契約種別",
        "service_category": "サービス区分",
        "internal_code": "管理番号",
        "amount": "金額",
        "tax_type": "消費税",
        "start_date": "開始日",
        "end_date": "終了日",
        "work_type": "作業種別",
        "sub_service_type": "サービス区分（詳細）",
        "work_execution_date": "作業実施日",
        "work_content_summary": "作業内容概要",
        "auto_renew": "自動更新",
        "invoice_required": "請求書発行",
        "work_slots": "作業時間帯",
        "worker_counts": "人員配置",
        "holiday_rules": "祝日対応ルール",
        "periodic_schedule": "定期スケジュール",
        "periodic_work_contents": "定期作業内容",
        "daily_work_contents": "日常作業内容",
    }

    # Status/value display labels
    STATUS_LABEL: dict[str, str] = {
        "ACTIVE": "有効",
        "DRAFT": "下書き",
        "CANCELLED": "解約済み",
        "EXPIRED": "期限切れ",
    }
    TAX_LABEL: dict[str, str] = {
        "EXCLUSIVE": "税抜",
        "INCLUSIVE": "税込",
        "EXEMPT": "非課税",
    }
    ACTION_LABEL: dict[str, str] = {
        "CREATE": "新規登録",
        "UPDATE": "更新",
        "DELETE": "削除",
        "CANCEL": "解約",
    }

    def _format_value(key: str, val: object) -> str:
        """Format a raw value for human-readable display in Japanese."""
        if val is None:
            return "—"
        if key == "amount":
            try:
                return f"{int(float(str(val))):,} 円"
            except (ValueError, TypeError):
                return str(val)
        if key == "status":
            return STATUS_LABEL.get(str(val), str(val))
        if key == "tax_type":
            return TAX_LABEL.get(str(val), str(val))
        if key in ("start_date", "end_date", "work_execution_date"):
            # Format YYYY-MM-DD → YYYY年MM月DD日
            try:
                parts = str(val).split("-")
                if len(parts) == 3:
                    return f"{parts[0]}年{parts[1]}月{parts[2]}日"
            except Exception:
                pass
        if key in ("auto_renew", "invoice_required"):
            return "あり" if val else "なし"
        if isinstance(val, (list, dict)):
            return _json.dumps(val, ensure_ascii=False)
        return str(val)

    def _compute_changed_fields(old: dict | None, new: dict | None) -> list[dict]:
        """Compute a list of {field, label, old, new} for fields that changed."""
        if not old and not new:
            return []
        if not old:
            # CREATE: just return all non-null new fields
            return [
                {
                    "field": k,
                    "label": FIELD_LABEL_MAP.get(k, k),
                    "old": None,
                    "new": _format_value(k, v),
                }
                for k, v in (new or {}).items()
                if v is not None and v != [] and v != {}
            ]
        if not new:
            # DELETE: just return old fields
            return [
                {
                    "field": k,
                    "label": FIELD_LABEL_MAP.get(k, k),
                    "old": _format_value(k, v),
                    "new": None,
                }
                for k, v in (old or {}).items()
                if v is not None
            ]
        # UPDATE: return fields where old != new
        all_keys = set(old.keys()) | set(new.keys())
        changed = []
        for k in sorted(all_keys):
            old_v = old.get(k)
            new_v = new.get(k)
            # Normalize to JSON string for comparison to handle list/dict equality
            old_str = _json.dumps(old_v, sort_keys=True, default=str)
            new_str = _json.dumps(new_v, sort_keys=True, default=str)
            if old_str != new_str:
                changed.append(
                    {
                        "field": k,
                        "label": FIELD_LABEL_MAP.get(k, k),
                        "old": _format_value(k, old_v),
                        "new": _format_value(k, new_v),
                    }
                )
        return changed

    result = await db.execute(
        text("""
            SELECT al.id, al.action, al.old_value, al.new_value,
                   al.created_at,
                   u.last_name || ' ' || u.first_name AS user_name
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE al.entity_id = CAST(:cid AS uuid)
              AND al.entity_type = 'contract'
              AND al.action != 'VIEW'
            ORDER BY al.created_at DESC
            LIMIT 100
        """),
        {"cid": str(id)},
    )
    rows = result.mappings().all()

    items = []
    for row in rows:
        action = row["action"]
        old_raw = row["old_value"]
        new_raw = row["new_value"]

        try:
            old_dict: dict | None = _json.loads(old_raw) if old_raw else None
        except Exception:
            old_dict = None
        try:
            new_dict: dict | None = _json.loads(new_raw) if new_raw else None
        except Exception:
            new_dict = None

        changed_fields = _compute_changed_fields(old_dict, new_dict)

        # Skip UPDATE entries where no fields actually changed (noise reduction)
        if action == "UPDATE" and not changed_fields:
            continue

        items.append(
            {
                "id": str(row["id"]),
                "action": action,
                "action_label": ACTION_LABEL.get(action, action),
                "changed_fields": changed_fields,
                "changed_at": row["created_at"].isoformat() if row["created_at"] else None,
                "changed_by": row["user_name"] or "システム",
            }
        )

    return {"items": items, "total": len(items)}


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
    if contract.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="解約済みの契約は編集できません。")

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


# ==============================================================================
# Ordering Links (Subcontracting N:N) — /contracts/{id}/ordering-links
# ==============================================================================

from fastapi import HTTPException
from app.modules.contract.ordering_link_repository import OrderingLinkRepository


@router.get(
    "/{id}/ordering-links",
    response_model=list[OrderingLinkResponse],
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def list_ordering_links(
    db: DbSession,
    id: uuid.UUID,
) -> list[OrderingLinkResponse]:
    """List all RECEIVING contracts linked to an ORDERING contract."""
    return await OrderingLinkRepository.get_links_for_ordering_contract(db, id)


@router.get(
    "/{id}/available-receiving-contracts",
    response_model=list[AvailableReceivingContractItem],
    dependencies=[Depends(require_permission(Permission.CONTRACT_READ))],
)
async def list_available_receiving_contracts(
    db: DbSession,
    id: uuid.UUID,
) -> list[AvailableReceivingContractItem]:
    """List RECEIVING contracts (same genba) not yet linked to this ORDERING contract."""
    return await OrderingLinkRepository.get_available_receiving_contracts(db, id)


@router.post(
    "/{id}/ordering-links",
    response_model=OrderingLinkResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def create_ordering_link(
    db: DbSession,
    id: uuid.UUID,
    payload: OrderingLinkCreate,
) -> OrderingLinkResponse:
    """Create a new link between an ORDERING contract and a RECEIVING contract."""
    from app.modules.contract.repository import ContractRepository
    contract = await ContractRepository.get_by_id(db, id)
    if not contract or contract.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="解約済みの契約は編集できません。")

    result = await OrderingLinkRepository.create_link(db, id, payload)
    await db.commit()
    return result


@router.put(
    "/{id}/ordering-links/{link_id}",
    response_model=OrderingLinkResponse,
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def update_ordering_link(
    db: DbSession,
    id: uuid.UUID,
    link_id: uuid.UUID,
    payload: OrderingLinkUpdate,
) -> OrderingLinkResponse:
    """Update an ordering link's assignment type, amount, or work items."""
    link = await OrderingLinkRepository.get_link_by_id(db, link_id)
    if not link or link.ordering_contract_id != id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたリンクが見つかりません。",
        )
        
    from app.modules.contract.repository import ContractRepository
    contract = await ContractRepository.get_by_id(db, id)
    if contract and contract.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="解約済みの契約は編集できません。")

    result = await OrderingLinkRepository.update_link(db, link, payload)
    await db.commit()
    return result


@router.delete(
    "/{id}/ordering-links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission(Permission.CONTRACT_WRITE))],
)
async def delete_ordering_link(
    db: DbSession,
    id: uuid.UUID,
    link_id: uuid.UUID,
) -> None:
    """Remove an ordering link (and its work items) from an ORDERING contract."""
    link = await OrderingLinkRepository.get_link_by_id(db, link_id)
    if not link or link.ordering_contract_id != id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたリンクが見つかりません。",
        )
        
    from app.modules.contract.repository import ContractRepository
    contract = await ContractRepository.get_by_id(db, id)
    if contract and contract.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="解約済みの契約は編集できません。")

    await OrderingLinkRepository.delete_link(db, link)
    await db.commit()

