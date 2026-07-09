"""
Genba Management System — Genba Module: Repository.

Data access object for worksites (genba).
"""

import uuid
from typing import Sequence
from sqlalchemy import select, func, delete, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.genba.models import GenbaModel, GenbaStaffAssignmentModel, customer_contact_genba


class GenbaRepository:
    """Repository class for handling DB operations for Genba (worksites)."""

    @staticmethod
    async def get_by_id(db: AsyncSession, genba_id: uuid.UUID) -> GenbaModel | None:
        """Retrieve a Genba by ID with its customer."""
        from sqlalchemy.orm import joinedload
        result = await db.execute(
            select(GenbaModel)
            .options(joinedload(GenbaModel.customer))
            .where(GenbaModel.id == genba_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_id: uuid.UUID | None = None,
        search_query: str | None = None,
    ) -> Sequence[GenbaModel]:
        """
        List all Genbas with filters and pagination.

        PostgreSQL Row-Level Security automatically applies constraints
        to filter the returned records based on the user's role.
        """
        query = select(GenbaModel)
        if status:
            query = query.where(GenbaModel.status == status)
        if customer_id:
            query = query.where(GenbaModel.customer_id == customer_id)
        if search_query:
            query = query.where(
                (GenbaModel.property_name.ilike(f"%{search_query}%"))
                | (GenbaModel.address.ilike(f"%{search_query}%"))
            )
        query = query.order_by(GenbaModel.property_name).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def count_all(
        db: AsyncSession,
        status: str | None = None,
        customer_id: uuid.UUID | None = None,
        search_query: str | None = None,
    ) -> int:
        """Count total Genbas matching criteria."""
        query = select(func.count()).select_from(GenbaModel)
        if status:
            query = query.where(GenbaModel.status == status)
        if customer_id:
            query = query.where(GenbaModel.customer_id == customer_id)
        if search_query:
            query = query.where(
                (GenbaModel.property_name.ilike(f"%{search_query}%"))
                | (GenbaModel.address.ilike(f"%{search_query}%"))
            )
        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def check_similar_name(db: AsyncSession, property_name: str) -> Sequence[GenbaModel]:
        """Check for existing properties with similar names to prevent duplication."""
        # Simple similarity check: matches if name contains the new name or vice-versa
        query = select(GenbaModel).where(
            (GenbaModel.property_name.ilike(f"%{property_name}%"))
            | (func.strpos(property_name, GenbaModel.property_name) > 0)
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create(db: AsyncSession, model: GenbaModel) -> GenbaModel:
        """Create a new Genba."""
        db.add(model)
        await db.flush()
        return model

    # =========================================================================
    # Sprint 5: Contact and Staff Assignment Methods
    # =========================================================================

    @staticmethod
    async def assign_contacts(
        db: AsyncSession, genba_id: uuid.UUID, contact_ids: list[uuid.UUID]
    ) -> None:
        """Bulk insert customer_contact_genba association records."""
        if not contact_ids:
            return
        values = [
            {"customer_contact_id": cid, "genba_id": genba_id}
            for cid in contact_ids
        ]
        await db.execute(insert(customer_contact_genba).values(values))
        await db.flush()

    @staticmethod
    async def replace_contacts(
        db: AsyncSession, genba_id: uuid.UUID, contact_ids: list[uuid.UUID]
    ) -> None:
        """Replace all contact assignments for a Genba."""
        # Delete existing
        await db.execute(
            delete(customer_contact_genba).where(
                customer_contact_genba.c.genba_id == genba_id
            )
        )
        # Insert new
        if contact_ids:
            values = [
                {"customer_contact_id": cid, "genba_id": genba_id}
                for cid in contact_ids
            ]
            await db.execute(insert(customer_contact_genba).values(values))
        await db.flush()

    @staticmethod
    async def assign_staff(
        db: AsyncSession,
        genba_id: uuid.UUID,
        assignments: list[dict],
    ) -> None:
        """Bulk create GenbaStaffAssignment records."""
        if not assignments:
            return
        for assignment in assignments:
            model = GenbaStaffAssignmentModel(
                genba_id=genba_id,
                staff_id=assignment["staff_id"],
                role_type=assignment.get("role_type", "MAIN"),
            )
            db.add(model)
        await db.flush()

    @staticmethod
    async def replace_staff(
        db: AsyncSession,
        genba_id: uuid.UUID,
        assignments: list[dict],
    ) -> None:
        """Replace all staff assignments for a Genba."""
        # Delete existing
        await db.execute(
            delete(GenbaStaffAssignmentModel).where(
                GenbaStaffAssignmentModel.genba_id == genba_id
            )
        )
        # Insert new
        await GenbaRepository.assign_staff(db, genba_id, assignments)

    @staticmethod
    async def check_duplicate_contact_name(
        db: AsyncSession, customer_id: uuid.UUID, full_name: str
    ) -> bool:
        """Check if a customer contact with the same name exists for the given customer."""
        from app.modules.customer.models import CustomerContactModel
        result = await db.execute(
            select(func.count()).select_from(CustomerContactModel).where(
                CustomerContactModel.customer_id == customer_id,
                CustomerContactModel.full_name == full_name,
                CustomerContactModel.is_active == True,
            )
        )
        count = result.scalar() or 0
        return count > 0
