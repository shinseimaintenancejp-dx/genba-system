"""
Genba Management System — Partner Module: Repository.

Data access object for partner companies (協力会社).
"""

import uuid
from typing import Sequence
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.partner.models import PartnerCompanyModel


class PartnerRepository:
    """Repository class for handling DB operations for Partner Companies."""

    @staticmethod
    async def get_by_id(db: AsyncSession, partner_id: uuid.UUID) -> PartnerCompanyModel | None:
        """Retrieve a partner company by ID."""
        result = await db.execute(
            select(PartnerCompanyModel).where(PartnerCompanyModel.id == partner_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> Sequence[PartnerCompanyModel]:
        """List all partner companies with filters."""
        query = select(PartnerCompanyModel)
        if is_active is not None:
            query = query.where(PartnerCompanyModel.is_active == is_active)
        if search_query:
            query = query.where(
                or_(
                    PartnerCompanyModel.company_name.ilike(f"%{search_query}%"),
                    PartnerCompanyModel.contact_person.ilike(f"%{search_query}%"),
                )
            )
        query = query.order_by(PartnerCompanyModel.company_name).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def count_all(
        db: AsyncSession,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> int:
        """Count total partner companies matching criteria."""
        query = select(func.count()).select_from(PartnerCompanyModel)
        if is_active is not None:
            query = query.where(PartnerCompanyModel.is_active == is_active)
        if search_query:
            query = query.where(
                or_(
                    PartnerCompanyModel.company_name.ilike(f"%{search_query}%"),
                    PartnerCompanyModel.contact_person.ilike(f"%{search_query}%"),
                )
            )
        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def create(db: AsyncSession, model: PartnerCompanyModel) -> PartnerCompanyModel:
        """Create a new partner company."""
        db.add(model)
        await db.flush()
        return model
