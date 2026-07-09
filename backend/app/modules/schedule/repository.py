"""
Genba Management System — Schedule Module: Repository.

Handles database operations for:
- Work Schedules
- Genba Custom Holidays
- Genba Equipment
- Cleaning Work Standards
- Periodic Cleaning Plans & Details
"""

import uuid
from typing import Sequence
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.schedule.models import (
    PeriodicCleaningPlanModel,
    PeriodicCleaningDetailModel,
    WorkScheduleModel,
    GenbaCustomHolidayModel,
    GenbaEquipmentModel,
    CleaningWorkStandardModel,
)
from app.modules.schedule.schemas import (
    WorkScheduleCreate,
    WorkScheduleUpdate,
    GenbaCustomHolidayCreate,
    GenbaCustomHolidayUpdate,
    GenbaEquipmentCreate,
    GenbaEquipmentUpdate,
    CleaningWorkStandardCreate,
    CleaningWorkStandardUpdate,
    PeriodicCleaningPlanCreate,
    PeriodicCleaningPlanUpdate,
    PeriodicCleaningDetailCreate,
    PeriodicCleaningDetailUpdate,
)


class ScheduleRepository:
    """Repository class for handling DB operations for schedules, periodic plans, equipment, and standards."""

    # ==========================================================================
    # Work Schedules
    # ==========================================================================
    @staticmethod
    async def get_work_schedules(db: AsyncSession, genba_id: uuid.UUID) -> Sequence[WorkScheduleModel]:
        """Retrieve all work schedules for a genba."""
        result = await db.execute(
            select(WorkScheduleModel)
            .where(WorkScheduleModel.genba_id == genba_id)
            .order_by(WorkScheduleModel.start_time)
        )
        return result.scalars().all()

    @staticmethod
    async def get_work_schedule_by_id(db: AsyncSession, schedule_id: uuid.UUID) -> WorkScheduleModel | None:
        """Retrieve a work schedule by ID."""
        result = await db.execute(
            select(WorkScheduleModel).where(WorkScheduleModel.id == schedule_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_work_schedule(
        db: AsyncSession, genba_id: uuid.UUID, data: WorkScheduleCreate
    ) -> WorkScheduleModel:
        """Create a new work schedule."""
        schedule = WorkScheduleModel(
            genba_id=genba_id,
            shift_label=data.shift_label,
            work_days=data.work_days,
            start_time=data.start_time,
            end_time=data.end_time,
            break_minutes=data.break_minutes,
            times_per_week=data.times_per_week,
            hours_per_day=data.hours_per_day,
            holiday_rule=data.holiday_rule,
            obon_work=data.obon_work,
            new_year_work=data.new_year_work,
            holiday_shift_rule=data.holiday_shift_rule,
        )
        db.add(schedule)
        await db.flush()
        return schedule

    @staticmethod
    async def update_work_schedule(
        db: AsyncSession, schedule: WorkScheduleModel, data: WorkScheduleUpdate
    ) -> WorkScheduleModel:
        """Update an existing work schedule."""
        if data.shift_label is not None:
            schedule.shift_label = data.shift_label
        if data.work_days is not None:
            schedule.work_days = data.work_days
        if data.start_time is not None:
            schedule.start_time = data.start_time
        if data.end_time is not None:
            schedule.end_time = data.end_time
        if data.break_minutes is not None:
            schedule.break_minutes = data.break_minutes
        if data.times_per_week is not None:
            schedule.times_per_week = data.times_per_week
        if data.hours_per_day is not None:
            schedule.hours_per_day = data.hours_per_day
        if data.holiday_rule is not None:
            schedule.holiday_rule = data.holiday_rule
        if data.obon_work is not None:
            schedule.obon_work = data.obon_work
        if data.new_year_work is not None:
            schedule.new_year_work = data.new_year_work
        if data.holiday_shift_rule is not None:
            schedule.holiday_shift_rule = data.holiday_shift_rule

        schedule.updated_at = datetime.now(timezone.utc)
        await db.flush()
        return schedule

    @staticmethod
    async def delete_work_schedule(db: AsyncSession, schedule: WorkScheduleModel) -> None:
        """Delete a work schedule."""
        await db.delete(schedule)
        await db.flush()

    # ==========================================================================
    # Genba Custom Holidays
    # ==========================================================================
    @staticmethod
    async def get_custom_holidays(db: AsyncSession, genba_id: uuid.UUID) -> Sequence[GenbaCustomHolidayModel]:
        """Retrieve all custom holidays for a genba."""
        result = await db.execute(
            select(GenbaCustomHolidayModel)
            .where(GenbaCustomHolidayModel.genba_id == genba_id)
            .order_by(GenbaCustomHolidayModel.holiday_date)
        )
        return result.scalars().all()

    @staticmethod
    async def get_custom_holiday_by_id(db: AsyncSession, holiday_id: uuid.UUID) -> GenbaCustomHolidayModel | None:
        """Retrieve a custom holiday by ID."""
        result = await db.execute(
            select(GenbaCustomHolidayModel).where(GenbaCustomHolidayModel.id == holiday_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_custom_holiday(
        db: AsyncSession, genba_id: uuid.UUID, data: GenbaCustomHolidayCreate
    ) -> GenbaCustomHolidayModel:
        """Create a new custom holiday."""
        holiday = GenbaCustomHolidayModel(
            genba_id=genba_id,
            holiday_date=data.holiday_date,
            description=data.description,
            substitute_date=data.substitute_date,
        )
        db.add(holiday)
        await db.flush()
        return holiday

    @staticmethod
    async def update_custom_holiday(
        db: AsyncSession, holiday: GenbaCustomHolidayModel, data: GenbaCustomHolidayUpdate
    ) -> GenbaCustomHolidayModel:
        """Update an existing custom holiday."""
        if data.holiday_date is not None:
            holiday.holiday_date = data.holiday_date
        if data.description is not None:
            holiday.description = data.description
        if data.substitute_date is not None:
            holiday.substitute_date = data.substitute_date

        await db.flush()
        return holiday

    @staticmethod
    async def delete_custom_holiday(db: AsyncSession, holiday: GenbaCustomHolidayModel) -> None:
        """Delete a custom holiday."""
        await db.delete(holiday)
        await db.flush()

    # ==========================================================================
    # Genba Equipment
    # ==========================================================================
    @staticmethod
    async def get_equipment_list(db: AsyncSession, genba_id: uuid.UUID) -> Sequence[GenbaEquipmentModel]:
        """Retrieve equipment list for a genba."""
        result = await db.execute(
            select(GenbaEquipmentModel)
            .where(GenbaEquipmentModel.genba_id == genba_id)
            .order_by(GenbaEquipmentModel.sort_order, GenbaEquipmentModel.equipment_name)
        )
        return result.scalars().all()

    @staticmethod
    async def get_equipment_by_id(db: AsyncSession, equipment_id: uuid.UUID) -> GenbaEquipmentModel | None:
        """Retrieve equipment by ID."""
        result = await db.execute(
            select(GenbaEquipmentModel).where(GenbaEquipmentModel.id == equipment_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_equipment(
        db: AsyncSession, genba_id: uuid.UUID, data: GenbaEquipmentCreate
    ) -> GenbaEquipmentModel:
        """Create a new equipment entry."""
        equipment = GenbaEquipmentModel(
            genba_id=genba_id,
            equipment_name=data.equipment_name,
            quantity=data.quantity,
            notes=data.notes,
            sort_order=data.sort_order,
        )
        db.add(equipment)
        await db.flush()
        return equipment

    @staticmethod
    async def update_equipment(
        db: AsyncSession, equipment: GenbaEquipmentModel, data: GenbaEquipmentUpdate
    ) -> GenbaEquipmentModel:
        """Update equipment details."""
        if data.equipment_name is not None:
            equipment.equipment_name = data.equipment_name
        if data.quantity is not None:
            equipment.quantity = data.quantity
        if data.notes is not None:
            equipment.notes = data.notes
        if data.sort_order is not None:
            equipment.sort_order = data.sort_order

        await db.flush()
        return equipment

    @staticmethod
    async def delete_equipment(db: AsyncSession, equipment: GenbaEquipmentModel) -> None:
        """Delete equipment."""
        await db.delete(equipment)
        await db.flush()

    # ==========================================================================
    # Cleaning Work Standards
    # ==========================================================================
    @staticmethod
    async def get_work_standards(db: AsyncSession, genba_id: uuid.UUID) -> Sequence[CleaningWorkStandardModel]:
        """Retrieve all work standards for a genba."""
        result = await db.execute(
            select(CleaningWorkStandardModel)
            .where(CleaningWorkStandardModel.genba_id == genba_id)
            .order_by(CleaningWorkStandardModel.sort_order, CleaningWorkStandardModel.floor_number)
        )
        return result.scalars().all()

    @staticmethod
    async def get_work_standard_by_id(db: AsyncSession, standard_id: uuid.UUID) -> CleaningWorkStandardModel | None:
        """Retrieve a work standard by ID."""
        result = await db.execute(
            select(CleaningWorkStandardModel).where(CleaningWorkStandardModel.id == standard_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_work_standard(
        db: AsyncSession, genba_id: uuid.UUID, data: CleaningWorkStandardCreate
    ) -> CleaningWorkStandardModel:
        """Create a new work standard."""
        standard = CleaningWorkStandardModel(
            genba_id=genba_id,
            floor_number=data.floor_number,
            area_name=data.area_name,
            floor_material=data.floor_material,
            area_sqm=data.area_sqm,
            daily_tasks=data.daily_tasks,
            periodic_tasks=data.periodic_tasks,
            remarks=data.remarks,
            sort_order=data.sort_order,
        )
        db.add(standard)
        await db.flush()
        return standard

    @staticmethod
    async def update_work_standard(
        db: AsyncSession, standard: CleaningWorkStandardModel, data: CleaningWorkStandardUpdate
    ) -> CleaningWorkStandardModel:
        """Update an existing work standard."""
        if data.floor_number is not None:
            standard.floor_number = data.floor_number
        if data.area_name is not None:
            standard.area_name = data.area_name
        if data.floor_material is not None:
            standard.floor_material = data.floor_material
        if data.area_sqm is not None:
            standard.area_sqm = data.area_sqm
        if data.daily_tasks is not None:
            standard.daily_tasks = data.daily_tasks
        if data.periodic_tasks is not None:
            standard.periodic_tasks = data.periodic_tasks
        if data.remarks is not None:
            standard.remarks = data.remarks
        if data.sort_order is not None:
            standard.sort_order = data.sort_order

        standard.updated_at = datetime.now(timezone.utc)
        await db.flush()
        return standard

    @staticmethod
    async def delete_work_standard(db: AsyncSession, standard: CleaningWorkStandardModel) -> None:
        """Delete a work standard."""
        await db.delete(standard)
        await db.flush()

    # ==========================================================================
    # Periodic Cleaning Plans & Details
    # ==========================================================================
    @staticmethod
    async def get_periodic_plans(db: AsyncSession, genba_id: uuid.UUID) -> Sequence[PeriodicCleaningPlanModel]:
        """Retrieve all periodic cleaning plans for a genba."""
        result = await db.execute(
            select(PeriodicCleaningPlanModel)
            .where(PeriodicCleaningPlanModel.genba_id == genba_id)
            .options(
                selectinload(PeriodicCleaningPlanModel.details),
                selectinload(PeriodicCleaningPlanModel.partner),
            )
            .order_by(PeriodicCleaningPlanModel.work_content)
        )
        return result.scalars().all()

    @staticmethod
    async def get_periodic_plan_by_id(db: AsyncSession, plan_id: uuid.UUID) -> PeriodicCleaningPlanModel | None:
        """Retrieve a periodic cleaning plan by ID."""
        result = await db.execute(
            select(PeriodicCleaningPlanModel)
            .where(PeriodicCleaningPlanModel.id == plan_id)
            .options(
                selectinload(PeriodicCleaningPlanModel.details),
                selectinload(PeriodicCleaningPlanModel.partner),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_periodic_plan(
        db: AsyncSession, genba_id: uuid.UUID, data: PeriodicCleaningPlanCreate
    ) -> PeriodicCleaningPlanModel:
        """Create a new periodic cleaning plan."""
        plan = PeriodicCleaningPlanModel(
            genba_id=genba_id,
            work_team_type=data.work_team_type,
            partner_id=data.partner_id,
            work_content=data.work_content,
            month_apr=data.month_apr,
            month_may=data.month_may,
            month_jun=data.month_jun,
            month_jul=data.month_jul,
            month_aug=data.month_aug,
            month_sep=data.month_sep,
            month_oct=data.month_oct,
            month_nov=data.month_nov,
            month_dec=data.month_dec,
            month_jan=data.month_jan,
            month_feb=data.month_feb,
            month_mar=data.month_mar,
            special_notes=data.special_notes,
        )
        db.add(plan)
        await db.flush()
        
        # Load populated plan
        result = await db.execute(
            select(PeriodicCleaningPlanModel)
            .where(PeriodicCleaningPlanModel.id == plan.id)
            .options(
                selectinload(PeriodicCleaningPlanModel.details),
                selectinload(PeriodicCleaningPlanModel.partner),
            )
        )
        return result.scalar_one()

    @staticmethod
    async def update_periodic_plan(
        db: AsyncSession, plan: PeriodicCleaningPlanModel, data: PeriodicCleaningPlanUpdate
    ) -> PeriodicCleaningPlanModel:
        """Update an existing periodic cleaning plan."""
        if data.work_team_type is not None:
            plan.work_team_type = data.work_team_type
        if data.partner_id is not None:
            plan.partner_id = data.partner_id
        elif hasattr(data, "partner_id") and data.partner_id is None:
            plan.partner_id = None
        if data.work_content is not None:
            plan.work_content = data.work_content
            
        if data.month_apr is not None:
            plan.month_apr = data.month_apr
        if data.month_may is not None:
            plan.month_may = data.month_may
        if data.month_jun is not None:
            plan.month_jun = data.month_jun
        if data.month_jul is not None:
            plan.month_jul = data.month_jul
        if data.month_aug is not None:
            plan.month_aug = data.month_aug
        if data.month_sep is not None:
            plan.month_sep = data.month_sep
        if data.month_oct is not None:
            plan.month_oct = data.month_oct
        if data.month_nov is not None:
            plan.month_nov = data.month_nov
        if data.month_dec is not None:
            plan.month_dec = data.month_dec
        if data.month_jan is not None:
            plan.month_jan = data.month_jan
        if data.month_feb is not None:
            plan.month_feb = data.month_feb
        if data.month_mar is not None:
            plan.month_mar = data.month_mar
            
        if data.special_notes is not None:
            plan.special_notes = data.special_notes

        plan.updated_at = datetime.now(timezone.utc)
        await db.flush()
        
        result = await db.execute(
            select(PeriodicCleaningPlanModel)
            .where(PeriodicCleaningPlanModel.id == plan.id)
            .options(
                selectinload(PeriodicCleaningPlanModel.details),
                selectinload(PeriodicCleaningPlanModel.partner),
            )
        )
        return result.scalar_one()

    @staticmethod
    async def delete_periodic_plan(db: AsyncSession, plan: PeriodicCleaningPlanModel) -> None:
        """Delete a periodic cleaning plan."""
        await db.delete(plan)
        await db.flush()

    # ==========================================================================
    # Periodic Cleaning Plan Details
    # ==========================================================================
    @staticmethod
    async def get_periodic_detail_by_id(db: AsyncSession, detail_id: uuid.UUID) -> PeriodicCleaningDetailModel | None:
        """Retrieve a periodic cleaning plan detail by ID."""
        result = await db.execute(
            select(PeriodicCleaningDetailModel).where(PeriodicCleaningDetailModel.id == detail_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_periodic_detail(
        db: AsyncSession, plan_id: uuid.UUID, data: PeriodicCleaningDetailCreate
    ) -> PeriodicCleaningDetailModel:
        """Create a new periodic plan detail."""
        detail = PeriodicCleaningDetailModel(
            plan_id=plan_id,
            location=data.location,
            floor_material=data.floor_material,
            area_name=data.area_name,
            work_content=data.work_content,
            special_notes=data.special_notes,
            sort_order=data.sort_order,
        )
        db.add(detail)
        await db.flush()
        return detail

    @staticmethod
    async def update_periodic_detail(
        db: AsyncSession, detail: PeriodicCleaningDetailModel, data: PeriodicCleaningDetailUpdate
    ) -> PeriodicCleaningDetailModel:
        """Update an existing periodic plan detail."""
        if data.location is not None:
            detail.location = data.location
        if data.floor_material is not None:
            detail.floor_material = data.floor_material
        if data.area_name is not None:
            detail.area_name = data.area_name
        if data.work_content is not None:
            detail.work_content = data.work_content
        if data.special_notes is not None:
            detail.special_notes = data.special_notes
        if data.sort_order is not None:
            detail.sort_order = data.sort_order

        await db.flush()
        return detail

    @staticmethod
    async def delete_periodic_detail(db: AsyncSession, detail: PeriodicCleaningDetailModel) -> None:
        """Delete a periodic plan detail."""
        await db.delete(detail)
        await db.flush()
