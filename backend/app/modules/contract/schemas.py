"""
Genba Management System — Contract Module: Pydantic Schemas.

Defines validation and serialization models for Contracts.
"""

import uuid
from decimal import Decimal
from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict, Field, model_validator


# ==============================================================================
# Nested Schemas (DB-04)
# ==============================================================================

class WorkSlotCreate(BaseModel):
    """Schema for creating a work slot."""
    start_time: time | None = None
    end_time: time | None = None
    break_minutes: int = Field(default=0, ge=0)
    work_duration_hours: Decimal | None = None
    sort_order: int = Field(default=0)

class WorkSlotResponse(WorkSlotCreate):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class WorkerCountCreate(BaseModel):
    """Schema for creating a worker count."""
    worker_count: int = Field(gt=0)
    work_duration_hours: Decimal = Field(gt=Decimal("0"))
    total_hours: Decimal = Field(gt=Decimal("0"))
    sort_order: int = Field(default=0)

class WorkerCountResponse(WorkerCountCreate):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class HolidayRuleCreate(BaseModel):
    """Schema for creating a holiday rule."""
    rule_type: str = Field(description="法定休日 / 法定外休日 / 年末年始 / お盆 / その他")
    action: str = Field(description="スライド実施 / 実施しない / 割増請求 / 要相談")

    @model_validator(mode="after")
    def validate_enums(self):
        valid_rules = ("祝日", "年末年始", "お盆", "GW", "サービス開始日前")
        valid_actions = ("出勤する", "休む", "前日に振替", "翌日に振替")
        if self.rule_type not in valid_rules:
            raise ValueError(f"無効な rule_type: {self.rule_type}")
        if self.action not in valid_actions:
            raise ValueError(f"無効な action: {self.action}")
        return self

class HolidayRuleResponse(HolidayRuleCreate):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class PeriodicScheduleCreate(BaseModel):
    """Schema for creating a periodic schedule."""
    frequency_per_year: int = Field(ge=1)
    work_months: list[int] = Field(min_length=1)
    work_days: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_arrays(self):
        if any(m < 1 or m > 12 for m in self.work_months):
            raise ValueError("work_months は 1〜12 の間で指定してください")
        if any(d < 1 or d > 31 for d in self.work_days):
            raise ValueError("work_days は 1〜31 の間で指定してください")
        return self

class PeriodicScheduleResponse(PeriodicScheduleCreate):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class PeriodicWorkContentCreate(BaseModel):
    """Schema for creating a periodic work content row."""
    floor: str = Field(min_length=1, max_length=50)
    area: str = Field(min_length=1, max_length=200)
    work_content: str = Field(min_length=1, max_length=200)
    sort_order: int = Field(default=0)

class PeriodicWorkContentResponse(PeriodicWorkContentCreate):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class DailyWorkContentCreate(BaseModel):
    """Schema for creating a daily work content row."""
    category: str = Field(min_length=1, max_length=50)
    area: str = Field(min_length=1, max_length=200)
    work_content: str = Field(min_length=1, max_length=200)
    frequency: str = Field(min_length=1, max_length=100)
    sort_order: int = Field(default=0)

class DailyWorkContentResponse(DailyWorkContentCreate):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)



class ContractBase(BaseModel):
    """Base contract schema containing shared attributes."""

    external_code: str | None = Field(default=None, max_length=50)
    contract_type: str = Field(min_length=1, max_length=200)  # RECEIVING / ORDERING
    service_type: str = Field(min_length=1, max_length=50)
    service_area: str | None = Field(default=None, max_length=100)
    cleaning_type: str | None = Field(default=None, max_length=100)
    work_description: str | None = Field(default=None)

    amount: Decimal = Field(ge=Decimal("0"))
    hourly_rate: Decimal | None = Field(default=None, ge=Decimal("0"))
    tax_type: str = Field(default="EXCLUSIVE", max_length=10)  # EXCLUSIVE / INCLUSIVE

    start_date: date
    end_date: date | None = Field(default=None)
    auto_renew: bool = Field(default=False)
    invoice_required: bool = Field(default=True)


class ContractCreate(ContractBase):
    """Request schema for creating a new contract."""

    genba_id: uuid.UUID
    customer_id: uuid.UUID | None = Field(default=None)
    partner_id: uuid.UUID | None = Field(default=None)

    # Sprint 5: Contract name and categorization
    contract_name: str | None = Field(default=None, max_length=200, description="Contract name")
    service_category: str = Field(default="OTHER", description="DAILY / PERIODIC / OTHER")
    
    initial_status: str = Field(default="DRAFT", max_length=20)

    @model_validator(mode="after")
    def default_contract_name(self):
        """Auto-fill contract_name from service_type when not provided."""
        if not self.contract_name:
            self.contract_name = self.service_type or "契約"
        return self

    @model_validator(mode="after")
    def validate_initial_status(self):
        allowed = ("DRAFT", "ACTIVE")
        if self.initial_status and self.initial_status not in allowed:
            raise ValueError(f"ステータスは DRAFT または ACTIVE のみ許可されています")
        return self

    # Sprint 5: Schedule information (Deprecated for new inserts but kept for compatibility)
    weekly_frequency: int | None = Field(default=None, ge=1, le=7, description="Weekly work frequency")
    work_days: str | None = Field(default=None, max_length=50, description="Work days e.g. '月水金'")
    work_start_time: time | None = Field(default=None, description="Work start time HH:MM")
    work_end_time: time | None = Field(default=None, description="Work end time HH:MM")

    # Sprint 11: DB-04 new columns
    contract_pdf_url: str | None = Field(default=None, max_length=500)
    work_type: str | None = Field(default=None, max_length=50)
    sub_service_type: str | None = Field(default=None, max_length=50)
    work_execution_date: date | None = Field(default=None)
    work_content_summary: str | None = Field(default=None)

    # Sprint 11: DB-04 Nested entities
    work_slots: list[WorkSlotCreate] | None = Field(default=None, min_length=1)
    worker_counts: list[WorkerCountCreate] | None = Field(default=None, min_length=1)
    holiday_rules: list[HolidayRuleCreate] | None = Field(default=None)
    periodic_schedule: PeriodicScheduleCreate | None = Field(default=None)
    periodic_work_contents: list[PeriodicWorkContentCreate] | None = Field(default=None)
    daily_work_contents: list[DailyWorkContentCreate] | None = Field(default=None)
    ordering_links: list["OrderingLinkCreate"] | None = Field(default=None, description="Links to RECEIVING contracts (for ORDERING contracts)")

    @model_validator(mode="after")
    def validate_service_category_logic(self):
        """Validate service_category values and required nested fields."""
        if self.service_category not in ("DAILY", "PERIODIC", "OTHER"):
            raise ValueError("無効なサービスカテゴリです。DAILY / PERIODIC / OTHER から選択してください。")
            
        if self.service_category == "DAILY":
            if not self.work_slots or not self.worker_counts:
                raise ValueError("DAILYカテゴリの場合、work_slots と worker_counts は必須です")
        elif self.service_category == "PERIODIC":
            if not self.periodic_schedule:
                raise ValueError("PERIODICカテゴリの場合、periodic_schedule は必須です")
        elif self.service_category == "OTHER":
            if not self.work_type or not self.sub_service_type:
                raise ValueError("OTHERカテゴリの場合、work_type と sub_service_type は必須です")
                
        return self


class ContractUpdate(BaseModel):
    """Request schema for updating an existing contract."""

    external_code: str | None = Field(default=None, max_length=50)
    service_type: str | None = Field(default=None, min_length=1, max_length=50)
    service_area: str | None = Field(default=None, max_length=100)
    cleaning_type: str | None = Field(default=None, max_length=100)
    work_description: str | None = Field(default=None)

    amount: Decimal | None = Field(default=None, ge=Decimal("0"))
    hourly_rate: Decimal | None = Field(default=None, ge=Decimal("0"))
    tax_type: str | None = Field(default=None, max_length=10)

    start_date: date | None = Field(default=None)
    end_date: date | None = Field(default=None)
    auto_renew: bool | None = Field(default=None)
    invoice_required: bool | None = Field(default=None)
    status: str | None = Field(default=None, max_length=20)

    # Sprint 5: Contract name and schedule updates
    contract_name: str | None = Field(default=None, max_length=200)
    service_category: str | None = Field(default=None, description="DAILY / PERIODIC / OTHER")
    weekly_frequency: int | None = Field(default=None, ge=1, le=7)
    work_days: str | None = Field(default=None, max_length=50)
    work_start_time: time | None = Field(default=None)
    work_end_time: time | None = Field(default=None)
    partner_id: uuid.UUID | None = Field(default=None)
    genba_id: uuid.UUID | None = Field(default=None)
    customer_id: uuid.UUID | None = Field(default=None)
    contract_type: str | None = Field(default=None)

    # Sprint 11: DB-04 new columns
    contract_pdf_url: str | None = Field(default=None, max_length=500)
    work_type: str | None = Field(default=None, max_length=50)
    sub_service_type: str | None = Field(default=None, max_length=50)
    work_execution_date: date | None = Field(default=None)
    work_content_summary: str | None = Field(default=None)

    # Sprint 11: DB-04 Nested entities
    work_slots: list[WorkSlotCreate] | None = Field(default=None, min_length=1)
    worker_counts: list[WorkerCountCreate] | None = Field(default=None, min_length=1)
    holiday_rules: list[HolidayRuleCreate] | None = Field(default=None)
    periodic_schedule: PeriodicScheduleCreate | None = Field(default=None)
    periodic_work_contents: list[PeriodicWorkContentCreate] | None = Field(default=None)
    daily_work_contents: list[DailyWorkContentCreate] | None = Field(default=None)
    ordering_links: list["OrderingLinkCreate"] | None = Field(default=None)


# ---------------------------------------------------------------------------
# Minimal relation sub-schemas (used only by ContractResponse)
# ---------------------------------------------------------------------------
# These are declared explicitly so Pydantic v2 can read them from ORM objects
# via from_attributes=True. The corresponding ContractResponse fields are
# marked exclude=True so they never appear in the JSON output.
# ---------------------------------------------------------------------------

class _MinimalGenba(BaseModel):
    """Minimal Genba representation for relation name extraction."""
    property_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class _MinimalCustomer(BaseModel):
    """Minimal Customer representation for relation name extraction."""
    short_name: str | None = None
    full_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class _MinimalPartner(BaseModel):
    """Minimal Partner representation for relation name extraction."""
    short_name: str | None = None
    company_name: str | None = None
    model_config = ConfigDict(from_attributes=True)



class CancelWithLinksPayload(BaseModel):
    end_date: date = Field(..., description="Date of cancellation")


class ScheduleCancelPayload(BaseModel):
    """Payload for scheduling a future-dated contract cancellation."""
    cancellation_date: date = Field(..., description="The date on which the contract should be cancelled")
    reason: str | None = Field(default=None, description="Reason for cancellation")


class ScheduleCancelResponse(BaseModel):
    """Response when a contract is scheduled for cancellation."""
    status: str
    scheduled_cancellation_date: date
    cancelled_ordering_count: int
    cancelled_invoices_count: int


class UndoCancelResponse(BaseModel):
    """Response when a scheduled cancellation is undone."""
    status: str
    restored_invoices_count: int
    restored_ordering_count: int

class LinkedOrderingContractResponse(BaseModel):
    id: uuid.UUID
    contract_name: str
    internal_code: str
    status: str
    partner_id: uuid.UUID | None
    
    # Partner info directly attached for convenience
    partner_name: str | None = None

class ContractResponse(ContractBase):
    """Response schema representing a contract."""

    id: uuid.UUID
    internal_code: str
    status: str
    genba_id: uuid.UUID
    customer_id: uuid.UUID | None = Field(default=None)
    customer_id: uuid.UUID | None
    partner_id: uuid.UUID | None
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    # Sprint 5: New response fields
    contract_name: str
    service_category: str = "OTHER"
    weekly_frequency: int | None = None
    work_days: str | None = None
    work_start_time: time | None = None
    work_end_time: time | None = None
    work_duration_hours: float | None = None

    # Sprint 11: DB-04 new columns
    contract_pdf_url: str | None = None
    work_type: str | None = None
    sub_service_type: str | None = None
    work_execution_date: date | None = None
    work_content_summary: str | None = None

    # Scheduled cancellation fields
    scheduled_cancellation_date: date | None = None
    cancellation_reason: str | None = None
    cancellation_requested_at: datetime | None = None

    # Sprint 11: DB-04 Nested relations
    work_slots: list[WorkSlotResponse] | None = None
    worker_counts: list[WorkerCountResponse] | None = None
    holiday_rules: list[HolidayRuleResponse] | None = None
    periodic_schedule: PeriodicScheduleResponse | None = None
    periodic_work_contents: list[PeriodicWorkContentResponse] | None = None
    daily_work_contents: list[DailyWorkContentResponse] | None = None
    ordering_links: list["OrderingLinkResponse"] | None = None

    # Pydantic v2 fix: Declare ORM relations explicitly so Pydantic reads them
    # via from_attributes=True. Field(exclude=True) hides them from JSON output.
    # Without this declaration, Pydantic v2 silently drops ORM relationship
    # attributes and mode="after" validators cannot access them via self.__dict__.
    genba: "_MinimalGenba | None" = Field(default=None, exclude=True)
    customer: "_MinimalCustomer | None" = Field(default=None, exclude=True)
    partner: "_MinimalPartner | None" = Field(default=None, exclude=True)

    # Flat names extracted from relations — included in JSON response
    genba_name: str | None = None
    customer_name: str | None = None
    partner_name: str | None = None

    model_config = ConfigDict(from_attributes=True, strict=False)

    @model_validator(mode="after")
    def compute_legacy_fields(self):
        """Auto-compute flat fields from nested ORM relations.

        genba/customer/partner are declared as excluded fields so Pydantic v2
        populates them from the ORM object. We then extract the name strings
        into the flat _name fields that are included in the JSON response.
        """
        # Populate legacy flat time fields from first work slot
        if self.work_slots and len(self.work_slots) > 0:
            first_slot = sorted(self.work_slots, key=lambda x: x.sort_order)[0]
            self.work_start_time = first_slot.start_time
            self.work_end_time = first_slot.end_time

        # Extract relation names (self.genba is now guaranteed by Pydantic field declaration)
        if self.genba is not None:
            self.genba_name = self.genba.property_name

        if self.customer is not None:
            self.customer_name = self.customer.short_name or self.customer.full_name

        if self.partner is not None:
            self.partner_name = self.partner.short_name or self.partner.company_name

        return self



class ContractBriefResponse(BaseModel):
    """Brief contract representation for nesting in manual/schedule responses."""

    id: uuid.UUID
    internal_code: str
    contract_name: str
    service_category: str = "OTHER"
    contract_type: str
    start_date: date
    end_date: date | None = None
    weekly_frequency: int | None = None
    work_days: str | None = None
    work_start_time: time | None = None
    work_end_time: time | None = None
    work_duration_hours: float | None = None

    model_config = ConfigDict(from_attributes=True, strict=True)


# ==============================================================================
# Ordering Link Schemas (Subcontracting — N:N)
# ==============================================================================

class OrderingLinkWorkItemCreate(BaseModel):
    """Schema for one work item entry within an ordering link."""
    work_content_id: uuid.UUID
    # Sub-scope for shared work items (e.g. "1F~8F" when two partners split floors).
    # NULL means the full work item is delegated.
    scope_detail: str | None = Field(default=None, max_length=200)
    allocated_amount: Decimal | None = Field(default=None, ge=Decimal("0"))
    allocated_percentage: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("100"))


class _MinimalWorkContent(BaseModel):
    floor: str
    area: str
    work_content: str
    model_config = ConfigDict(from_attributes=True)


class OrderingLinkWorkItemResponse(BaseModel):
    id: uuid.UUID
    link_id: uuid.UUID
    work_content_id: uuid.UUID
    scope_detail: str | None = None
    allocated_amount: Decimal | None = None
    allocated_percentage: Decimal | None = None
    created_at: datetime

    # Flat display fields (populated by validator from work_content relation)
    floor: str | None = None
    area: str | None = None
    work_content: str | None = None

    # ORM relation (excluded from JSON, used by model_validator)
    work_content_rel: "_MinimalWorkContent | None" = Field(default=None, exclude=True)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_work_content_fields(self):
        """Extract floor/area/work_content from nested ORM relation if available."""
        if self.work_content_rel is not None:
            self.floor = self.work_content_rel.floor
            self.area = self.work_content_rel.area
            self.work_content = self.work_content_rel.work_content
        return self


class OrderingLinkCreate(BaseModel):
    """Request schema for creating a new ordering link."""
    receiving_contract_id: uuid.UUID
    # FULL = delegate all work items of this RECEIVING contract
    # PARTIAL = only specific items (must provide work_items)
    assignment_type: str = Field(default="PARTIAL", pattern="^(FULL|PARTIAL)$")
    allocated_amount: Decimal | None = Field(default=None, ge=Decimal("0"))
    allocated_percentage: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("100"))
    remarks: str | None = Field(default=None, max_length=500)
    work_items: list[OrderingLinkWorkItemCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_partial_requires_items(self):
        if self.assignment_type == "PARTIAL" and not self.work_items:
            raise ValueError("一部委託（PARTIAL）の場合、作業項目を1件以上選択してください。")
        if self.assignment_type == "FULL" and self.work_items:
            raise ValueError("全面委託（FULL）の場合、作業項目の個別指定は不要です。")
        return self


class OrderingLinkUpdate(BaseModel):
    """Request schema for updating an existing ordering link."""
    assignment_type: str | None = Field(default=None, pattern="^(FULL|PARTIAL)$")
    allocated_amount: Decimal | None = Field(default=None, ge=Decimal("0"))
    allocated_percentage: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("100"))
    remarks: str | None = Field(default=None, max_length=500)
    # When provided, fully replaces the existing work_items list for this link
    work_items: list[OrderingLinkWorkItemCreate] | None = Field(default=None)


class _MinimalReceivingContract(BaseModel):
    """Minimal representation of a receiving contract for relation extraction."""
    contract_name: str | None = None
    internal_code: str | None = None
    amount: Decimal | None = None
    model_config = ConfigDict(from_attributes=True)


class OrderingLinkResponse(BaseModel):
    """Response schema for a single ordering link record."""
    id: uuid.UUID
    ordering_contract_id: uuid.UUID
    receiving_contract_id: uuid.UUID
    assignment_type: str
    allocated_amount: Decimal | None = None
    allocated_percentage: Decimal | None = None
    remarks: str | None = None
    created_at: datetime
    updated_at: datetime
    work_items: list[OrderingLinkWorkItemResponse] = Field(default_factory=list)

    # Flat display fields extracted from related RECEIVING contract
    receiving_contract_name: str | None = None
    receiving_contract_code: str | None = None
    receiving_amount: Decimal | None = None

    # ORM relation (excluded from JSON, used by model_validator)
    receiving_contract: "_MinimalReceivingContract | None" = Field(default=None, exclude=True)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def compute_receiving_fields(self):
        """Auto-populate flat receiving fields from ORM relationship."""
        if self.receiving_contract is not None:
            if not self.receiving_contract_name:
                self.receiving_contract_name = self.receiving_contract.contract_name
            if not self.receiving_contract_code:
                self.receiving_contract_code = self.receiving_contract.internal_code
            if self.receiving_amount is None:
                self.receiving_amount = self.receiving_contract.amount
        return self


class AvailableReceivingContractItem(BaseModel):
    """Brief representation of a RECEIVING contract available for linking."""
    id: uuid.UUID
    internal_code: str
    contract_name: str
    amount: Decimal
    service_category: str
    work_content_summary: str | None = None
    work_type: str | None = None
    sub_service_type: str | None = None
    work_execution_date: date | None = None
    start_date: date
    end_date: date | None = None
    work_items: list[PeriodicWorkContentResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)



# ==============================================================================
# Profit Report Schemas
# ==============================================================================

class ProfitReportItem(BaseModel):
    genba_id: uuid.UUID
    customer_id: uuid.UUID | None = Field(default=None)
    genba_name: str
    revenue: float
    partner_cost: float
    inhouse_cost: float
    profit: float
    profit_margin: float

class ProfitReportResponse(BaseModel):
    year: int
    month: int
    total_revenue: float
    total_partner_cost: float
    total_inhouse_cost: float
    total_profit: float
    total_profit_margin: float
    genbas: list[ProfitReportItem]


ContractCreate.model_rebuild()
