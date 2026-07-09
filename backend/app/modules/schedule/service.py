"""
Genba Management System — Schedule Module: Service.

Business logic for schedules, custom holidays, equipment, standards, and periodic plans.
"""

import json
import uuid
from typing import Sequence
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import NotFoundError, ValidationError
from app.modules.schedule.models import (
    PeriodicCleaningPlanModel,
    PeriodicCleaningDetailModel,
    WorkScheduleModel,
    GenbaCustomHolidayModel,
    GenbaEquipmentModel,
    CleaningWorkStandardModel,
)
from app.modules.schedule.repository import ScheduleRepository
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


class ScheduleService:
    """Service class encapsulating business operations for schedules, equipment, standards, and plans."""

    # ==========================================================================
    # Helper Validation
    # ==========================================================================
    @staticmethod
    async def _verify_genba_exists(db: AsyncSession, genba_id: uuid.UUID) -> None:
        """Verify that a genba exists, raise NotFoundError if not."""
        from app.modules.genba.repository import GenbaRepository
        genba = await GenbaRepository.get_by_id(db, genba_id)
        if not genba:
            raise NotFoundError("現場が見つかりません")

    @staticmethod
    def resolve_holiday_action(
        target_holiday_type: str,
        genba_schedule: WorkScheduleModel,
        contract_rules: list | None = None
    ) -> str:
        """
        Resolve the holiday action by checking contract rules first, then fallback to genba schedule.
        target_holiday_type: 'NEW_YEAR', 'OBON', 'NATIONAL_HOLIDAY'
        """
        # 1. Contract priority
        if contract_rules:
            for rule in contract_rules:
                if getattr(rule, "rule_type", None) == target_holiday_type:
                    return getattr(rule, "action", "OFF")

        # 2. Genba fallback
        if target_holiday_type == "NEW_YEAR":
            return "WORK" if genba_schedule.new_year_work else "OFF"
        elif target_holiday_type == "OBON":
            return "WORK" if genba_schedule.obon_work else "OFF"
        else: # NATIONAL_HOLIDAY or others
            return genba_schedule.holiday_rule

    # ==========================================================================
    # Work Schedules
    # ==========================================================================
    @staticmethod
    async def list_work_schedules(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> Sequence[WorkScheduleModel]:
        """List work schedules for a genba, log audit view."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        schedules = await ScheduleRepository.get_work_schedules(db, genba_id)
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="work_schedules",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return schedules

    @staticmethod
    async def create_work_schedule(
        db: AsyncSession, genba_id: uuid.UUID, data: WorkScheduleCreate, user_id: str
    ) -> WorkScheduleModel:
        """Create a new work schedule, log audit create."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        schedule = await ScheduleRepository.create_work_schedule(db, genba_id, data)
        
        new_val = {
            "shift_label": schedule.shift_label,
            "work_days": schedule.work_days,
            "start_time": schedule.start_time.isoformat(),
            "end_time": schedule.end_time.isoformat(),
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="work_schedule",
            entity_id=str(schedule.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return schedule

    @staticmethod
    async def update_work_schedule(
        db: AsyncSession, schedule_id: uuid.UUID, data: WorkScheduleUpdate, user_id: str
    ) -> WorkScheduleModel:
        """Update an existing work schedule, log audit update."""
        schedule = await ScheduleRepository.get_work_schedule_by_id(db, schedule_id)
        if not schedule:
            raise NotFoundError("勤務スケジュールが見つかりません")

        old_val = {
            "shift_label": schedule.shift_label,
            "work_days": schedule.work_days,
            "start_time": schedule.start_time.isoformat(),
            "end_time": schedule.end_time.isoformat(),
        }

        updated = await ScheduleRepository.update_work_schedule(db, schedule, data)

        new_val = {
            "shift_label": updated.shift_label,
            "work_days": updated.work_days,
            "start_time": updated.start_time.isoformat(),
            "end_time": updated.end_time.isoformat(),
        }
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="work_schedule",
            entity_id=str(updated.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated

    @staticmethod
    async def delete_work_schedule(db: AsyncSession, schedule_id: uuid.UUID, user_id: str) -> None:
        """Delete a work schedule, log audit delete."""
        schedule = await ScheduleRepository.get_work_schedule_by_id(db, schedule_id)
        if not schedule:
            raise NotFoundError("勤務スケジュールが見つかりません")

        old_val = {
            "shift_label": schedule.shift_label,
            "work_days": schedule.work_days,
        }

        await ScheduleRepository.delete_work_schedule(db, schedule)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="work_schedule",
            entity_id=str(schedule_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )

    # ==========================================================================
    # Genba Custom Holidays
    # ==========================================================================
    @staticmethod
    async def list_custom_holidays(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> Sequence[GenbaCustomHolidayModel]:
        """List custom holidays for a genba."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        holidays = await ScheduleRepository.get_custom_holidays(db, genba_id)
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="genba_custom_holidays",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return holidays

    @staticmethod
    async def create_custom_holiday(
        db: AsyncSession, genba_id: uuid.UUID, data: GenbaCustomHolidayCreate, user_id: str
    ) -> GenbaCustomHolidayModel:
        """Create a new custom holiday."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        holiday = await ScheduleRepository.create_custom_holiday(db, genba_id, data)

        new_val = {
            "holiday_date": holiday.holiday_date.isoformat(),
            "description": holiday.description,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="genba_custom_holiday",
            entity_id=str(holiday.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return holiday

    @staticmethod
    async def update_custom_holiday(
        db: AsyncSession, holiday_id: uuid.UUID, data: GenbaCustomHolidayUpdate, user_id: str
    ) -> GenbaCustomHolidayModel:
        """Update an existing custom holiday."""
        holiday = await ScheduleRepository.get_custom_holiday_by_id(db, holiday_id)
        if not holiday:
            raise NotFoundError("カスタム休日が見つかりません")

        old_val = {
            "holiday_date": holiday.holiday_date.isoformat(),
            "description": holiday.description,
        }

        updated = await ScheduleRepository.update_custom_holiday(db, holiday, data)

        new_val = {
            "holiday_date": updated.holiday_date.isoformat(),
            "description": updated.description,
        }
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="genba_custom_holiday",
            entity_id=str(updated.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated

    @staticmethod
    async def delete_custom_holiday(db: AsyncSession, holiday_id: uuid.UUID, user_id: str) -> None:
        """Delete a custom holiday."""
        holiday = await ScheduleRepository.get_custom_holiday_by_id(db, holiday_id)
        if not holiday:
            raise NotFoundError("カスタム休日が見つかりません")

        old_val = {
            "holiday_date": holiday.holiday_date.isoformat(),
        }

        await ScheduleRepository.delete_custom_holiday(db, holiday)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="genba_custom_holiday",
            entity_id=str(holiday_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )

    # ==========================================================================
    # Genba Equipment
    # ==========================================================================
    @staticmethod
    async def list_equipment(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> Sequence[GenbaEquipmentModel]:
        """List equipment entries for a genba."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        equipment = await ScheduleRepository.get_equipment_list(db, genba_id)
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="genba_equipment",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return equipment

    @staticmethod
    async def create_equipment(
        db: AsyncSession, genba_id: uuid.UUID, data: GenbaEquipmentCreate, user_id: str
    ) -> GenbaEquipmentModel:
        """Create a new equipment entry."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        equipment = await ScheduleRepository.create_equipment(db, genba_id, data)

        new_val = {
            "equipment_name": equipment.equipment_name,
            "quantity": equipment.quantity,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="genba_equipment_item",
            entity_id=str(equipment.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return equipment

    @staticmethod
    async def update_equipment(
        db: AsyncSession, equipment_id: uuid.UUID, data: GenbaEquipmentUpdate, user_id: str
    ) -> GenbaEquipmentModel:
        """Update equipment details."""
        equipment = await ScheduleRepository.get_equipment_by_id(db, equipment_id)
        if not equipment:
            raise NotFoundError("清掃用具が見つかりません")

        old_val = {
            "equipment_name": equipment.equipment_name,
            "quantity": equipment.quantity,
        }

        updated = await ScheduleRepository.update_equipment(db, equipment, data)

        new_val = {
            "equipment_name": updated.equipment_name,
            "quantity": updated.quantity,
        }
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="genba_equipment_item",
            entity_id=str(updated.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated

    @staticmethod
    async def delete_equipment(db: AsyncSession, equipment_id: uuid.UUID, user_id: str) -> None:
        """Delete equipment."""
        equipment = await ScheduleRepository.get_equipment_by_id(db, equipment_id)
        if not equipment:
            raise NotFoundError("清掃用具が見つかりません")

        old_val = {
            "equipment_name": equipment.equipment_name,
        }

        await ScheduleRepository.delete_equipment(db, equipment)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="genba_equipment_item",
            entity_id=str(equipment_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )

    # ==========================================================================
    # Cleaning Work Standards
    # ==========================================================================
    @staticmethod
    async def list_work_standards(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> Sequence[CleaningWorkStandardModel]:
        """List work standards for a genba."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        standards = await ScheduleRepository.get_work_standards(db, genba_id)
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="cleaning_work_standards",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return standards

    @staticmethod
    async def create_work_standard(
        db: AsyncSession, genba_id: uuid.UUID, data: CleaningWorkStandardCreate, user_id: str
    ) -> CleaningWorkStandardModel:
        """Create a new work standard."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        standard = await ScheduleRepository.create_work_standard(db, genba_id, data)

        new_val = {
            "floor_number": standard.floor_number,
            "area_name": standard.area_name,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="cleaning_work_standard",
            entity_id=str(standard.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return standard

    @staticmethod
    async def update_work_standard(
        db: AsyncSession, standard_id: uuid.UUID, data: CleaningWorkStandardUpdate, user_id: str
    ) -> CleaningWorkStandardModel:
        """Update work standard details."""
        standard = await ScheduleRepository.get_work_standard_by_id(db, standard_id)
        if not standard:
            raise NotFoundError("清掃作業基準が見つかりません")

        old_val = {
            "floor_number": standard.floor_number,
            "area_name": standard.area_name,
        }

        updated = await ScheduleRepository.update_work_standard(db, standard, data)

        new_val = {
            "floor_number": updated.floor_number,
            "area_name": updated.area_name,
        }
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="cleaning_work_standard",
            entity_id=str(updated.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated

    @staticmethod
    async def delete_work_standard(db: AsyncSession, standard_id: uuid.UUID, user_id: str) -> None:
        """Delete a work standard."""
        standard = await ScheduleRepository.get_work_standard_by_id(db, standard_id)
        if not standard:
            raise NotFoundError("清掃作業基準が見つかりません")

        old_val = {
            "floor_number": standard.floor_number,
            "area_name": standard.area_name,
        }

        await ScheduleRepository.delete_work_standard(db, standard)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="cleaning_work_standard",
            entity_id=str(standard_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )

    # ==========================================================================
    # Periodic Cleaning Plans & Details
    # ==========================================================================
    @staticmethod
    async def list_periodic_plans(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> Sequence[PeriodicCleaningPlanModel]:
        """List periodic cleaning plans for a genba."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        plans = await ScheduleRepository.get_periodic_plans(db, genba_id)
        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="periodic_cleaning_plans",
            entity_id=str(genba_id),
            user_id=user_id,
        )
        return plans

    @staticmethod
    async def create_periodic_plan(
        db: AsyncSession, genba_id: uuid.UUID, data: PeriodicCleaningPlanCreate, user_id: str
    ) -> PeriodicCleaningPlanModel:
        """Create a new periodic plan, verifying partner company exists if PARTNER work team type."""
        await ScheduleService._verify_genba_exists(db, genba_id)
        
        # Verify partner exists if team is partner
        if data.work_team_type == "PARTNER":
            if not data.partner_id:
                raise ValidationError(field="partner_id", issue="協力会社を選択してください")
            from app.modules.partner.repository import PartnerRepository
            partner = await PartnerRepository.get_by_id(db, data.partner_id)
            if not partner:
                raise NotFoundError("協力会社が見つかりません")
        
        plan = await ScheduleRepository.create_periodic_plan(db, genba_id, data)

        new_val = {
            "work_team_type": plan.work_team_type,
            "work_content": plan.work_content,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="periodic_cleaning_plan",
            entity_id=str(plan.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return plan

    @staticmethod
    async def update_periodic_plan(
        db: AsyncSession, plan_id: uuid.UUID, data: PeriodicCleaningPlanUpdate, user_id: str
    ) -> PeriodicCleaningPlanModel:
        """Update a periodic plan."""
        plan = await ScheduleRepository.get_periodic_plan_by_id(db, plan_id)
        if not plan:
            raise NotFoundError("定期清掃計画が見つかりません")

        # Validate partner if changing to PARTNER or updating partner_id
        target_team = data.work_team_type or plan.work_team_type
        target_partner = data.partner_id if data.partner_id is not None else plan.partner_id
        
        if target_team == "PARTNER":
            if not target_partner:
                raise ValidationError(field="partner_id", issue="協力会社を選択してください")
            from app.modules.partner.repository import PartnerRepository
            partner = await PartnerRepository.get_by_id(db, target_partner)
            if not partner:
                raise NotFoundError("協力会社が見つかりません")

        old_val = {
            "work_team_type": plan.work_team_type,
            "work_content": plan.work_content,
        }

        updated = await ScheduleRepository.update_periodic_plan(db, plan, data)

        new_val = {
            "work_team_type": updated.work_team_type,
            "work_content": updated.work_content,
        }
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="periodic_cleaning_plan",
            entity_id=str(updated.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated

    @staticmethod
    async def delete_periodic_plan(db: AsyncSession, plan_id: uuid.UUID, user_id: str) -> None:
        """Delete a periodic plan."""
        plan = await ScheduleRepository.get_periodic_plan_by_id(db, plan_id)
        if not plan:
            raise NotFoundError("定期清掃計画が見つかりません")

        old_val = {
            "work_team_type": plan.work_team_type,
            "work_content": plan.work_content,
        }

        await ScheduleRepository.delete_periodic_plan(db, plan)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="periodic_cleaning_plan",
            entity_id=str(plan_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )

    # ==========================================================================
    # Periodic Cleaning Plan Details
    # ==========================================================================
    @staticmethod
    async def create_periodic_detail(
        db: AsyncSession, plan_id: uuid.UUID, data: PeriodicCleaningDetailCreate, user_id: str
    ) -> PeriodicCleaningDetailModel:
        """Create a new periodic plan detail."""
        plan = await ScheduleRepository.get_periodic_plan_by_id(db, plan_id)
        if not plan:
            raise NotFoundError("定期清掃計画が見つかりません")

        detail = await ScheduleRepository.create_periodic_detail(db, plan_id, data)

        new_val = {
            "location": detail.location,
            "area_name": detail.area_name,
            "work_content": detail.work_content,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="periodic_cleaning_detail",
            entity_id=str(detail.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return detail

    @staticmethod
    async def update_periodic_detail(
        db: AsyncSession, detail_id: uuid.UUID, data: PeriodicCleaningDetailUpdate, user_id: str
    ) -> PeriodicCleaningDetailModel:
        """Update a periodic plan detail."""
        detail = await ScheduleRepository.get_periodic_detail_by_id(db, detail_id)
        if not detail:
            raise NotFoundError("定期清掃詳細が見つかりません")

        old_val = {
            "location": detail.location,
            "area_name": detail.area_name,
            "work_content": detail.work_content,
        }

        updated = await ScheduleRepository.update_periodic_detail(db, detail, data)

        new_val = {
            "location": updated.location,
            "area_name": updated.area_name,
            "work_content": updated.work_content,
        }
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="periodic_cleaning_detail",
            entity_id=str(updated.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return updated

    @staticmethod
    async def delete_periodic_detail(db: AsyncSession, detail_id: uuid.UUID, user_id: str) -> None:
        """Delete a periodic plan detail."""
        detail = await ScheduleRepository.get_periodic_detail_by_id(db, detail_id)
        if not detail:
            raise NotFoundError("定期清掃詳細が見つかりません")

        old_val = {
            "location": detail.location,
            "area_name": detail.area_name,
        }

        await ScheduleRepository.delete_periodic_detail(db, detail)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="periodic_cleaning_detail",
            entity_id=str(detail_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )
