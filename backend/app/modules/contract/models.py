"""
Genba Management System — Contract Module: SQLAlchemy Models.
"""

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from sqlalchemy import Boolean, Date, DateTime, Numeric, ForeignKey, SmallInteger, Integer, String, Text, Time, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ContractModel(Base):
    """Contract Model (契約)."""

    __tablename__ = "contracts"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    internal_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    external_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    contract_type: Mapped[str] = mapped_column(String(20), nullable=False)  # RECEIVING / ORDERING
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    service_area: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cleaning_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    work_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    tax_type: Mapped[str] = mapped_column(String(10), default="EXCLUSIVE", server_default="EXCLUSIVE", nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    invoice_required: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="DRAFT", server_default="DRAFT", nullable=False)

    # Sprint 5: Contract name and service categorization
    contract_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    service_category: Mapped[str] = mapped_column(
        String(20), default="OTHER", server_default="OTHER", nullable=False,
    )  # DAILY / PERIODIC / OTHER

    # Sprint 5: Schedule information (LEGACY - DO NOT USE FOR NEW DATA)
    weekly_frequency: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    work_days: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "月水金"
    work_start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    work_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    work_duration_hours: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)

    # Sprint 11 (DB-04): New columns for contract enhancements
    contract_pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    work_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sub_service_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    work_execution_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    work_content_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    genba_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("genba.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=True,
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("partner_companies.id", ondelete="RESTRICT"),
        nullable=True,
    )

    created_by: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
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

    # Relationships to nested models
    work_slots: Mapped[list["ContractWorkSlotModel"]] = relationship(
        "ContractWorkSlotModel",
        back_populates="contract",
        cascade="all, delete-orphan",
        lazy="selectin",
        primaryjoin="and_(ContractModel.id == ContractWorkSlotModel.contract_id, ContractWorkSlotModel.deleted_at == None)",
    )
    worker_counts: Mapped[list["ContractWorkerCountModel"]] = relationship(
        "ContractWorkerCountModel",
        back_populates="contract",
        cascade="all, delete-orphan",
        lazy="selectin",
        primaryjoin="and_(ContractModel.id == ContractWorkerCountModel.contract_id, ContractWorkerCountModel.deleted_at == None)",
    )
    holiday_rules: Mapped[list["ContractHolidayRuleModel"]] = relationship(
        "ContractHolidayRuleModel",
        back_populates="contract",
        cascade="all, delete-orphan",
        lazy="selectin",
        primaryjoin="and_(ContractModel.id == ContractHolidayRuleModel.contract_id, ContractHolidayRuleModel.deleted_at == None)",
    )
    periodic_schedule: Mapped["ContractPeriodicScheduleModel | None"] = relationship(
        "ContractPeriodicScheduleModel",
        back_populates="contract",
        cascade="all, delete-orphan",
        lazy="selectin",
        uselist=False,
        primaryjoin="and_(ContractModel.id == ContractPeriodicScheduleModel.contract_id, ContractPeriodicScheduleModel.deleted_at == None)",
    )
    periodic_work_contents: Mapped[list["ContractPeriodicWorkContentModel"]] = relationship(
        "ContractPeriodicWorkContentModel",
        back_populates="contract",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ContractPeriodicWorkContentModel.sort_order",
        primaryjoin="and_(ContractModel.id == ContractPeriodicWorkContentModel.contract_id, ContractPeriodicWorkContentModel.deleted_at == None)",
    )

    def __repr__(self) -> str:
        return f"Contract(id={self.id}, internal_code={self.internal_code}, type={self.contract_type})"


class ContractWorkSlotModel(Base):
    """Contract Work Slots (ca làm việc)."""

    __tablename__ = "contract_work_slots"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    work_duration_hours: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped["ContractModel"] = relationship("ContractModel", back_populates="work_slots")


class ContractWorkerCountModel(Base):
    """Contract Worker Counts (số lượng nhân sự)."""

    __tablename__ = "contract_worker_counts"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    worker_count: Mapped[int] = mapped_column(Integer, nullable=False)
    work_duration_hours: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    total_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped["ContractModel"] = relationship("ContractModel", back_populates="worker_counts")


class ContractHolidayRuleModel(Base):
    """Contract Holiday Rules (quy tắc ngày lễ)."""

    __tablename__ = "contract_holiday_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped["ContractModel"] = relationship("ContractModel", back_populates="holiday_rules")


class ContractPeriodicScheduleModel(Base):
    """Contract Periodic Schedule (lịch làm việc định kỳ)."""

    __tablename__ = "contract_periodic_schedule"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True, unique=True
    )
    frequency_per_year: Mapped[int] = mapped_column(Integer, nullable=False)
    work_months: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    work_days: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped["ContractModel"] = relationship("ContractModel", back_populates="periodic_schedule")


class ContractPeriodicWorkContentModel(Base):
    """Contract Periodic Work Contents (Nội dung công việc định kỳ động)."""

    __tablename__ = "contract_periodic_work_contents"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    floor: Mapped[str] = mapped_column(String(50), nullable=False)
    area: Mapped[str] = mapped_column(String(200), nullable=False)
    work_content: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped["ContractModel"] = relationship("ContractModel", back_populates="periodic_work_contents")
