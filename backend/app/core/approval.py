"""
Genba Management System — Approval Workflow Engine.

Core logic for document approval state machine (Quotations, Contracts, Invoices).
Enforces RBAC for approvals (Admin, Senior Staff).
"""

import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import ForeignKey, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.audit import audit_service
from app.core.database import Base
from app.core.exceptions import ForbiddenError, InsufficientRoleError, NotFoundError, ValidationError
from app.core.permissions import Role
import json


class ApprovalRequestModel(Base):
    """
    SQLAlchemy model for approval requests.
    Tracks the approval workflow of various entities.
    """

    __tablename__ = "approval_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    
    # 'QUOTATION', 'CONTRACT', 'INVOICE'
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    
    requested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # 'PENDING', 'APPROVED', 'REJECTED'
    status: Mapped[str] = mapped_column(String(20), default="PENDING", server_default="PENDING")
    
    approved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), server_default=func.now()
    )


class ApprovalService:
    """Service for handling the approval workflow state machine."""

    async def create_request(
        self,
        db: AsyncSession,
        entity_type: str,
        entity_id: uuid.UUID,
        requested_by: uuid.UUID,
    ) -> ApprovalRequestModel:
        """Create a new approval request."""
        # Cancel any pending requests for this entity
        query = select(ApprovalRequestModel).where(
            ApprovalRequestModel.entity_type == entity_type,
            ApprovalRequestModel.entity_id == entity_id,
            ApprovalRequestModel.status == "PENDING"
        )
        result = await db.execute(query)
        pending_requests = result.scalars().all()
        for req in pending_requests:
            req.status = "CANCELLED"
            
        # Create new request
        new_request = ApprovalRequestModel(
            entity_type=entity_type,
            entity_id=entity_id,
            requested_by=requested_by,
            status="PENDING"
        )
        db.add(new_request)
        await db.flush()
        
        await audit_service.log(
            session=db,
            user_id=str(requested_by),
            action="CREATE",
            entity_type="approval_request",
            entity_id=str(new_request.id),
        )
        return new_request

    async def process_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        action: Literal["APPROVE", "REJECT"],
        processed_by_id: uuid.UUID,
        processed_by_role: str,
        comment: str | None = None,
    ) -> ApprovalRequestModel:
        """Approve or reject a request."""
        # Only ADMIN and SENIOR_STAFF can approve/reject
        if processed_by_role not in (Role.ADMIN, Role.SENIOR_STAFF):
            raise InsufficientRoleError("Quản lý cấp cao (ADMIN, SENIOR_STAFF)")
            
        if action == "REJECT" and not comment:
            raise ValidationError(field="comment", issue="Phải nhập lý do khi từ chối.")

        query = select(ApprovalRequestModel).where(ApprovalRequestModel.id == request_id)
        result = await db.execute(query)
        request = result.scalars().first()
        
        if not request:
            raise NotFoundError("Yêu cầu phê duyệt")
            
        if request.status != "PENDING":
            raise ValidationError(field="status", issue="Yêu cầu này đã được xử lý.")
            
        request.status = "APPROVED" if action == "APPROVE" else "REJECTED"
        request.approved_by = processed_by_id
        request.approved_at = datetime.now(timezone.utc)
        request.comment = comment
        
        await audit_service.log(
            session=db,
            user_id=str(processed_by_id),
            action="UPDATE",
            entity_type="approval_request",
            entity_id=str(request.id),
            new_value=json.dumps({"status": request.status})
        )
        
        await db.flush()
        return request


approval_service = ApprovalService()
