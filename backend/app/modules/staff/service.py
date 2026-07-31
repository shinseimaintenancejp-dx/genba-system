"""
Genba Management System — Staff Module: Service.

Business logic layer managing staff operations and assignments.
"""

import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.exceptions import ConflictError, NotFoundError, DuplicateError
from app.modules.staff.models import StaffModel
from app.modules.genba.models import GenbaStaffAssignmentModel, GenbaModel
from app.modules.staff.repository import StaffRepository, PositionRepository
from app.modules.staff.models_position import PositionModel
from app.modules.staff.schemas import StaffCreate, StaffUpdate


class StaffService:
    """Service class encapsulating business rules for Staff management."""

    @staticmethod
    async def list_staff(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
        role: str | None = None,
    ) -> tuple[Sequence[StaffModel], int]:
        """List staff members with filters and count."""
        return await StaffRepository.list_staff(
            db, skip=skip, limit=limit, is_active=is_active, search_query=search_query, role=role
        )

    @staticmethod
    async def get_staff(db: AsyncSession, staff_id: uuid.UUID) -> StaffModel:
        """Retrieve a staff member or raise 404."""
        staff = await StaffRepository.get_by_id(db, staff_id)
        if not staff:
            raise NotFoundError("担当者")
        return staff

    @staticmethod
    async def create_staff(db: AsyncSession, data: StaffCreate, current_user_id: uuid.UUID) -> StaffModel:
        """Create a new staff member. Checks for duplicate email."""
        if data.email:
            existing = await StaffRepository.get_by_email(db, data.email)
            if existing:
                raise DuplicateError("メールアドレス", "email")

        staff = await StaffRepository.create(db, data)
        await db.refresh(staff)
        return staff

    @staticmethod
    async def update_staff(
        db: AsyncSession, staff_id: uuid.UUID, data: StaffUpdate, current_user_id: uuid.UUID
    ) -> StaffModel:
        """Update staff member details. Checks for duplicate email if updated."""
        staff = await StaffService.get_staff(db, staff_id)

        if data.email and data.email != staff.email:
            existing = await StaffRepository.get_by_email(db, data.email)
            if existing:
                raise DuplicateError("メールアドレス", "email")

        updated_staff = await StaffRepository.update(db, staff, data)
        await db.refresh(updated_staff)
        return updated_staff

    @staticmethod
    async def delete_staff(db: AsyncSession, staff_id: uuid.UUID) -> None:
        """Delete a staff member or raise 404."""
        staff = await StaffService.get_staff(db, staff_id)
        await StaffRepository.delete(db, staff)

    # =============================================================================
    # Assignment Logic
    # =============================================================================

    @staticmethod
    async def list_genba_assignments(
        db: AsyncSession, genba_id: uuid.UUID
    ) -> Sequence[GenbaStaffAssignmentModel]:
        """List all staff assignments for a specific Genba worksite."""
        # Ensure Genba exists
        genba = await db.get(GenbaModel, genba_id)
        if not genba:
            raise NotFoundError("現場")

        stmt = select(GenbaStaffAssignmentModel).where(
            GenbaStaffAssignmentModel.genba_id == genba_id
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def assign_staff_to_genba(
        db: AsyncSession,
        genba_id: uuid.UUID,
        staff_id: uuid.UUID,
        role_type: str,
        current_user_id: uuid.UUID,
    ) -> GenbaStaffAssignmentModel:
        """
        Assign a staff member to a Genba worksite.
        
        Business Rules:
        - Genba and Staff must exist and Staff must be active.
        - Cannot duplicate the same staff-genba assignment.
        - If role_type is MAIN (primary responsible staff), check if a MAIN already exists.
        """
        # Ensure Genba exists
        genba = await db.get(GenbaModel, genba_id)
        if not genba:
            raise NotFoundError("現場")

        # Ensure Staff exists and is active
        staff = await StaffRepository.get_by_id(db, staff_id)
        if not staff:
            raise NotFoundError("担当者")
        if not staff.is_active:
            raise ConflictError("無効な担当者は割り当てられません。")

        # Check for existing assignment
        existing = await StaffRepository.get_assignment(db, genba_id, staff_id)
        if existing:
            raise ConflictError("この担当者はすでにこの現場に割り当てられています。")

        # Business Rule: Only one MAIN staff allowed per Genba
        if role_type == "MAIN":
            stmt = select(GenbaStaffAssignmentModel).where(
                and_(
                    GenbaStaffAssignmentModel.genba_id == genba_id,
                    GenbaStaffAssignmentModel.role_type == "MAIN",
                )
            )
            result = await db.execute(stmt)
            existing_main = result.scalar_one_or_none()
            if existing_main:
                raise ConflictError(
                    "代表担当者はすでに設定されています。変更する場合は先に既存の担当者を解除するか、役割を変更してください。"
                )

        assignment = await StaffRepository.assign_staff(db, genba_id, staff_id, role_type)
        return assignment

    @staticmethod
    async def unassign_staff_from_genba(
        db: AsyncSession,
        genba_id: uuid.UUID,
        staff_id: uuid.UUID,
        current_user_id: uuid.UUID,
    ) -> None:
        """Remove a staff assignment from a Genba worksite."""
        assignment = await StaffRepository.get_assignment(db, genba_id, staff_id)
        if not assignment:
            raise NotFoundError("割当情報")

        await StaffRepository.unassign_staff(db, assignment)

class PositionService:
    @staticmethod
    async def list_positions(db: AsyncSession) -> Sequence[PositionModel]:
        return await PositionRepository.list_positions(db)

    @staticmethod
    async def create_position(db: AsyncSession, data) -> PositionModel:
        existing = await PositionRepository.get_by_name(db, data.name)
        if existing:
            raise DuplicateError("役職名", "name")
        return await PositionRepository.create(db, data)
        
    @staticmethod
    async def update_position(db: AsyncSession, pos_id: uuid.UUID, data) -> PositionModel:
        pos = await PositionRepository.get_by_id(db, pos_id)
        if not pos:
            raise NotFoundError("役職")
        if data.name is not None and data.name != pos.name:
            existing = await PositionRepository.get_by_name(db, data.name)
            if existing:
                raise DuplicateError("役職名", "name")
        return await PositionRepository.update(db, pos, data)

    @staticmethod
    async def delete_position(db: AsyncSession, pos_id: uuid.UUID) -> None:
        pos = await PositionRepository.get_by_id(db, pos_id)
        if not pos:
            raise NotFoundError("役職")
        await PositionRepository.delete(db, pos)
