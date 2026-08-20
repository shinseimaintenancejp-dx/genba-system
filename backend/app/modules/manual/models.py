"""
Genba Management System — Manual Module: SQLAlchemy Models.

Defines:
- EntryExitInstructionModel (1:1 with Genba)
- DailyCleaningTaskModel (N:1 with Genba)
- CleaningAreaModel (master table for area/location names)
- MemoModel (N:1 with Genba)
- MemoAttachmentModel (N:1 with Memo)
"""

import uuid
from datetime import date, datetime, time, timezone
from typing import List

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Time, text, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EntryExitInstructionModel(Base):
    """
    Entry/Exit Instructions (入退館手順) for a worksite.
    1:1 relationship with Genba.
    """

    __tablename__ = "entry_exit_instructions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    genba_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    entry_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    safety_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    genba: Mapped["GenbaModel"] = relationship(
        "GenbaModel",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"EntryExitInstruction(id={self.id}, genba_id={self.genba_id})"


class DailyCleaningTaskModel(Base):
    """Daily Cleaning Task Model (日常マニュアルタスク)."""

    __tablename__ = "daily_cleaning_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    genba_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contract_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    day_of_week: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )  # None = Everyday, or comma-separated e.g. "月,火,水"
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)  # Optional
    floor: Mapped[str | None] = mapped_column(String(50), nullable=True)
    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # 関連
    genba = relationship("GenbaModel", backref="daily_cleaning_tasks", lazy="selectin")
    contract = relationship("ContractModel", backref="daily_cleaning_tasks", lazy="selectin")
    contents: Mapped[list["DailyCleaningTaskContentModel"]] = relationship(
        "DailyCleaningTaskContentModel",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="DailyCleaningTaskContentModel.sort_order",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"DailyCleaningTask(id={self.id}, genba_id={self.genba_id}, contract_id={self.contract_id})"


class DailyCleaningTaskContentModel(Base):
    """Daily Cleaning Task Content Model (日常マニュアル作業内容)."""

    __tablename__ = "daily_cleaning_task_contents"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("daily_cleaning_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    area_name: Mapped[str] = mapped_column(String(500), nullable=False)
    work_content: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    task = relationship("DailyCleaningTaskModel", back_populates="contents")

    def __repr__(self) -> str:
        return f"DailyCleaningTaskContent(id={self.id}, task_id={self.task_id})"



class CleaningAreaModel(Base):
    """
    Cleaning Area Master Table (清掃エリアマスター).
    Global list of area/location names available system-wide.
    """

    __tablename__ = "m_cleaning_areas"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"CleaningArea(id={self.id}, name={self.name})"


class DailyWorkTypeModel(Base):
    """
    Daily Cleaning Work Type Master Table (日常清掃仕様マスター).
    Global list of daily cleaning specification names available system-wide.
    """

    __tablename__ = "m_daily_work_types"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"DailyWorkType(id={self.id}, name={self.name})"


class FrequencyModel(Base):
    """
    Frequency Master Table (頻度マスター).
    Global list of frequency names available system-wide.
    """

    __tablename__ = "m_frequencies"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"Frequency(id={self.id}, name={self.name})"


class MemoModel(Base):
    """
    Genba Memos (その他メモ).
    N:1 relationship with Genba.
    """

    __tablename__ = "memos"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    genba_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        nullable=False,
    )
    memo_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    genba: Mapped["GenbaModel"] = relationship(
        "GenbaModel",
        lazy="selectin",
    )
    creator: Mapped["UserModel"] = relationship(
        "UserModel",
        lazy="selectin",
    )
    attachments: Mapped[List["MemoAttachmentModel"]] = relationship(
        "MemoAttachmentModel",
        back_populates="memo",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Memo(id={self.id}, genba_id={self.genba_id}, date={self.memo_date})"


class MemoAttachmentModel(Base):
    """
    Memo Attachments (メモ添付ファイル).
    N:1 relationship with Memo.
    """

    __tablename__ = "memo_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    memo_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("memos.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_name: Mapped[str] = mapped_column(String(200), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    memo: Mapped["MemoModel"] = relationship(
        "MemoModel",
        back_populates="attachments",
    )

    def __repr__(self) -> str:
        return f"MemoAttachment(id={self.id}, file_name={self.file_name})"


class PeriodicWorkTypeModel(Base):
    """
    Master data for Periodic Work Types (定期清掃作業内容).
    Dropdown options for periodic contracts.
    """

    __tablename__ = "m_periodic_work_types"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"PeriodicWorkType(id={self.id}, name={self.name})"

