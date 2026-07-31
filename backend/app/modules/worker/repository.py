"""
Genba Management System — Worker Module: Repository.

Data access layer using async SQLAlchemy 2.0.
"""

import uuid
from datetime import datetime, timezone
from typing import Sequence
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.worker.models import WorkerModel
from app.modules.genba.models import GenbaWorkerModel
from app.modules.worker.schemas import WorkerCreate, WorkerUpdate


class WorkerRepository:
    """Repository managing Worker and GenbaWorker database operations."""

    @staticmethod
    async def list_workers(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> tuple[Sequence[WorkerModel], int]:
        """List all workers with optional filters and count."""
        stmt = select(WorkerModel)
        count_stmt = select(WorkerModel)

        # Apply filters
        filters = []
        if is_active is not None:
            filters.append(WorkerModel.is_active == is_active)
        if search_query:
            search_pattern = f"%{search_query}%"
            filters.append(
                or_(
                    WorkerModel.full_name.ilike(search_pattern),
                    WorkerModel.email.ilike(search_pattern),
                    WorkerModel.phone.ilike(search_pattern),
                )
            )

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        # Ordering & Pagination
        stmt = stmt.order_by(WorkerModel.full_name).offset(skip).limit(limit)

        result = await db.execute(stmt)
        items = result.scalars().all()

        # Count query
        from sqlalchemy import func
        count_stmt = count_stmt.select_from(WorkerModel).scalar_subquery()
        total_result = await db.execute(select(func.count()).select_from(count_stmt))
        total = total_result.scalar() or 0

        return items, total

    @staticmethod
    async def get_by_id(db: AsyncSession, worker_id: uuid.UUID) -> WorkerModel | None:
        """Retrieve a worker by ID."""
        stmt = select(WorkerModel).where(WorkerModel.id == worker_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> WorkerModel | None:
        """Retrieve a worker by email."""
        stmt = select(WorkerModel).where(WorkerModel.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: WorkerCreate) -> WorkerModel:
        """Create a new worker."""
        worker = WorkerModel(
            full_name=data.full_name,
            phone=data.phone,
            email=data.email,
            birth_date=data.birth_date,
            notes=data.notes,
            is_active=True,
        )
        db.add(worker)
        await db.flush()
        return worker

    @staticmethod
    async def update(db: AsyncSession, worker: WorkerModel, data: WorkerUpdate) -> WorkerModel:
        """Update worker details."""
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(worker, key, value)
        await db.flush()
        return worker

    # =============================================================================
    # Genba Worker Assignment Operations
    # =============================================================================

    @staticmethod
    async def get_active_assignment(
        db: AsyncSession, genba_id: uuid.UUID, worker_id: uuid.UUID
    ) -> GenbaWorkerModel | None:
        """Retrieve an active assignment for a specific Genba worksite."""
        stmt = select(GenbaWorkerModel).where(
            and_(
                GenbaWorkerModel.genba_id == genba_id,
                GenbaWorkerModel.worker_id == worker_id,
                GenbaWorkerModel.is_active == True,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def assign_worker(
        db: AsyncSession, genba_id: uuid.UUID, worker_id: uuid.UUID
    ) -> GenbaWorkerModel:
        """Assign a worker to a Genba worksite."""
        assignment = GenbaWorkerModel(
            genba_id=genba_id,
            worker_id=worker_id,
            is_active=True,
        )
        db.add(assignment)
        await db.flush()
        
        stmt = select(GenbaWorkerModel).where(GenbaWorkerModel.id == assignment.id)
        result = await db.execute(stmt)
        return result.scalar_one()

    @staticmethod
    async def deactivate_assignment(
        db: AsyncSession, assignment: GenbaWorkerModel
    ) -> GenbaWorkerModel:
        """Deactivate a worker's active assignment."""
        assignment.is_active = False
        assignment.removed_at = datetime.now(timezone.utc)
        await db.flush()
        return assignment
