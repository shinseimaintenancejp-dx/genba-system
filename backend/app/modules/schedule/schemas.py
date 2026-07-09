"""
Genba Management System — Schedule Module: Pydantic Schemas.

Defines validation and serialization models for:
- Work Schedules
- Genba Custom Holidays
- Genba Equipment
- Cleaning Work Standards
- Periodic Cleaning Plans & Details
"""

import uuid
from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict, Field, computed_field
from typing import List, Optional, Any
from app.modules.partner.schemas import PartnerCompanyResponse


# =============================================================================
# Base Schema (strictly aligned with BE§5.1)
# =============================================================================
class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,       # ORM mode
        str_strip_whitespace=True,   # Auto-strip whitespace
        strict=False,                # Allow type coercion for strings to time/datetime
    )


# =============================================================================
# Work Schedules
# =============================================================================
class WorkScheduleCreate(BaseSchema):
    """Request schema for creating a work schedule."""

    shift_label: Optional[str] = Field(default=None, max_length=50, description="シフトラベル")
    work_days: str = Field(..., max_length=50, description="勤務曜日 (例: 月火水木金)")
    start_time: time = Field(..., description="開始時間")
    end_time: time = Field(..., description="終了時間")
    break_minutes: int = Field(default=0, ge=0, description="休憩時間(分)")
    times_per_week: Optional[int] = Field(default=None, ge=1, description="週回数")
    hours_per_day: Optional[float] = Field(default=None, ge=0.0, description="日稼働時間")
    holiday_rule: str = Field(default="OFF", description="祝日ルール ('OFF', 'SHIFT_BEFORE', 'SHIFT_AFTER', 'WORK')")
    obon_work: bool = Field(default=False, description="お盆稼働")
    new_year_work: bool = Field(default=False, description="年末年始稼働")
    holiday_shift_rule: Optional[str] = Field(default=None, max_length=50, description="祝日振替ルール")


class WorkScheduleUpdate(BaseSchema):
    """Request schema for updating a work schedule."""

    shift_label: Optional[str] = Field(default=None, max_length=50)
    work_days: Optional[str] = Field(default=None, max_length=50)
    start_time: Optional[time] = Field(default=None)
    end_time: Optional[time] = Field(default=None)
    break_minutes: Optional[int] = Field(default=None, ge=0)
    times_per_week: Optional[int] = Field(default=None, ge=1)
    hours_per_day: Optional[float] = Field(default=None, ge=0.0)
    holiday_rule: Optional[str] = Field(default=None)
    obon_work: Optional[bool] = Field(default=None)
    new_year_work: Optional[bool] = Field(default=None)
    holiday_shift_rule: Optional[str] = Field(default=None, max_length=50)


class WorkScheduleResponse(BaseSchema):
    """Response schema representing a work schedule."""

    id: uuid.UUID
    genba_id: uuid.UUID
    shift_label: Optional[str]
    work_days: str
    start_time: time
    end_time: time
    break_minutes: int
    times_per_week: Optional[int]
    hours_per_day: Optional[float]
    holiday_rule: str
    obon_work: bool
    new_year_work: bool
    holiday_shift_rule: Optional[str]
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Genba Custom Holidays
# =============================================================================
class GenbaCustomHolidayCreate(BaseSchema):
    """Request schema for creating a custom holiday."""

    holiday_date: date = Field(..., description="休日")
    description: Optional[str] = Field(default=None, max_length=200, description="説明")
    substitute_date: Optional[date] = Field(default=None, description="振替日")


class GenbaCustomHolidayUpdate(BaseSchema):
    """Request schema for updating a custom holiday."""

    holiday_date: Optional[date] = Field(default=None)
    description: Optional[str] = Field(default=None, max_length=200)
    substitute_date: Optional[date] = Field(default=None)


class GenbaCustomHolidayResponse(BaseSchema):
    """Response schema representing a custom holiday."""

    id: uuid.UUID
    genba_id: uuid.UUID
    holiday_date: date
    description: Optional[str]
    substitute_date: Optional[date]
    created_at: datetime


# =============================================================================
# Genba Equipment
# =============================================================================
class GenbaEquipmentCreate(BaseSchema):
    """Request schema for creating genba equipment."""

    equipment_name: str = Field(..., max_length=200, description="用具名")
    quantity: int = Field(default=1, ge=0, description="数量")
    notes: Optional[str] = Field(default=None, description="備考")
    sort_order: int = Field(default=0, ge=0, description="ソート順")


class GenbaEquipmentUpdate(BaseSchema):
    """Request schema for updating genba equipment."""

    equipment_name: Optional[str] = Field(default=None, max_length=200)
    quantity: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = Field(default=None)
    sort_order: Optional[int] = Field(default=None, ge=0)


class GenbaEquipmentResponse(BaseSchema):
    """Response schema representing genba equipment."""

    id: uuid.UUID
    genba_id: uuid.UUID
    equipment_name: str
    quantity: int
    notes: Optional[str]
    sort_order: int
    created_at: datetime


# =============================================================================
# Cleaning Work Standards
# =============================================================================
class CleaningWorkStandardCreate(BaseSchema):
    """Request schema for creating cleaning work standards."""

    floor_number: str = Field(..., max_length=20, description="階数")
    area_name: str = Field(..., max_length=200, description="区域/場所")
    floor_material: Optional[str] = Field(default=None, max_length=100, description="床材質")
    area_sqm: Optional[float] = Field(default=None, ge=0.0, description="面積(㎡)")
    daily_tasks: dict = Field(default_factory=dict, description="日常作業頻度 (JSON)")
    periodic_tasks: dict = Field(default_factory=dict, description="定期作業頻度 (JSON)")
    remarks: Optional[str] = Field(default=None, description="備考")
    sort_order: int = Field(default=0, ge=0, description="ソート順")


class CleaningWorkStandardUpdate(BaseSchema):
    """Request schema for updating cleaning work standards."""

    floor_number: Optional[str] = Field(default=None, max_length=20)
    area_name: Optional[str] = Field(default=None, max_length=200)
    floor_material: Optional[str] = Field(default=None, max_length=100)
    area_sqm: Optional[float] = Field(default=None, ge=0.0)
    daily_tasks: Optional[dict] = Field(default=None)
    periodic_tasks: Optional[dict] = Field(default=None)
    remarks: Optional[str] = Field(default=None)
    sort_order: Optional[int] = Field(default=None, ge=0)


class CleaningWorkStandardResponse(BaseSchema):
    """Response schema representing cleaning work standards."""

    id: uuid.UUID
    genba_id: uuid.UUID
    floor_number: str
    area_name: str
    floor_material: Optional[str]
    area_sqm: Optional[float]
    daily_tasks: dict
    periodic_tasks: dict
    remarks: Optional[str]
    sort_order: int
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Periodic Cleaning Plans & Details
# =============================================================================
class PeriodicCleaningDetailCreate(BaseSchema):
    """Request schema for creating periodic cleaning details."""

    location: str = Field(..., max_length=100, description="場所")
    floor_material: Optional[str] = Field(default=None, max_length=100, description="床素材")
    area_name: str = Field(..., max_length=200, description="エリア")
    work_content: str = Field(..., description="作業内容")
    special_notes: Optional[str] = Field(default=None, description="特記事項")
    sort_order: int = Field(default=0, ge=0, description="ソート順")


class PeriodicCleaningDetailUpdate(BaseSchema):
    """Request schema for updating periodic cleaning details."""

    location: Optional[str] = Field(default=None, max_length=100)
    floor_material: Optional[str] = Field(default=None, max_length=100)
    area_name: Optional[str] = Field(default=None, max_length=200)
    work_content: Optional[str] = Field(default=None)
    special_notes: Optional[str] = Field(default=None)
    sort_order: Optional[int] = Field(default=None, ge=0)


class PeriodicCleaningDetailResponse(BaseSchema):
    """Response schema representing periodic cleaning details."""

    id: uuid.UUID
    plan_id: uuid.UUID
    location: str
    floor_material: Optional[str]
    area_name: str
    work_content: str
    special_notes: Optional[str]
    sort_order: int


class PeriodicCleaningPlanCreate(BaseSchema):
    """Request schema for creating a periodic cleaning plan."""

    work_team_type: str = Field(..., description="作業チーム種別 ('SELF', 'PARTNER')")
    partner_id: Optional[uuid.UUID] = Field(default=None, description="協力会社ID (work_team_typeがPARTNERの場合)")
    contract_id: Optional[uuid.UUID] = Field(default=None, description="契約ID")
    work_content: str = Field(..., max_length=200, description="作業内容")
    
    # 12 months
    month_apr: bool = Field(default=False)
    month_may: bool = Field(default=False)
    month_jun: bool = Field(default=False)
    month_jul: bool = Field(default=False)
    month_aug: bool = Field(default=False)
    month_sep: bool = Field(default=False)
    month_oct: bool = Field(default=False)
    month_nov: bool = Field(default=False)
    month_dec: bool = Field(default=False)
    month_jan: bool = Field(default=False)
    month_feb: bool = Field(default=False)
    month_mar: bool = Field(default=False)
    
    special_notes: Optional[str] = Field(default=None, description="特記事項")


class PeriodicCleaningPlanUpdate(BaseSchema):
    """Request schema for updating a periodic cleaning plan."""

    work_team_type: Optional[str] = Field(default=None)
    partner_id: Optional[uuid.UUID] = Field(default=None)
    contract_id: Optional[uuid.UUID] = Field(default=None)
    work_content: Optional[str] = Field(default=None, max_length=200)
    
    month_apr: Optional[bool] = Field(default=None)
    month_may: Optional[bool] = Field(default=None)
    month_jun: Optional[bool] = Field(default=None)
    month_jul: Optional[bool] = Field(default=None)
    month_aug: Optional[bool] = Field(default=None)
    month_sep: Optional[bool] = Field(default=None)
    month_oct: Optional[bool] = Field(default=None)
    month_nov: Optional[bool] = Field(default=None)
    month_dec: Optional[bool] = Field(default=None)
    month_jan: Optional[bool] = Field(default=None)
    month_feb: Optional[bool] = Field(default=None)
    month_mar: Optional[bool] = Field(default=None)
    
    special_notes: Optional[str] = Field(default=None)


class PeriodicCleaningPlanResponse(BaseSchema):
    """Response schema representing a periodic cleaning plan."""

    id: uuid.UUID
    genba_id: uuid.UUID
    work_team_type: str
    partner_id: Optional[uuid.UUID]
    contract_id: Optional[uuid.UUID]
    partner: Optional[PartnerCompanyResponse] = None
    work_content: str
    
    month_apr: bool
    month_may: bool
    month_jun: bool
    month_jul: bool
    month_aug: bool
    month_sep: bool
    month_oct: bool
    month_nov: bool
    month_dec: bool
    month_jan: bool
    month_feb: bool
    month_mar: bool
    
    special_notes: Optional[str]
    details: List[PeriodicCleaningDetailResponse] = []
    created_at: datetime
    updated_at: datetime
    
    # Internal usage to compute contract_holiday_rules
    contract: Optional[Any] = Field(default=None, exclude=True)

    @computed_field
    def contract_holiday_rules(self) -> List[Any] | None:
        if self.contract and hasattr(self.contract, "holiday_rules"):
            # Return holiday rules as dicts
            return [{"rule_type": r.rule_type, "action": r.action} for r in self.contract.holiday_rules]
        return None

