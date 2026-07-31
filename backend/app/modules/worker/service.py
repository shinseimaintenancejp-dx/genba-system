"""
Genba Management System — Worker Module: Service.

Business logic layer managing worker operations and assignments.
"""

import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.exceptions import ConflictError, NotFoundError, DuplicateError
from app.modules.worker.models import WorkerModel
from app.modules.genba.models import GenbaWorkerModel, GenbaModel
from app.modules.worker.repository import WorkerRepository
from app.modules.worker.schemas import WorkerCreate, WorkerUpdate


class WorkerService:
    """Service class encapsulating business rules for Worker management."""

    @staticmethod
    async def list_workers(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> tuple[Sequence[WorkerModel], int]:
        """List workers with filters and count."""
        return await WorkerRepository.list_workers(
            db, skip=skip, limit=limit, is_active=is_active, search_query=search_query
        )

    @staticmethod
    async def get_worker(db: AsyncSession, worker_id: uuid.UUID) -> WorkerModel:
        """Retrieve a worker or raise 404."""
        worker = await WorkerRepository.get_by_id(db, worker_id)
        if not worker:
            raise NotFoundError("現場員")
        return worker

    @staticmethod
    async def create_worker(db: AsyncSession, data: WorkerCreate, current_user_id: uuid.UUID) -> WorkerModel:
        """Create a new worker. Checks for duplicate email."""
        if data.email:
            existing = await WorkerRepository.get_by_email(db, data.email)
            if existing:
                raise DuplicateError("メールアドレス", "email")

        worker = await WorkerRepository.create(db, data)
        await db.refresh(worker)
        return worker

    @staticmethod
    async def update_worker(
        db: AsyncSession, worker_id: uuid.UUID, data: WorkerUpdate, current_user_id: uuid.UUID
    ) -> WorkerModel:
        """Update worker details. Checks for duplicate email if updated."""
        worker = await WorkerService.get_worker(db, worker_id)

        if data.email and data.email != worker.email:
            existing = await WorkerRepository.get_by_email(db, data.email)
            if existing:
                raise DuplicateError("メールアドレス", "email")

        updated_worker = await WorkerRepository.update(db, worker, data)
        await db.refresh(updated_worker)
        return updated_worker

    # =============================================================================
    # Assignment Logic
    # =============================================================================

    @staticmethod
    async def list_genba_workers(
        db: AsyncSession, genba_id: uuid.UUID, only_active: bool = True
    ) -> Sequence[GenbaWorkerModel]:
        """List worker assignments for a specific Genba worksite."""
        # Ensure Genba exists
        genba = await db.get(GenbaModel, genba_id)
        if not genba:
            raise NotFoundError("現場")

        stmt = select(GenbaWorkerModel).where(GenbaWorkerModel.genba_id == genba_id)
        if only_active:
            stmt = stmt.where(GenbaWorkerModel.is_active == True)

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def assign_worker_to_genba(
        db: AsyncSession,
        genba_id: uuid.UUID,
        worker_id: uuid.UUID,
        current_user_id: uuid.UUID,
    ) -> GenbaWorkerModel:
        """
        Assign a worker to a Genba worksite.
        
        Business Rules:
        - Genba and Worker must exist, and Worker must be active.
        - Cannot assign if already actively assigned.
        """
        # Ensure Genba exists
        genba = await db.get(GenbaModel, genba_id)
        if not genba:
            raise NotFoundError("現場")

        # Ensure Worker exists and is active
        worker = await WorkerRepository.get_by_id(db, worker_id)
        if not worker:
            raise NotFoundError("現場員")
        if not worker.is_active:
            raise ConflictError("無効な現場員は割り当てられません。")

        # Check for active assignment
        existing = await WorkerRepository.get_active_assignment(db, genba_id, worker_id)
        if existing:
            raise ConflictError("この現場員はすでにこの現場に割り当てられています。")

        assignment = await WorkerRepository.assign_worker(db, genba_id, worker_id)
        return assignment

    @staticmethod
    async def unassign_worker_from_genba(
        db: AsyncSession,
        genba_id: uuid.UUID,
        worker_id: uuid.UUID,
        current_user_id: uuid.UUID,
    ) -> GenbaWorkerModel:
        """Remove (deactivate) a worker assignment from a Genba worksite."""
        assignment = await WorkerRepository.get_active_assignment(db, genba_id, worker_id)
        if not assignment:
            raise NotFoundError("割当情報")

        deactivated = await WorkerRepository.deactivate_assignment(db, assignment)
        await db.refresh(deactivated)
        return deactivated
