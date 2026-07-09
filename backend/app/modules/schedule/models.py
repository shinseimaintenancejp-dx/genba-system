"""
Genba Management System — Schedule Module: SQLAlchemy Models.

Defines ORM models for:
- PeriodicCleaningPlanModel
- PeriodicCleaningDetailModel
- WorkScheduleModel
- GenbaCustomHolidayModel
- GenbaEquipmentModel
- CleaningWorkStandardModel
"""

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from sqlalchemy import ARRAY, Boolean, Date, DateTime, Numeric, ForeignKey, Integer, String, Table, Text, Time, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WorkScheduleModel(Base):
    """Work Schedule Model (勤務シフト)."""

    __tablename__ = "work_schedules"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    genba_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("genba.id", ondelete="CASCADE"), nullable=False)
    
    shift_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    work_days: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    times_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hours_per_day: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    
    holiday_rule: Mapped[str] = mapped_column(String(50), default="OFF", server_default="'OFF'", nullable=False)
    obon_work: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    new_year_work: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    holiday_shift_rule: Mapped[str | None] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    genba = relationship("GenbaModel", backref="work_schedules", lazy="selectin")

    def __repr__(self) -> str:
        return f"WorkSchedule(id={self.id}, genba_id={self.genba_id})"


class GenbaCustomHolidayModel(Base):
    """Genba Custom Holiday Model (現場固有の休日)."""

    __tablename__ = "genba_custom_holidays"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    genba_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("genba.id", ondelete="CASCADE"), nullable=False)
    
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    substitute_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)

    # Relationships
    genba = relationship("GenbaModel", backref="custom_holidays", lazy="selectin")

    def __repr__(self) -> str:
        return f"GenbaCustomHoliday(id={self.id}, date={self.holiday_date})"


class PeriodicCleaningPlanModel(Base):
    """Periodic Cleaning Plan Model (定期清掃プラン)."""

    __tablename__ = "periodic_cleaning_plans"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    genba_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("genba.id", ondelete="CASCADE"), nullable=False)
    contract_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True, index=True)
    
    work_team_type: Mapped[str] = mapped_column(String(10), nullable=False)
    partner_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True)
    work_content: Mapped[str] = mapped_column(String(200), nullable=False)

    month_apr: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_may: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_jun: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_jul: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_aug: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_sep: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_oct: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_nov: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_dec: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_jan: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_feb: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    month_mar: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    genba = relationship("GenbaModel", backref="periodic_plans", lazy="selectin")
    contract = relationship("ContractModel", lazy="selectin")
    partner = relationship("PartnerCompanyModel", lazy="selectin")
    details: Mapped[list["PeriodicCleaningDetailModel"]] = relationship(
        "PeriodicCleaningDetailModel", 
        back_populates="plan", 
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="PeriodicCleaningDetailModel.sort_order"
    )

    def __repr__(self) -> str:
        return f"PeriodicCleaningPlan(id={self.id}, genba_id={self.genba_id}, contract_id={self.contract_id})"


class PeriodicCleaningDetailModel(Base):
    """Periodic Cleaning Detail Model (定期清掃仕様詳細)."""

    __tablename__ = "periodic_cleaning_details"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    plan_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("periodic_cleaning_plans.id", ondelete="CASCADE"), nullable=False)
    
    location: Mapped[str] = mapped_column(String(100), nullable=False)
    floor_material: Mapped[str | None] = mapped_column(String(100), nullable=True)
    area_name: Mapped[str] = mapped_column(String(200), nullable=False)
    work_content: Mapped[str] = mapped_column(Text, nullable=False)
    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    # Relationships
    plan: Mapped["PeriodicCleaningPlanModel"] = relationship("PeriodicCleaningPlanModel", back_populates="details")

    def __repr__(self) -> str:
        return f"PeriodicCleaningDetail(id={self.id}, plan_id={self.plan_id})"


class CleaningWorkStandardModel(Base):
    """Cleaning Work Standards (清掃作業基準表)."""

    __tablename__ = "cleaning_work_standards"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    genba_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("genba.id", ondelete="CASCADE"), nullable=False)
    
    floor_number: Mapped[str] = mapped_column(String(20), nullable=False)
    area_name: Mapped[str] = mapped_column(String(200), nullable=False)
    floor_material: Mapped[str | None] = mapped_column(String(100), nullable=True)
    area_sqm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    
    daily_tasks: Mapped[dict] = mapped_column(JSONB, default=dict, server_default='{}', nullable=False)
    periodic_tasks: Mapped[dict] = mapped_column(JSONB, default=dict, server_default='{}', nullable=False)
    
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    genba = relationship("GenbaModel", backref="cleaning_standards", lazy="selectin")

    def __repr__(self) -> str:
        return f"CleaningWorkStandard(id={self.id}, location={self.area_name})"


class GenbaEquipmentModel(Base):
    """Genba Equipment Model (現場設備管理)."""

    __tablename__ = "genba_equipments"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    genba_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("genba.id", ondelete="CASCADE"), nullable=False)
    
    equipment_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)

    # Relationships
    genba = relationship("GenbaModel", backref="equipments", lazy="selectin")

    def __repr__(self) -> str:
        return f"GenbaEquipment(id={self.id}, name={self.equipment_name})"
