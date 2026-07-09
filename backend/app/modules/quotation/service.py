"""
Genba Management System — Quotation Service.
"""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.approval import approval_service
from app.core.audit import audit_service
from app.core.exceptions import ForbiddenError, InvalidStatusTransitionError, NotFoundError
from app.modules.quotation.models import QuotationItemModel, QuotationModel
from app.modules.quotation.repository import quotation_repository
from app.modules.quotation.schemas import QuotationCreate, QuotationResponse, QuotationUpdate


class QuotationService:
    """Service layer for quotation business logic."""

    async def create_quotation(
        self,
        db: AsyncSession,
        genba_id: str,
        data: QuotationCreate,
        current_user: dict,
    ) -> QuotationResponse:
        genba_uuid = uuid.UUID(genba_id)
        user_uuid = uuid.UUID(str(current_user["id"]))
        
        quotation_number = await quotation_repository.get_next_quotation_number(db)
        
        # Calculate totals
        total_amount = sum(item.quantity * item.unit_price for item in data.items)
        tax_amount = total_amount * 0.1  # Assuming 10% tax for simplicity, ideally configurable
        
        quotation = QuotationModel(
            quotation_number=quotation_number,
            title=data.title,
            issue_date=data.issue_date,
            valid_until=data.valid_until,
            total_amount=total_amount,
            tax_amount=tax_amount,
            work_cycle=data.work_cycle,
            work_hours=data.work_hours,
            description=data.description,
            special_conditions=data.special_conditions,
            status="DRAFT",
            genba_id=genba_uuid,
            customer_id=data.customer_id,
            created_by=user_uuid,
        )
        
        items = [
            QuotationItemModel(
                item_name=item.item_name,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                subtotal=item.quantity * item.unit_price,
                remarks=item.remarks,
                sort_order=item.sort_order,
            )
            for item in data.items
        ]
        
        created_quotation = await quotation_repository.create(db, quotation, items)
        
        # Audit log
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="CREATE",
            entity_type="quotation",
            entity_id=str(created_quotation.id),
            new_value=json.dumps({"quotation_number": quotation_number})
        )
        
        return QuotationResponse.model_validate(created_quotation)

    async def get_quotation(
        self, db: AsyncSession, quotation_id: str, current_user: dict
    ) -> QuotationResponse:
        quotation_uuid = uuid.UUID(quotation_id)
        quotation = await quotation_repository.get_by_id(db, quotation_uuid)
        if not quotation:
            raise NotFoundError("Báo giá")
            
        # Optional: check RLS or permissions here if not handled by db session
        
        return QuotationResponse.model_validate(quotation)

    async def list_by_genba(
        self, db: AsyncSession, genba_id: str, current_user: dict
    ) -> list[QuotationResponse]:
        genba_uuid = uuid.UUID(genba_id)
        quotations = await quotation_repository.list_by_genba(db, genba_uuid)
        return [QuotationResponse.model_validate(q) for q in quotations]

    async def request_approval(
        self, db: AsyncSession, quotation_id: str, current_user: dict
    ) -> QuotationResponse:
        """Submit a quotation for approval."""
        quotation_uuid = uuid.UUID(quotation_id)
        quotation = await quotation_repository.get_by_id(db, quotation_uuid)
        
        if not quotation:
            raise NotFoundError("Báo giá")
            
        if quotation.status not in ("DRAFT", "REJECTED"):
            raise InvalidStatusTransitionError(quotation.status, "PENDING_APPROVAL")
            
        # Create approval request
        await approval_service.create_request(
            db=db,
            entity_type="QUOTATION",
            entity_id=quotation.id,
            requested_by=uuid.UUID(str(current_user["id"]))
        )
        
        quotation.status = "PENDING_APPROVAL"
        await quotation_repository.update(db, quotation)
        
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="UPDATE",
            entity_type="quotation",
            entity_id=quotation_id,
            new_value=json.dumps({"status": "PENDING_APPROVAL"})
        )
        
        return QuotationResponse.model_validate(quotation)


quotation_service = QuotationService()
