"""
Genba Management System — Staff Module: Repository.

Data access layer using async SQLAlchemy 2.0.
"""

import uuid
from typing import Sequence
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.staff.models import StaffModel
from app.modules.genba.models import GenbaStaffAssignmentModel
from app.modules.staff.schemas import StaffCreate, StaffUpdate


class StaffRepository:
    """Repository managing Staff and GenbaStaffAssignment database operations."""

    @staticmethod
    async def list_staff(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> tuple[Sequence[StaffModel], int]:
        """List all staff with optional filters and count."""
        stmt = select(StaffModel)
        count_stmt = select(StaffModel)

        # Apply filters
        filters = []
        if is_active is not None:
            filters.append(StaffModel.is_active == is_active)
        if search_query:
            search_pattern = f"%{search_query}%"
            filters.append(
                or_(
                    StaffModel.full_name.ilike(search_pattern),
                    StaffModel.email.ilike(search_pattern),
                    StaffModel.position.ilike(search_pattern),
                )
            )

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        # Ordering & Pagination
        stmt = stmt.order_by(StaffModel.full_name).offset(skip).limit(limit)

        result = await db.execute(stmt)
        items = result.scalars().all()

        # Count query
        from sqlalchemy import func
        count_stmt = count_stmt.select_from(StaffModel).scalar_subquery()
        total_result = await db.execute(select(func.count()).select_from(count_stmt))
        total = total_result.scalar() or 0

        return items, total

    @staticmethod
    async def get_by_id(db: AsyncSession, staff_id: uuid.UUID) -> StaffModel | None:
        """Retrieve a staff member by ID."""
        stmt = select(StaffModel).where(StaffModel.id == staff_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> StaffModel | None:
        """Retrieve a staff member by email."""
        stmt = select(StaffModel).where(StaffModel.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: StaffCreate) -> StaffModel:
        """Create a new staff member."""
        staff = StaffModel(
            full_name=data.full_name,
            position=data.position,
            phone=data.phone,
            email=data.email,
            is_active=True,
        )
        db.add(staff)
        await db.flush()
        return staff

    @staticmethod
    async def update(db: AsyncSession, staff: StaffModel, data: StaffUpdate) -> StaffModel:
        """Update staff member details."""
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(staff, key, value)
        await db.flush()
        return staff

    # =============================================================================
    # Staff Assignment Operations
    # =============================================================================

    @staticmethod
    async def get_assignment(
        db: AsyncSession, genba_id: uuid.UUID, staff_id: uuid.UUID
    ) -> GenbaStaffAssignmentModel | None:
        """Retrieve a staff assignment for a specific Genba."""
        stmt = select(GenbaStaffAssignmentModel).where(
            and_(
                GenbaStaffAssignmentModel.genba_id == genba_id,
                GenbaStaffAssignmentModel.staff_id == staff_id,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def assign_staff(
        db: AsyncSession, genba_id: uuid.UUID, staff_id: uuid.UUID, role_type: str
    ) -> GenbaStaffAssignmentModel:
        """Create a new Genba staff assignment."""
        assignment = GenbaStaffAssignmentModel(
            genba_id=genba_id,
            staff_id=staff_id,
            role_type=role_type,
        )
        db.add(assignment)
        await db.flush()
        return assignment

    @staticmethod
    async def unassign_staff(db: AsyncSession, assignment: GenbaStaffAssignmentModel) -> None:
        """Remove a staff assignment from a Genba worksite."""
        await db.delete(assignment)
        await db.flush()
