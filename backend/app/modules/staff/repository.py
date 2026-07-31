"""
Genba Management System — Staff Module: Repository.

Data access layer using async SQLAlchemy 2.0.
"""

import uuid
from typing import Sequence
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.staff.models import StaffModel
from app.modules.staff.models_position import PositionModel
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
        role: str | None = None,
    ) -> tuple[Sequence[StaffModel], int]:
        """List all staff with optional filters and count."""
        stmt = select(StaffModel)
        count_stmt = select(StaffModel)

        # Handle role filter via UserModel join
        if role is not None:
            from app.modules.auth.models import UserModel
            stmt = stmt.join(UserModel, UserModel.related_entity_id == StaffModel.id).where(UserModel.role == role)
            count_stmt = count_stmt.join(UserModel, UserModel.related_entity_id == StaffModel.id).where(UserModel.role == role)

        # Apply filters
        filters = []
        if is_active is not None:
            filters.append(StaffModel.is_active == is_active)
        if search_query:
            search_pattern = f"%{search_query}%"
            filters.append(
                or_(
                    StaffModel.last_name.ilike(search_pattern),
                    StaffModel.first_name.ilike(search_pattern),
                    StaffModel.email.ilike(search_pattern),
                    StaffModel.positions.any(PositionModel.name.ilike(search_pattern)),
                )
            )

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        # Ordering & Pagination
        stmt = stmt.order_by(StaffModel.last_name, StaffModel.first_name).offset(skip).limit(limit)

        result = await db.execute(stmt)
        items = result.scalars().all()

        # Count query
        from sqlalchemy import func
        count_stmt = count_stmt.with_only_columns(func.count(StaffModel.id)).order_by(None)
        total_result = await db.execute(count_stmt)
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
            last_name=data.last_name,
            first_name=data.first_name,
            phone=data.phone,
            email=data.email,
            is_active=True,
        )
        if data.position_ids:
            positions_res = await db.execute(select(PositionModel).where(PositionModel.id.in_(data.position_ids)))
            staff.positions = list(positions_res.scalars().all())
            
        db.add(staff)
        await db.flush()
        return staff

    @staticmethod
    async def update(db: AsyncSession, staff: StaffModel, data: StaffUpdate) -> StaffModel:
        """Update an existing staff member."""
        if data.last_name is not None:
            staff.last_name = data.last_name
        if data.first_name is not None:
            staff.first_name = data.first_name
        if data.phone is not None:
            staff.phone = data.phone
        if data.email is not None:
            staff.email = data.email
        if data.is_active is not None:
            staff.is_active = data.is_active
            
        if data.position_ids is not None:
            if not data.position_ids:
                staff.positions = []
            else:
                positions_res = await db.execute(select(PositionModel).where(PositionModel.id.in_(data.position_ids)))
                staff.positions = list(positions_res.scalars().all())

        await db.flush()
        return staff

    @staticmethod
    async def delete(db: AsyncSession, staff: StaffModel) -> None:
        """Delete a staff member."""
        await db.delete(staff)
        await db.flush()

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
        
        # Load relationship to avoid MissingGreenlet
        stmt = select(GenbaStaffAssignmentModel).where(GenbaStaffAssignmentModel.id == assignment.id)
        result = await db.execute(stmt)
        return result.scalar_one()

    @staticmethod
    async def unassign_staff(db: AsyncSession, assignment: GenbaStaffAssignmentModel) -> None:
        """Remove a staff assignment from a Genba worksite."""
        await db.delete(assignment)
        await db.flush()


class PositionRepository:
    @staticmethod
    async def list_positions(db: AsyncSession) -> Sequence[PositionModel]:
        stmt = select(PositionModel).order_by(PositionModel.name)
        res = await db.execute(stmt)
        return res.scalars().all()
        
    @staticmethod
    async def get_by_id(db: AsyncSession, pos_id: uuid.UUID) -> PositionModel | None:
        res = await db.execute(select(PositionModel).where(PositionModel.id == pos_id))
        return res.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> PositionModel | None:
        res = await db.execute(select(PositionModel).where(PositionModel.name == name))
        return res.scalar_one_or_none()
        
    @staticmethod
    async def create(db: AsyncSession, data) -> PositionModel:
        pos = PositionModel(name=data.name, description=data.description)
        db.add(pos)
        await db.flush()
        return pos
        
    @staticmethod
    async def update(db: AsyncSession, pos: PositionModel, data) -> PositionModel:
        if data.name is not None:
            pos.name = data.name
        if data.description is not None:
            pos.description = data.description
        if data.is_active is not None:
            pos.is_active = data.is_active
        await db.flush()
        return pos
        
    @staticmethod
    async def delete(db: AsyncSession, pos: PositionModel) -> None:
        await db.delete(pos)
        await db.flush()

