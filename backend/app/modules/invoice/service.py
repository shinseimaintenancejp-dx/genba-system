"""
Genba Management System — Invoice Service.
"""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.approval import approval_service
from app.core.audit import audit_service
from app.core.exceptions import DuplicateError, InvalidStatusTransitionError, NotFoundError
from app.modules.invoice.models import InvoiceModel
from app.modules.invoice.repository import invoice_repository
from app.modules.invoice.schemas import InvoiceCreate, InvoiceResponse


class InvoiceService:
    """Service layer for invoice business logic."""

    async def create_invoice(
        self,
        db: AsyncSession,
        data: InvoiceCreate,
        current_user: dict,
    ) -> InvoiceResponse:
        contract_uuid = data.contract_id
        user_uuid = uuid.UUID(str(current_user["id"]))
        
        # Check for duplicates in same period
        existing = await invoice_repository.get_by_period_and_contract(
            db, contract_uuid, data.billing_period_year, data.billing_period_month, data.invoice_type
        )
        if existing:
            raise DuplicateError("Hóa đơn", "billing_period")
        
        invoice_number = await invoice_repository.get_next_invoice_number(db, data.invoice_type == "OUTGOING")
        
        tax_amount = data.amount * 0.1  # Basic 10% tax for MVP
        
        invoice = InvoiceModel(
            invoice_number=invoice_number,
            invoice_type=data.invoice_type,
            issue_date=data.issue_date,
            billing_period_year=data.billing_period_year,
            billing_period_month=data.billing_period_month,
            amount=data.amount,
            tax_amount=tax_amount,
            status="DRAFT",
            is_auto_generated=False,
            notes=data.notes,
            contract_id=contract_uuid,
            created_by=user_uuid,
        )
        
        created_invoice = await invoice_repository.create(db, invoice)
        
        # Audit log
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="CREATE",
            entity_type="invoice",
            entity_id=str(created_invoice.id),
            new_value=json.dumps({"invoice_number": invoice_number})
        )
        
        return InvoiceResponse.model_validate(created_invoice)

    async def get_invoice(
        self, db: AsyncSession, invoice_id: str, current_user: dict
    ) -> InvoiceResponse:
        invoice_uuid = uuid.UUID(invoice_id)
        invoice = await invoice_repository.get_by_id(db, invoice_uuid)
        if not invoice:
            raise NotFoundError("Hóa đơn")
            
        return InvoiceResponse.model_validate(invoice)

    async def list_by_contract(
        self, db: AsyncSession, contract_id: str, current_user: dict
    ) -> list[InvoiceResponse]:
        contract_uuid = uuid.UUID(contract_id)
        invoices = await invoice_repository.list_by_contract(db, contract_uuid)
        return [InvoiceResponse.model_validate(inv) for inv in invoices]

    async def request_approval(
        self, db: AsyncSession, invoice_id: str, current_user: dict
    ) -> InvoiceResponse:
        """Submit an invoice for approval."""
        invoice_uuid = uuid.UUID(invoice_id)
        invoice = await invoice_repository.get_by_id(db, invoice_uuid)
        
        if not invoice:
            raise NotFoundError("Hóa đơn")
            
        if invoice.status not in ("DRAFT", "AUTO_GENERATED"):
            raise InvalidStatusTransitionError(invoice.status, "PENDING_APPROVAL")
            
        # Create approval request
        await approval_service.create_request(
            db=db,
            entity_type="INVOICE",
            entity_id=invoice.id,
            requested_by=uuid.UUID(str(current_user["id"]))
        )
        
        invoice.status = "PENDING_APPROVAL"
        await invoice_repository.update(db, invoice)
        
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="UPDATE",
            entity_type="invoice",
            entity_id=invoice_id,
            new_value=json.dumps({"status": "PENDING_APPROVAL"})
        )
        
        return InvoiceResponse.model_validate(invoice)


invoice_service = InvoiceService()
