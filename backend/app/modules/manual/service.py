"""
Genba Management System — Manual Module: Service.

Business logic for manuals, daily cleaning tasks, and memos.
"""

import json
import logging
import os
import shutil
import uuid
from typing import Sequence
from datetime import datetime, timezone
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.audit import audit_service
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
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
from app.modules.manual.repository import (
    ManualRepository,
    CleaningAreaRepository,
    PeriodicWorkTypeRepository,
    DailyWorkTypeRepository,
    FrequencyRepository,
)
from app.modules.manual.schemas import (
    EntryExitUpsert,
    DailyCleaningTaskCreate,
    DailyCleaningTaskUpdate,
    CleaningAreaCreate,
    CleaningAreaUpdate,
    PeriodicWorkTypeCreate,
    PeriodicWorkTypeUpdate,
    MemoCreate,
    MemoUpdate,
    DailyWorkTypeCreate,
    DailyWorkTypeUpdate,
    FrequencyCreate,
    FrequencyUpdate,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")


class ManualService:
    """Service class encapsulating business operations for manuals and memos."""

    # ==========================================================================
    # Entry/Exit Instructions
    # ==========================================================================
    @staticmethod
    async def get_entry_exit(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> EntryExitInstructionModel:
        """Get entry/exit instruction by genba ID. If none exists, return an empty initialized model (do not error)."""
        instruction = await ManualRepository.get_entry_exit(db, genba_id)
        if not instruction:
            # Return a non-persisted skeleton so the UI is happy
            instruction = EntryExitInstructionModel(
                id=uuid.uuid4(),
                genba_id=genba_id,
                entry_method="",
                exit_method="",
                safety_notes="",
                updated_at=datetime.now(timezone.utc),
            )
        
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="entry_exit_instruction",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return instruction

    @staticmethod
    async def upsert_entry_exit(
        db: AsyncSession, genba_id: uuid.UUID, data: EntryExitUpsert, user_id: str
    ) -> EntryExitInstructionModel:
        """Upsert entry/exit instructions and log audit entry."""
        # Check if genba exists (cross-module validation can be done, or let foreign key error handle it.
        # But let's check it first to be safe)
        from app.modules.genba.repository import GenbaRepository
        genba = await GenbaRepository.get_by_id(db, genba_id)
        if not genba:
            raise NotFoundError("現場が見つかりません")

        old_instruction = await ManualRepository.get_entry_exit(db, genba_id)
        old_val = None
        if old_instruction:
            old_val = {
                "entry_method": old_instruction.entry_method,
                "exit_method": old_instruction.exit_method,
                "safety_notes": old_instruction.safety_notes,
            }

        instruction = await ManualRepository.upsert_entry_exit(db, genba_id, data)

        new_val = {
            "entry_method": instruction.entry_method,
            "exit_method": instruction.exit_method,
            "safety_notes": instruction.safety_notes,
        }

        await audit_service.log(
            session=db,
            action="UPDATE" if old_val else "CREATE",
            entity_type="entry_exit_instruction",
            entity_id=str(instruction.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False) if old_val else None,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return instruction

    # ==========================================================================
    # Daily Cleaning Tasks
    # ==========================================================================
    @staticmethod
    async def list_daily_tasks(
        db: AsyncSession, genba_id: uuid.UUID, day_of_week: str | None, user_id: str
    ) -> Sequence[DailyCleaningTaskModel]:
        """List daily cleaning tasks for a genba, optionally filtered by day of week."""
        tasks = await ManualRepository.get_daily_tasks(db, genba_id, day_of_week)
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="daily_cleaning_tasks",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return tasks

    @staticmethod
    async def get_daily_task(db: AsyncSession, task_id: uuid.UUID) -> DailyCleaningTaskModel:
        """Get daily cleaning task by ID, raises NotFoundError if not found."""
        task = await ManualRepository.get_daily_task_by_id(db, task_id)
        if not task:
            raise NotFoundError("日常清掃タスクが見つかりません")
        return task

    @staticmethod
    async def create_daily_task(
        db: AsyncSession, genba_id: uuid.UUID, data: DailyCleaningTaskCreate, user_id: str
    ) -> DailyCleaningTaskModel:
        """Create a new daily cleaning task and log audit entry."""
        from app.modules.genba.repository import GenbaRepository
        genba = await GenbaRepository.get_by_id(db, genba_id)
        if not genba:
            raise NotFoundError("現場が見つかりません")

        task = await ManualRepository.create_daily_task(db, genba_id, data)

        new_val = {
            "contents": [{"area_name": c.area_name, "work_content": c.work_content} for c in getattr(task, "contents", [])],
            "day_of_week": task.day_of_week,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="daily_cleaning_task",
            entity_id=str(task.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return task

    @staticmethod
    async def update_daily_task(
        db: AsyncSession, task_id: uuid.UUID, data: DailyCleaningTaskUpdate, user_id: str
    ) -> DailyCleaningTaskModel:
        """Update an existing daily cleaning task and log audit entry."""
        task = await ManualRepository.get_daily_task_by_id(db, task_id)
        if not task:
            raise NotFoundError("日常清掃タスクが見つかりません")

        old_val = {
            "contents": [{"area_name": c.area_name, "work_content": c.work_content} for c in getattr(task, "contents", [])],
            "day_of_week": task.day_of_week,
        }

        updated_task = await ManualRepository.update_daily_task(db, task, data)

        new_val = {
            "contents": [{"area_name": c.area_name, "work_content": c.work_content} for c in getattr(updated_task, "contents", [])],
            "day_of_week": updated_task.day_of_week,
        }

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="daily_cleaning_task",
            entity_id=str(updated_task.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated_task

    @staticmethod
    async def delete_daily_task(db: AsyncSession, task_id: uuid.UUID, user_id: str) -> None:
        """Delete a daily cleaning task and log audit entry."""
        task = await ManualRepository.get_daily_task_by_id(db, task_id)
        if not task:
            raise NotFoundError("日常清掃タスクが見つかりません")

        old_val = {
            "contents": [{"area_name": c.area_name, "work_content": c.work_content} for c in getattr(task, "contents", [])],
            "day_of_week": task.day_of_week,
        }

        await ManualRepository.delete_daily_task(db, task)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="daily_cleaning_task",
            entity_id=str(task_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )

    # ==========================================================================
    # Memos
    # ==========================================================================
    @staticmethod
    async def list_memos_paginated(
        db: AsyncSession, genba_id: uuid.UUID, page: int, limit: int, user_id: str
    ) -> tuple[Sequence[MemoModel], int]:
        """List memos for a genba with pagination, ordered by date DESC."""
        items, total = await ManualRepository.get_memos_paginated(db, genba_id, page, limit)
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="memos",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return items, total

    @staticmethod
    async def get_memo(db: AsyncSession, memo_id: uuid.UUID) -> MemoModel:
        """Get memo by ID, raises NotFoundError if not found."""
        memo = await ManualRepository.get_memo_by_id(db, memo_id)
        if not memo:
            raise NotFoundError("メモが見つかりません")
        return memo

    @staticmethod
    async def create_memo(
        db: AsyncSession, genba_id: uuid.UUID, creator_id: uuid.UUID, data: MemoCreate, user_id: str
    ) -> MemoModel:
        """Create a new memo and log audit entry."""
        from app.modules.genba.repository import GenbaRepository
        genba = await GenbaRepository.get_by_id(db, genba_id)
        if not genba:
            raise NotFoundError("現場が見つかりません")

        memo = await ManualRepository.create_memo(db, genba_id, creator_id, data)

        new_val = {
            "memo_date": memo.memo_date.isoformat(),
            "content": memo.content,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="memo",
            entity_id=str(memo.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return memo

    @staticmethod
    async def update_memo(
        db: AsyncSession, memo_id: uuid.UUID, data: MemoUpdate, user_id: str
    ) -> MemoModel:
        """Update an existing memo and log audit entry."""
        memo = await ManualRepository.get_memo_by_id(db, memo_id)
        if not memo:
            raise NotFoundError("メモが見つかりません")

        old_val = {
            "memo_date": memo.memo_date.isoformat(),
            "content": memo.content,
        }

        updated_memo = await ManualRepository.update_memo(db, memo, data)

        new_val = {
            "memo_date": updated_memo.memo_date.isoformat(),
            "content": updated_memo.content,
        }

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="memo",
            entity_id=str(updated_memo.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated_memo

    @staticmethod
    async def delete_memo(db: AsyncSession, memo_id: uuid.UUID, user_id: str) -> None:
        """Delete a memo and log audit entry."""
        memo = await ManualRepository.get_memo_by_id(db, memo_id)
        if not memo:
            raise NotFoundError("メモが見つかりません")

        # Deleting memo will automatically delete attachments physically
        for attachment in memo.attachments:
            # Remove physical file if local
            try:
                # Resolve local filename from url /uploads/{unique_name}
                file_name = os.path.basename(attachment.file_url)
                file_path = os.path.join(UPLOAD_DIR, file_name)
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.error(f"Failed to delete physical file {attachment.file_url}: {e}")

        old_val = {
            "memo_date": memo.memo_date.isoformat(),
            "content": memo.content,
        }

        await ManualRepository.delete_memo(db, memo)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="memo",
            entity_id=str(memo_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )

    # ==========================================================================
    # Memo Attachments
    # ==========================================================================
    @staticmethod
    async def add_attachment(
        db: AsyncSession, memo_id: uuid.UUID, file: UploadFile, user_id: str
    ) -> MemoAttachmentModel:
        """Upload file locally and add attachment link to memo."""
        memo = await ManualRepository.get_memo_by_id(db, memo_id)
        if not memo:
            raise NotFoundError("メモが見つかりません")

        # Save file locally
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_id = uuid.uuid4()
        original_name = file.filename or "attachment"
        ext = os.path.splitext(original_name)[1].lower()

        # Security: Whitelist allowed file extensions to prevent malicious upload (RCE, XSS)
        ALLOWED_EXTENSIONS = {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
            ".png", ".jpg", ".jpeg", ".gif", ".txt"
        }
        if ext not in ALLOWED_EXTENSIONS:
            from app.core.exceptions import ValidationError
            raise ValidationError(
                field="file",
                issue=f"許可されていないファイル形式です。({', '.join(sorted(ALLOWED_EXTENSIONS))}のみ許可)"
            )

        unique_filename = f"{file_id}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Calculate size
        file_size = os.path.getsize(dest_path)
        file_type = file.content_type

        # File URL will be served locally
        file_url = f"/uploads/{unique_filename}"

        attachment = await ManualRepository.create_attachment(
            db=db,
            memo_id=memo_id,
            file_name=original_name,
            file_url=file_url,
            file_size=file_size,
            file_type=file_type,
        )

        new_val = {
            "file_name": original_name,
            "file_url": file_url,
            "file_size": file_size,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="memo_attachment",
            entity_id=str(attachment.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )


        return attachment

    @staticmethod
    async def delete_attachment(db: AsyncSession, attachment_id: uuid.UUID, user_id: str) -> None:
        """Delete an attachment, physically removing it from local storage, and log audit."""
        attachment = await ManualRepository.get_attachment_by_id(db, attachment_id)
        if not attachment:
            raise NotFoundError("添付ファイルが見つかりません")

        # Physically delete the file
        try:
            file_name = os.path.basename(attachment.file_url)
            file_path = os.path.join(UPLOAD_DIR, file_name)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"Failed to delete physical file {attachment.file_url}: {e}")

        old_val = {
            "file_name": attachment.file_name,
            "file_url": attachment.file_url,
        }

        await ManualRepository.delete_attachment(db, attachment)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="memo_attachment",
            entity_id=str(attachment_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )


class CleaningAreaService:
    """Service class for Cleaning Area master CRUD with business logic."""

    @staticmethod
    async def get_all(db: AsyncSession) -> list[CleaningAreaModel]:
        """Return all active cleaning areas."""
        result = await CleaningAreaRepository.get_all(db)
        return list(result)

    @staticmethod
    async def create(
        db: AsyncSession, data: CleaningAreaCreate, user_id: str
    ) -> CleaningAreaModel:
        """Create a cleaning area, ensuring no duplicate name."""
        # Find if it exists (active or inactive) to handle unique constraints and reactivation
        result = await db.execute(
            select(CleaningAreaModel).where(CleaningAreaModel.name == data.name)
        )
        existing = result.scalar_one_or_none()

        if existing:
            if existing.is_active:
                return existing
            else:
                existing.is_active = True
                existing.sort_order = data.sort_order
                existing.updated_at = datetime.now(timezone.utc)
                await db.flush()
                await audit_service.log(
                    session=db,
                    action="UPDATE",
                    entity_type="cleaning_area",
                    entity_id=str(existing.id),
                    user_id=user_id,
                    new_value=json.dumps({"name": existing.name, "is_active": True}, ensure_ascii=False),
                )
                return existing

        area = await CleaningAreaRepository.create(db, data)
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="cleaning_area",
            entity_id=str(area.id),
            user_id=user_id,
            new_value=json.dumps({"name": area.name}, ensure_ascii=False),
        )
        return area

    @staticmethod
    async def update(
        db: AsyncSession, area_id: uuid.UUID, data: CleaningAreaUpdate, user_id: str
    ) -> CleaningAreaModel:
        """Update a cleaning area entry."""
        area = await CleaningAreaRepository.get_by_id(db, area_id)
        if not area:
            raise NotFoundError("エリアが見つかりません")

        # Check duplicate name (excluding itself)
        if data.name and data.name != area.name:
            existing = await CleaningAreaRepository.get_by_name(db, data.name)
            if existing:
                raise ValidationError("name", f"エリア名'{data.name}'は既に存在しています。")

        old_val = {"name": area.name}
        updated = await CleaningAreaRepository.update(db, area, data)
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="cleaning_area",
            entity_id=str(area_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps({"name": updated.name}, ensure_ascii=False),
        )
        return updated

    @staticmethod
    async def delete(
        db: AsyncSession, area_id: uuid.UUID, user_id: str
    ) -> None:
        """Soft-delete a cleaning area."""
        area = await CleaningAreaRepository.get_by_id(db, area_id)
        if not area:
            raise NotFoundError("エリアが見つかりません")

        old_val = {"name": area.name}
        await CleaningAreaRepository.delete(db, area)
        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="cleaning_area",
            entity_id=str(area_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )


class PeriodicWorkTypeService:
    """Service class for Periodic Work Type Master CRUD."""

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[PeriodicWorkTypeModel]:
        return await PeriodicWorkTypeRepository.get_all(db)

    @staticmethod
    async def get_by_id(db: AsyncSession, type_id: uuid.UUID) -> PeriodicWorkTypeModel:
        work_type = await PeriodicWorkTypeRepository.get_by_id(db, type_id)
        if not work_type:
            raise NotFoundError("Periodic Work Type not found")
        return work_type

    @staticmethod
    async def create(db: AsyncSession, data: PeriodicWorkTypeCreate) -> PeriodicWorkTypeModel:
        existing = await PeriodicWorkTypeRepository.get_by_name(db, data.name)
        if existing:
            if existing.is_active:
                raise ValidationError("name", "この作業内容は既に存在します。")
            else:
                existing.is_active = True
                if data.sort_order is not None and data.sort_order > 0:
                    existing.sort_order = data.sort_order
                await db.flush()
                await db.refresh(existing)
                return existing

        if data.sort_order is None or data.sort_order == 0:
            all_types = await PeriodicWorkTypeRepository.get_all(db)
            data.sort_order = (max([t.sort_order for t in all_types], default=0) + 10)

        return await PeriodicWorkTypeRepository.create(db, data)

    @staticmethod
    async def update(
        db: AsyncSession, type_id: uuid.UUID, data: PeriodicWorkTypeUpdate
    ) -> PeriodicWorkTypeModel:
        work_type = await PeriodicWorkTypeRepository.get_by_id(db, type_id)
        if not work_type:
            raise NotFoundError("Periodic Work Type not found")

        # Check duplicate name if changing
        if data.name is not None and data.name != work_type.name:
            existing = await PeriodicWorkTypeRepository.get_by_name(db, data.name)
            if existing:
                raise ValidationError("name", "この作業内容は既に存在します。")

        return await PeriodicWorkTypeRepository.update(db, work_type, data)

    @staticmethod
    async def delete(db: AsyncSession, type_id: uuid.UUID) -> None:
        work_type = await PeriodicWorkTypeRepository.get_by_id(db, type_id)
        if not work_type:
            raise NotFoundError("Periodic Work Type not found")

        await PeriodicWorkTypeRepository.delete(db, work_type)


class DailyWorkTypeService:
    """Service class for Daily Work Type Master CRUD."""

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[DailyWorkTypeModel]:
        return await DailyWorkTypeRepository.get_all(db)

    @staticmethod
    async def get_by_id(db: AsyncSession, type_id: uuid.UUID) -> DailyWorkTypeModel:
        work_type = await DailyWorkTypeRepository.get_by_id(db, type_id)
        if not work_type:
            raise NotFoundError("Daily Work Type not found")
        return work_type

    @staticmethod
    async def create(db: AsyncSession, data: DailyWorkTypeCreate) -> DailyWorkTypeModel:
        existing = await DailyWorkTypeRepository.get_by_name(db, data.name)
        if existing:
            if existing.is_active:
                raise ValidationError("name", "この作業内容は既に存在します。")
            else:
                existing.is_active = True
                if data.sort_order is not None and data.sort_order > 0:
                    existing.sort_order = data.sort_order
                await db.flush()
                await db.refresh(existing)
                return existing

        if data.sort_order == 0 or data.sort_order is None:
            all_types = await DailyWorkTypeRepository.get_all(db)
            data.sort_order = (max([t.sort_order for t in all_types], default=0) + 10)

        return await DailyWorkTypeRepository.create(db, data)

    @staticmethod
    async def update(
        db: AsyncSession, type_id: uuid.UUID, data: DailyWorkTypeUpdate
    ) -> DailyWorkTypeModel:
        work_type = await DailyWorkTypeRepository.get_by_id(db, type_id)
        if not work_type:
            raise NotFoundError("Daily Work Type not found")

        if data.name is not None and data.name != work_type.name:
            existing = await DailyWorkTypeRepository.get_by_name(db, data.name)
            if existing:
                raise ValidationError("name", "この作業内容は既に存在します。")

        return await DailyWorkTypeRepository.update(db, work_type, data)

    @staticmethod
    async def delete(db: AsyncSession, type_id: uuid.UUID) -> None:
        work_type = await DailyWorkTypeRepository.get_by_id(db, type_id)
        if not work_type:
            raise NotFoundError("Daily Work Type not found")

        await DailyWorkTypeRepository.delete(db, work_type)


class FrequencyService:
    """Service class for Frequency Master CRUD."""

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[FrequencyModel]:
        return await FrequencyRepository.get_all(db)

    @staticmethod
    async def get_by_id(db: AsyncSession, freq_id: uuid.UUID) -> FrequencyModel:
        freq = await FrequencyRepository.get_by_id(db, freq_id)
        if not freq:
            raise NotFoundError("Frequency not found")
        return freq

    @staticmethod
    async def create(db: AsyncSession, data: FrequencyCreate) -> FrequencyModel:
        existing = await FrequencyRepository.get_by_name(db, data.name)
        if existing:
            if existing.is_active:
                raise ValidationError("name", "この頻度は既に存在します。")
            else:
                existing.is_active = True
                if data.sort_order is not None and data.sort_order > 0:
                    existing.sort_order = data.sort_order
                await db.flush()
                await db.refresh(existing)
                return existing

        if data.sort_order == 0 or data.sort_order is None:
            all_freqs = await FrequencyRepository.get_all(db)
            data.sort_order = (max([f.sort_order for f in all_freqs], default=0) + 10)

        return await FrequencyRepository.create(db, data)

    @staticmethod
    async def update(
        db: AsyncSession, freq_id: uuid.UUID, data: FrequencyUpdate
    ) -> FrequencyModel:
        freq = await FrequencyRepository.get_by_id(db, freq_id)
        if not freq:
            raise NotFoundError("Frequency not found")

        if data.name is not None and data.name != freq.name:
            existing = await FrequencyRepository.get_by_name(db, data.name)
            if existing:
                raise ValidationError("name", "この頻度は既に存在します。")

        return await FrequencyRepository.update(db, freq, data)

    @staticmethod
    async def delete(db: AsyncSession, freq_id: uuid.UUID) -> None:
        freq = await FrequencyRepository.get_by_id(db, freq_id)
        if not freq:
            raise NotFoundError("Frequency not found")

        await FrequencyRepository.delete(db, freq)
