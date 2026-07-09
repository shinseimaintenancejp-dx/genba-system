"""
Genba Management System — Quotation Repository.
"""

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.quotation.models import QuotationItemModel, QuotationModel


class QuotationRepository:
    """Repository for Quotation operations."""

    async def get_by_id(self, db: AsyncSession, quotation_id: uuid.UUID) -> QuotationModel | None:
        query = (
            select(QuotationModel)
            .where(QuotationModel.id == quotation_id)
            .options(selectinload(QuotationModel.items))
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def list_by_genba(self, db: AsyncSession, genba_id: uuid.UUID) -> Sequence[QuotationModel]:
        query = (
            select(QuotationModel)
            .where(QuotationModel.genba_id == genba_id)
            .order_by(QuotationModel.created_at.desc())
            .options(selectinload(QuotationModel.items))
        )
        result = await db.execute(query)
        return result.scalars().all()

    async def create(
        self,
        db: AsyncSession,
        quotation: QuotationModel,
        items: list[QuotationItemModel],
    ) -> QuotationModel:
        db.add(quotation)
        await db.flush()

        for item in items:
            item.quotation_id = quotation.id
            db.add(item)
            
        await db.flush()
        return quotation

    async def update(self, db: AsyncSession, quotation: QuotationModel) -> QuotationModel:
        db.add(quotation)
        await db.flush()
        return quotation

    async def delete(self, db: AsyncSession, quotation: QuotationModel) -> None:
        await db.delete(quotation)
        await db.flush()

    async def get_next_quotation_number(self, db: AsyncSession) -> str:
        """Generate a simple sequential quotation number (e.g., QT-20260611-0001)."""
        from datetime import datetime
        import pytz
        
        # Use JST for business logic (INT§2.1)
        jst = pytz.timezone("Asia/Tokyo")
        today = datetime.now(jst).strftime("%Y%m%d")
        
        prefix = f"QT-{today}-"
        query = select(QuotationModel.quotation_number).where(
            QuotationModel.quotation_number.like(f"{prefix}%")
        ).order_by(QuotationModel.quotation_number.desc())
        
        result = await db.execute(query)
        last_number = result.scalars().first()
        
        if last_number:
            sequence = int(last_number.split("-")[-1]) + 1
        else:
            sequence = 1
            
        return f"{prefix}{sequence:04d}"


quotation_repository = QuotationRepository()
