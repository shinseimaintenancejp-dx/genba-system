"""
Genba Management System — Partner Module: Service.

Business logic for partner companies (協力会社).
"""

import json
import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import NotFoundError
from app.modules.partner.models import PartnerCompanyModel
from app.modules.partner.repository import PartnerRepository
from app.modules.partner.schemas import PartnerCompanyCreate, PartnerCompanyUpdate


class PartnerService:
    """Service class encapsulating business operations for partner companies."""

    @staticmethod
    async def get_partner(db: AsyncSession, partner_id: uuid.UUID, user_id: str) -> PartnerCompanyModel:
        """Get partner by ID, raises NotFoundError if not found, logs view event."""
        partner = await PartnerRepository.get_by_id(db, partner_id)
        if not partner:
            raise NotFoundError("協力会社が見つかりません")

        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="partner",
            entity_id=str(partner.id),
            user_id=user_id,
        )
        return partner

    @staticmethod
    async def list_partners(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> tuple[Sequence[PartnerCompanyModel], int]:
        """List partners with pagination and filtering, returns (items, total_count)."""
        items = await PartnerRepository.list_all(
            db, skip=skip, limit=limit, is_active=is_active, search_query=search_query
        )
        total = await PartnerRepository.count_all(
            db, is_active=is_active, search_query=search_query
        )
        return items, total

    @staticmethod
    async def create_partner(db: AsyncSession, data: PartnerCompanyCreate, user_id: str) -> PartnerCompanyModel:
        """Create a new partner and log audit entry."""
        partner = PartnerCompanyModel(
            company_name=data.company_name,
            phone=data.phone,
            fax=data.fax,
            email=data.email,
            address=data.address,
            contact_person=data.contact_person,
            notes=data.notes,
        )
        created_partner = await PartnerRepository.create(db, partner)

        # Log audit log
        new_val = {
            "company_name": partner.company_name,
            "contact_person": partner.contact_person,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="partner",
            entity_id=str(created_partner.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return created_partner

    @staticmethod
    async def update_partner(
        db: AsyncSession, partner_id: uuid.UUID, data: PartnerCompanyUpdate, user_id: str
    ) -> PartnerCompanyModel:
        """Update an existing partner company and log audit entry."""
        partner = await PartnerRepository.get_by_id(db, partner_id)
        if not partner:
            raise NotFoundError("協力会社が見つかりません")

        old_val = {
            "company_name": partner.company_name,
            "contact_person": partner.contact_person,
            "is_active": partner.is_active,
        }

        # Apply updates
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(partner, field, value)

        await db.flush()

        new_val = {
            "company_name": partner.company_name,
            "contact_person": partner.contact_person,
            "is_active": partner.is_active,
        }

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="partner",
            entity_id=str(partner.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return partner
