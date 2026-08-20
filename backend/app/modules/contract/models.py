"""
Genba Management System — Contract Module: SQLAlchemy Models.
"""

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Date, DateTime, Numeric, ForeignKey, SmallInteger, Integer, String, Text, Time, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.genba.models import GenbaModel
from app.modules.customer.models import CustomerModel
from app.modules.partner.models import PartnerCompanyModel


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

    # Relationships to parent entities (viewonly=True and noload to avoid implicit async lazy-loads)
    genba: Mapped["GenbaModel | None"] = relationship(
        "GenbaModel",
        lazy="noload",
        viewonly=True,
        primaryjoin="ContractModel.genba_id == GenbaModel.id",
    )
    customer: Mapped["CustomerModel | None"] = relationship(
        "CustomerModel",
        lazy="noload",
        viewonly=True,
        primaryjoin="ContractModel.customer_id == CustomerModel.id",
    )
    partner: Mapped["PartnerCompanyModel | None"] = relationship(
        "PartnerCompanyModel",
        lazy="noload",
        viewonly=True,
        primaryjoin="ContractModel.partner_id == PartnerCompanyModel.id",
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
    daily_work_contents: Mapped[list["ContractDailyWorkContentModel"]] = relationship(
        "ContractDailyWorkContentModel",
        back_populates="contract",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ContractDailyWorkContentModel.sort_order",
        primaryjoin="and_(ContractModel.id == ContractDailyWorkContentModel.contract_id, ContractDailyWorkContentModel.deleted_at == None)",
    )

    # Ordering links — ORDERING contract → list of RECEIVING contracts it is linked to
    ordering_links: Mapped[list["ContractOrderingLinkModel"]] = relationship(
        "ContractOrderingLinkModel",
        back_populates="ordering_contract",
        cascade="all, delete-orphan",
        lazy="noload",
        foreign_keys="ContractOrderingLinkModel.ordering_contract_id",
    )
    # Receiving links — RECEIVING contract → list of ORDERING contracts linked to it
    receiving_links: Mapped[list["ContractOrderingLinkModel"]] = relationship(
        "ContractOrderingLinkModel",
        back_populates="receiving_contract",
        cascade="all, delete-orphan",
        lazy="noload",
        foreign_keys="ContractOrderingLinkModel.receiving_contract_id",
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


class ContractDailyWorkContentModel(Base):
    """Contract Daily Work Contents (Nội dung công việc hàng ngày - gắn liền với hợp đồng)."""

    __tablename__ = "contract_daily_work_contents"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    area: Mapped[str] = mapped_column(String(200), nullable=False)
    work_content: Mapped[str] = mapped_column(String(200), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped["ContractModel"] = relationship("ContractModel", back_populates="daily_work_contents")


class ContractOrderingLinkModel(Base):
    """Contract Ordering Link — N:N bridge between RECEIVING and ORDERING contracts.

    Each record represents one ORDERING contract being associated with one RECEIVING
    contract. A single RECEIVING contract can have multiple ORDERING links (many
    sub-contractors), and a single ORDERING contract can link to multiple RECEIVING
    contracts (aggregated delegation).
    """

    __tablename__ = "contract_ordering_links"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    ordering_contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    receiving_contract_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # FULL = delegate all work contents of this RECEIVING; PARTIAL = specific items only
    assignment_type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="PARTIAL",
        server_default="PARTIAL",
    )

    # Optional: allocated monetary value for this link
    allocated_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    # Optional: allocated percentage of RECEIVING.amount
    allocated_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)

    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    ordering_contract: Mapped["ContractModel"] = relationship(
        "ContractModel",
        back_populates="ordering_links",
        foreign_keys=[ordering_contract_id],
        lazy="noload",
        viewonly=False,
    )
    receiving_contract: Mapped["ContractModel"] = relationship(
        "ContractModel",
        back_populates="receiving_links",
        foreign_keys=[receiving_contract_id],
        lazy="noload",
        viewonly=False,
    )
    work_items: Mapped[list["ContractOrderingLinkWorkItemModel"]] = relationship(
        "ContractOrderingLinkWorkItemModel",
        back_populates="link",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"ContractOrderingLink(id={self.id}, "
            f"ordering={self.ordering_contract_id}, "
            f"receiving={self.receiving_contract_id}, "
            f"type={self.assignment_type})"
        )


class ContractOrderingLinkWorkItemModel(Base):
    """Contract Ordering Link Work Items.

    Each record maps one specific work content item (from a RECEIVING contract's
    periodic_work_contents) to a particular ordering link. The optional
    `scope_detail` field distinguishes partial coverage of the same work item
    by multiple partners (e.g., Company A: "1F~8F", Company B: "9F~15F").
    """

    __tablename__ = "contract_ordering_link_work_items"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    link_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("contract_ordering_links.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_content_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("contract_periodic_work_contents.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Sub-scope within the work item (NULL = entire work item is delegated).
    # Used when multiple partners share the same work item with different ranges,
    # e.g. "1F~8F" for Company A and "9F~15F" for Company B on 床面清掃.
    scope_detail: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Optional per-item allocation tracking
    allocated_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    allocated_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )

    # Relationships
    link: Mapped["ContractOrderingLinkModel"] = relationship(
        "ContractOrderingLinkModel",
        back_populates="work_items",
    )
    work_content_rel: Mapped["ContractPeriodicWorkContentModel"] = relationship(
        "ContractPeriodicWorkContentModel",
        lazy="noload",
        viewonly=True,
    )

    def __repr__(self) -> str:
        return (
            f"ContractOrderingLinkWorkItem(id={self.id}, "
            f"link={self.link_id}, "
            f"work_content={self.work_content_id}, "
            f"scope={self.scope_detail!r})"
        )
