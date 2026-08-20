"""
Genba Management System — Manual Module: Repository.

Handles database operations for:
- Entry/Exit Instructions
- Daily Cleaning Tasks
- CleaningAreas (master data)
- Memos
- Memo Attachments
"""

import uuid
from typing import Sequence
from datetime import datetime, timezone
from sqlalchemy import select, func, or_, delete, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.manual.models import (
    EntryExitInstructionModel,
    DailyCleaningTaskModel,
    CleaningAreaModel,
    MemoModel,
    MemoAttachmentModel,
    PeriodicWorkTypeModel,
    DailyWorkTypeModel,
    FrequencyModel,
)
from app.modules.manual.schemas import (
    EntryExitUpsert,
    DailyCleaningTaskCreate,
    DailyCleaningTaskUpdate,
    CleaningAreaCreate,
    CleaningAreaUpdate,
    PeriodicWorkTypeCreate,
    PeriodicWorkTypeUpdate,
    DailyWorkTypeCreate,
    DailyWorkTypeUpdate,
    FrequencyCreate,
    FrequencyUpdate,
    MemoCreate,
    MemoUpdate,
)


class ManualRepository:
    """Repository class for handling DB operations for manuals and memos."""

    # ==========================================================================
    # Entry/Exit Instructions (1:1 with Genba)
    # ==========================================================================
    @staticmethod
    async def get_entry_exit(db: AsyncSession, genba_id: uuid.UUID) -> EntryExitInstructionModel | None:
        """Retrieve entry/exit instruction by genba ID."""
        result = await db.execute(
            select(EntryExitInstructionModel).where(EntryExitInstructionModel.genba_id == genba_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def upsert_entry_exit(
        db: AsyncSession, genba_id: uuid.UUID, data: EntryExitUpsert
    ) -> EntryExitInstructionModel:
        """Create or update entry/exit instruction for a genba using ON CONFLICT DO UPDATE to avoid race conditions."""
        from sqlalchemy.dialects.postgresql import insert

        stmt = insert(EntryExitInstructionModel).values(
            genba_id=genba_id,
            entry_method=data.entry_method,
            exit_method=data.exit_method,
            safety_notes=data.safety_notes,
            updated_at=datetime.now(timezone.utc),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["genba_id"],
            set_={
                "entry_method": stmt.excluded.entry_method,
                "exit_method": stmt.excluded.exit_method,
                "safety_notes": stmt.excluded.safety_notes,
                "updated_at": stmt.excluded.updated_at,
            },
        )
        await db.execute(stmt)
        await db.flush()

        result = await db.execute(
            select(EntryExitInstructionModel).where(EntryExitInstructionModel.genba_id == genba_id)
        )
        instruction = result.scalar_one()
        await db.refresh(instruction)
        return instruction

    # ==========================================================================
    # Daily Cleaning Tasks (N:1 with Genba)
    # ==========================================================================
    @staticmethod
    async def get_daily_tasks(
        db: AsyncSession, genba_id: uuid.UUID, day_of_week: str | None = None
    ) -> Sequence[DailyCleaningTaskModel]:
        """Retrieve all daily cleaning tasks for a genba, optionally filtered by day of week."""
        query = select(DailyCleaningTaskModel).where(DailyCleaningTaskModel.genba_id == genba_id)
        if day_of_week:
            # Match both specific day of week and general/everyday tasks (day_of_week IS NULL)
            query = query.where(
                or_(
                    DailyCleaningTaskModel.day_of_week == day_of_week,
                    DailyCleaningTaskModel.day_of_week.is_(None),
                )
            )
        # Sort by start_time
        query = query.order_by(DailyCleaningTaskModel.start_time)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_daily_task_by_id(db: AsyncSession, task_id: uuid.UUID) -> DailyCleaningTaskModel | None:
        """Retrieve a single daily cleaning task by ID."""
        result = await db.execute(
            select(DailyCleaningTaskModel).where(DailyCleaningTaskModel.id == task_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_daily_task(
        db: AsyncSession, genba_id: uuid.UUID, data: DailyCleaningTaskCreate
    ) -> DailyCleaningTaskModel:
        """Create a new daily cleaning task."""
        from app.modules.manual.models import DailyCleaningTaskContentModel
        
        task = DailyCleaningTaskModel(
            genba_id=genba_id,
            contract_id=data.contract_id,
            day_of_week=data.day_of_week,
            start_time=data.start_time,
            floor=data.floor,
            special_notes=data.special_notes,
        )
        db.add(task)
        await db.flush()
        
        # Add contents
        for idx, content_data in enumerate(data.contents):
            content = DailyCleaningTaskContentModel(
                task_id=task.id,
                area_name=content_data.area_name,
                work_content=content_data.work_content,
                sort_order=content_data.sort_order if content_data.sort_order > 0 else idx,
            )
            db.add(content)
            
        await db.flush()
        await db.refresh(task, ["contract", "contents"])
        return task

    @staticmethod
    async def update_daily_task(
        db: AsyncSession, task: DailyCleaningTaskModel, data: DailyCleaningTaskUpdate
    ) -> DailyCleaningTaskModel:
        """Update an existing daily cleaning task."""
        from app.modules.manual.models import DailyCleaningTaskContentModel
        
        if "contract_id" in data.model_fields_set:
            task.contract_id = data.contract_id
        if data.day_of_week is not None:
            task.day_of_week = data.day_of_week
        if data.start_time is not None:
            task.start_time = data.start_time
        if data.floor is not None:
            task.floor = data.floor
        if data.special_notes is not None:
            task.special_notes = data.special_notes

        if data.contents is not None:
            # Drop old contents
            await db.execute(
                delete(DailyCleaningTaskContentModel).where(DailyCleaningTaskContentModel.task_id == task.id)
            )
            # Add new contents
            for idx, content_data in enumerate(data.contents):
                content = DailyCleaningTaskContentModel(
                    task_id=task.id,
                    area_name=content_data.area_name,
                    work_content=content_data.work_content,
                    sort_order=content_data.sort_order if content_data.sort_order > 0 else idx,
                )
                db.add(content)

        task.updated_at = datetime.now(timezone.utc)
        await db.flush()
        db.expire(task, ["contents"])
        await db.refresh(task, ["contract", "contents"])
        return task

    @staticmethod
    async def delete_daily_task(db: AsyncSession, task: DailyCleaningTaskModel) -> None:
        """Delete a daily cleaning task."""
        await db.delete(task)
        await db.flush()

    # ==========================================================================
    # Memos (N:1 with Genba)
    # ==========================================================================
    @staticmethod
    async def get_memos_paginated(
        db: AsyncSession, genba_id: uuid.UUID, page: int = 1, limit: int = 20
    ) -> tuple[Sequence[MemoModel], int]:
        """Retrieve paginated memos for a genba, ordered by memo_date DESC."""
        # Count total
        count_query = select(func.count(MemoModel.id)).where(MemoModel.genba_id == genba_id)
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Select data
        offset = (page - 1) * limit
        query = (
            select(MemoModel)
            .where(MemoModel.genba_id == genba_id)
            .options(
                selectinload(MemoModel.creator),
                selectinload(MemoModel.attachments)
            )
            .order_by(MemoModel.memo_date.desc(), MemoModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        memos = result.scalars().all()
        return memos, total

    @staticmethod
    async def get_memo_by_id(db: AsyncSession, memo_id: uuid.UUID) -> MemoModel | None:
        """Retrieve a single memo by ID."""
        result = await db.execute(
            select(MemoModel)
            .where(MemoModel.id == memo_id)
            .options(
                selectinload(MemoModel.creator),
                selectinload(MemoModel.attachments)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_memo(
        db: AsyncSession, genba_id: uuid.UUID, creator_id: uuid.UUID | None, data: MemoCreate
    ) -> MemoModel:
        """Create a new memo."""
        memo = MemoModel(
            genba_id=genba_id,
            memo_date=data.memo_date,
            content=data.content,
            created_by=creator_id,
        )
        db.add(memo)
        await db.flush()

        result = await db.execute(
            select(MemoModel)
            .where(MemoModel.id == memo.id)
            .options(
                selectinload(MemoModel.creator),
                selectinload(MemoModel.attachments)
            )
        )
        return result.scalar_one()

    @staticmethod
    async def update_memo(db: AsyncSession, memo: MemoModel, data: MemoUpdate) -> MemoModel:
        """Update an existing memo."""
        if data.memo_date is not None:
            memo.memo_date = data.memo_date
        if data.content is not None:
            memo.content = data.content

        memo.updated_at = datetime.now(timezone.utc)
        await db.flush()

        result = await db.execute(
            select(MemoModel)
            .where(MemoModel.id == memo.id)
            .options(
                selectinload(MemoModel.creator),
                selectinload(MemoModel.attachments)
            )
        )
        return result.scalar_one()

    @staticmethod
    async def delete_memo(db: AsyncSession, memo: MemoModel) -> None:
        """Delete a memo."""
        await db.delete(memo)
        await db.flush()

    # ==========================================================================
    # Memo Attachments (N:1 with Memo)
    # ==========================================================================
    @staticmethod
    async def create_attachment(
        db: AsyncSession,
        memo_id: uuid.UUID,
        file_name: str,
        file_url: str,
        file_size: int | None,
        file_type: str | None,
    ) -> MemoAttachmentModel:
        """Create a new memo attachment."""
        attachment = MemoAttachmentModel(
            memo_id=memo_id,
            file_name=file_name,
            file_url=file_url,
            file_size=file_size,
            file_type=file_type,
        )
        db.add(attachment)
        await db.flush()
        return attachment

    @staticmethod
    async def get_attachment_by_id(db: AsyncSession, attachment_id: uuid.UUID) -> MemoAttachmentModel | None:
        """Retrieve a single memo attachment by ID."""
        result = await db.execute(
            select(MemoAttachmentModel).where(MemoAttachmentModel.id == attachment_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_attachment(db: AsyncSession, attachment: MemoAttachmentModel) -> None:
        """Delete a memo attachment."""
        await db.delete(attachment)
        await db.flush()


class CleaningAreaRepository:
    """Repository class for Cleaning Area master CRUD operations."""

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[CleaningAreaModel]:
        """Retrieve all active cleaning areas ordered by usage_count desc, name asc."""
        from app.modules.contract.models import ContractDailyWorkContentModel, ContractPeriodicWorkContentModel
        from app.modules.manual.models import DailyCleaningTaskContentModel
        
        c_daily_sq = select(func.count(ContractDailyWorkContentModel.id)).where(ContractDailyWorkContentModel.area == CleaningAreaModel.name).scalar_subquery()
        c_periodic_sq = select(func.count(ContractPeriodicWorkContentModel.id)).where(ContractPeriodicWorkContentModel.area == CleaningAreaModel.name).scalar_subquery()
        m_daily_sq = select(func.count(DailyCleaningTaskContentModel.id)).where(DailyCleaningTaskContentModel.area_name == CleaningAreaModel.name).scalar_subquery()

        stmt = select(CleaningAreaModel).where(CleaningAreaModel.is_active == True).order_by(
            desc(func.coalesce(c_daily_sq, 0) + func.coalesce(c_periodic_sq, 0) + func.coalesce(m_daily_sq, 0)),
            asc(CleaningAreaModel.name)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, area_id: uuid.UUID) -> CleaningAreaModel | None:
        """Retrieve a single cleaning area by ID."""
        result = await db.execute(
            select(CleaningAreaModel).where(CleaningAreaModel.id == area_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> CleaningAreaModel | None:
        """Retrieve a cleaning area by exact name (for duplicate check)."""
        result = await db.execute(
            select(CleaningAreaModel).where(CleaningAreaModel.name == name)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: CleaningAreaCreate) -> CleaningAreaModel:
        """Create a new cleaning area master entry."""
        area = CleaningAreaModel(
            name=data.name,
            sort_order=data.sort_order,
        )
        db.add(area)
        await db.flush()
        await db.refresh(area)
        return area

    @staticmethod
    async def update(
        db: AsyncSession, area: CleaningAreaModel, data: CleaningAreaUpdate
    ) -> CleaningAreaModel:
        """Update an existing cleaning area entry."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(area, field, value)
        area.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(area)
        return area

    @staticmethod
    async def delete(db: AsyncSession, area: CleaningAreaModel) -> None:
        """Soft-delete a cleaning area by deactivating it."""
        area.is_active = False
        area.updated_at = datetime.now(timezone.utc)
        await db.flush()


class PeriodicWorkTypeRepository:
    """Repository class for Periodic Work Type master CRUD operations."""

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[PeriodicWorkTypeModel]:
        """Retrieve all active periodic work types ordered by sort_order."""
        result = await db.execute(
            select(PeriodicWorkTypeModel)
            .where(PeriodicWorkTypeModel.is_active == True)  # noqa: E712
            .order_by(PeriodicWorkTypeModel.sort_order, PeriodicWorkTypeModel.name)
        )
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, type_id: uuid.UUID) -> PeriodicWorkTypeModel | None:
        """Retrieve a single periodic work type by ID."""
        result = await db.execute(
            select(PeriodicWorkTypeModel).where(PeriodicWorkTypeModel.id == type_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> PeriodicWorkTypeModel | None:
        """Retrieve a periodic work type by exact name (for duplicate check)."""
        result = await db.execute(
            select(PeriodicWorkTypeModel).where(PeriodicWorkTypeModel.name == name)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: PeriodicWorkTypeCreate) -> PeriodicWorkTypeModel:
        """Create a new periodic work type master entry."""
        work_type = PeriodicWorkTypeModel(
            name=data.name,
            sort_order=data.sort_order,
        )
        db.add(work_type)
        await db.flush()
        await db.refresh(work_type)
        return work_type

    @staticmethod
    async def update(
        db: AsyncSession, work_type: PeriodicWorkTypeModel, data: PeriodicWorkTypeUpdate
    ) -> PeriodicWorkTypeModel:
        """Update an existing periodic work type entry."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work_type, field, value)
        work_type.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(work_type)
        return work_type

    @staticmethod
    async def delete(db: AsyncSession, work_type: PeriodicWorkTypeModel) -> None:
        """Soft-delete a periodic work type by deactivating it."""
        work_type.is_active = False
        work_type.updated_at = datetime.now(timezone.utc)
        await db.flush()


class DailyWorkTypeRepository:
    """Repository class for Daily Work Type master CRUD operations."""

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[DailyWorkTypeModel]:
        from app.modules.contract.models import ContractDailyWorkContentModel
        from app.modules.manual.models import DailyCleaningTaskContentModel
        
        contract_sq = select(func.count(ContractDailyWorkContentModel.id)).where(ContractDailyWorkContentModel.work_content == DailyWorkTypeModel.name).scalar_subquery()
        manual_sq = select(func.count(DailyCleaningTaskContentModel.id)).where(DailyCleaningTaskContentModel.work_content == DailyWorkTypeModel.name).scalar_subquery()

        stmt = select(DailyWorkTypeModel).where(DailyWorkTypeModel.is_active == True).order_by(
            desc(func.coalesce(contract_sq, 0) + func.coalesce(manual_sq, 0)),
            asc(DailyWorkTypeModel.name)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, type_id: uuid.UUID) -> DailyWorkTypeModel | None:
        result = await db.execute(
            select(DailyWorkTypeModel).where(DailyWorkTypeModel.id == type_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> DailyWorkTypeModel | None:
        result = await db.execute(
            select(DailyWorkTypeModel).where(DailyWorkTypeModel.name == name)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: DailyWorkTypeCreate) -> DailyWorkTypeModel:
        work_type = DailyWorkTypeModel(
            name=data.name,
            sort_order=data.sort_order,
        )
        db.add(work_type)
        await db.flush()
        await db.refresh(work_type)
        return work_type

    @staticmethod
    async def update(
        db: AsyncSession, work_type: DailyWorkTypeModel, data: DailyWorkTypeUpdate
    ) -> DailyWorkTypeModel:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work_type, field, value)
        work_type.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(work_type)
        return work_type

    @staticmethod
    async def delete(db: AsyncSession, work_type: DailyWorkTypeModel) -> None:
        work_type.is_active = False
        work_type.updated_at = datetime.now(timezone.utc)
        await db.flush()


class FrequencyRepository:
    """Repository class for Frequency master CRUD operations."""

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[FrequencyModel]:
        from app.modules.contract.models import ContractDailyWorkContentModel
        
        contract_sq = select(func.count(ContractDailyWorkContentModel.id)).where(ContractDailyWorkContentModel.frequency == FrequencyModel.name).scalar_subquery()

        stmt = select(FrequencyModel).where(FrequencyModel.is_active == True).order_by(
            desc(func.coalesce(contract_sq, 0)),
            asc(FrequencyModel.name)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, freq_id: uuid.UUID) -> FrequencyModel | None:
        result = await db.execute(
            select(FrequencyModel).where(FrequencyModel.id == freq_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> FrequencyModel | None:
        result = await db.execute(
            select(FrequencyModel).where(FrequencyModel.name == name)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: FrequencyCreate) -> FrequencyModel:
        freq = FrequencyModel(
            name=data.name,
            sort_order=data.sort_order,
        )
        db.add(freq)
        await db.flush()
        await db.refresh(freq)
        return freq

    @staticmethod
    async def update(
        db: AsyncSession, freq: FrequencyModel, data: FrequencyUpdate
    ) -> FrequencyModel:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(freq, field, value)
        freq.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(freq)
        return freq

    @staticmethod
    async def delete(db: AsyncSession, freq: FrequencyModel) -> None:
        freq.is_active = False
        freq.updated_at = datetime.now(timezone.utc)
        await db.flush()
