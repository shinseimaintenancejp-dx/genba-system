"""
Genba Management System — Contract Module: Service.

Business logic for managing contracts.

ARCH-02 Fix: Refactored from @staticmethod class to instance methods with
module-level singleton (consistent with AuthService, InvoiceService, etc.).
Router updated accordingly: ContractService.method() → contract_service.method().
"""

import json
import uuid
from collections.abc import Sequence
from datetime import datetime, time
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import NotFoundError, ValidationError
from app.modules.contract.models import (
    ContractHolidayRuleModel,
    ContractModel,
    ContractPeriodicScheduleModel,
    ContractPeriodicWorkContentModel,
    ContractWorkerCountModel,
    ContractWorkSlotModel,
)
from app.modules.contract.repository import ContractRepository
from app.modules.contract.schemas import ContractCreate, ContractUpdate


class ContractService:
    """Service class encapsulating business operations for contracts."""

    async def get_contract(
        self, db: AsyncSession, contract_id: uuid.UUID, user_id: str
    ) -> ContractModel:
        """Get contract by ID, raises NotFoundError if not found, logs view event."""
        contract = await ContractRepository.get_with_relations(db, contract_id)
        if not contract:
            raise NotFoundError("契約が見つかりません")

        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="contract",
            entity_id=str(contract.id),
            user_id=user_id,
        )
        return contract

    async def list_contracts(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        contract_type: str | None = None,
        genba_id: uuid.UUID | None = None,
        customer_id: uuid.UUID | None = None,
        customer_ids: list[uuid.UUID] | None = None,
        partner_id: uuid.UUID | None = None,
        search_query: str | None = None,
        service_category: str | None = None,
        staff_id: str | None = None,
        periodic_month: int | None = None,
    ) -> tuple[Sequence[ContractModel], int]:
        """List contracts with filters and pagination."""
        items = await ContractRepository.list_all(
            db,
            skip=skip,
            limit=limit,
            status=status,
            contract_type=contract_type,
            genba_id=genba_id,
            customer_id=customer_id,
            customer_ids=customer_ids,
            partner_id=partner_id,
            search_query=search_query,
            service_category=service_category,
            staff_id=staff_id,
            periodic_month=periodic_month,
        )
        total = await ContractRepository.count_all(
            db,
            status=status,
            contract_type=contract_type,
            genba_id=genba_id,
            customer_id=customer_id,
            customer_ids=customer_ids,
            partner_id=partner_id,
            search_query=search_query,
            service_category=service_category,
            staff_id=staff_id,
            periodic_month=periodic_month,
        )
        return items, total

    def _calculate_duration(self, start_time: time | None, end_time: time | None) -> Decimal | None:
        """Calculate duration in hours from start and end time objects."""
        if not start_time or not end_time:
            return None
        t1 = datetime.combine(datetime.today(), start_time)
        t2 = datetime.combine(datetime.today(), end_time)

        diff = t2 - t1
        hours = diff.total_seconds() / 3600
        if hours < 0:
            hours += 24  # Handle crossing midnight
        return Decimal(str(round(hours, 2)))

    def _calculate_slot_duration(
        self, start_time: time, end_time: time, break_minutes: int
    ) -> Decimal:
        """Calculate work duration in hours for a slot: (end - start) - break."""
        t1 = datetime.combine(datetime.today(), start_time)
        t2 = datetime.combine(datetime.today(), end_time)
        diff = (t2 - t1).total_seconds()
        if diff < 0:
            diff += 24 * 3600  # Handle crossing midnight

        duration_minutes = (diff / 60) - break_minutes
        if duration_minutes < 0:
            duration_minutes = 0

        return Decimal(str(round(duration_minutes / 60, 2)))

    async def _check_duplicate_contract_name(
        self, db: AsyncSession, name: str, genba_id: uuid.UUID, exclude_id: uuid.UUID | None = None
    ) -> None:
        """Check if contract name already exists in the same genba."""
        stmt = select(ContractModel).where(
            ContractModel.contract_name == name, ContractModel.genba_id == genba_id
        )
        if exclude_id:
            stmt = stmt.where(ContractModel.id != exclude_id)

        result = await db.execute(stmt)
        if result.first():
            raise ValidationError(
                "contract_name", "この契約名は既に存在しています。別の名前を入力してください。"
            )

    async def create_contract(
        self, db: AsyncSession, data: ContractCreate, user_id: str
    ) -> ContractModel:
        """Create a new contract and validate business rules."""
        # Rule 1: validate contract dates
        if data.end_date and data.start_date > data.end_date:
            raise ValidationError("start_date", "契約開始日は終了日より前の日付にしてください")

        # Rule 2: validate contract type specific columns
        if data.contract_type == "RECEIVING":
            if not data.customer_id:
                raise ValidationError(
                    "customer_id", "元請契約の場合は顧客（取引先）を選択してください"
                )
            if data.partner_id:
                raise ValidationError("partner_id", "元請契約の場合、協力会社は選択できません")
        elif data.contract_type == "ORDERING":
            if not data.partner_id:
                raise ValidationError("partner_id", "下請契約の場合は協力会社を選択してください")
            if data.customer_id:
                raise ValidationError(
                    "customer_id", "下請契約の場合、顧客（取引先）は選択できません"
                )
        else:
            raise ValidationError("contract_type", "無効な契約タイプです")

        # Generate internal sequence code
        internal_code = await ContractRepository.generate_next_internal_code(db)

        # Check duplicate contract name (contract_name is always set by validator, guard for type safety)
        contract_name = data.contract_name
        if contract_name:
            await self._check_duplicate_contract_name(db, contract_name, data.genba_id)

        # Auto-calculate legacy duration
        duration = self._calculate_duration(data.work_start_time, data.work_end_time)

        # Build nested DB models
        work_slots_db = []
        if data.work_slots:
            for idx, slot in enumerate(data.work_slots):
                slot_duration = slot.work_duration_hours
                if slot_duration is None and slot.start_time and slot.end_time:
                    slot_duration = self._calculate_slot_duration(
                        slot.start_time, slot.end_time, slot.break_minutes
                    )

                work_slots_db.append(
                    ContractWorkSlotModel(
                        start_time=slot.start_time,
                        end_time=slot.end_time,
                        break_minutes=slot.break_minutes,
                        work_duration_hours=slot_duration,
                        sort_order=slot.sort_order if slot.sort_order else idx,
                    )
                )

        worker_counts_db = []
        if data.worker_counts:
            for idx, count in enumerate(data.worker_counts):
                worker_counts_db.append(
                    ContractWorkerCountModel(
                        worker_count=count.worker_count,
                        work_duration_hours=count.work_duration_hours,
                        total_hours=count.total_hours,
                        sort_order=count.sort_order if count.sort_order else idx,
                    )
                )

        holiday_rules_db = []
        if data.holiday_rules:
            for hr in data.holiday_rules:
                holiday_rules_db.append(
                    ContractHolidayRuleModel(
                        rule_type=hr.rule_type,
                        action=hr.action,
                    )
                )

        periodic_schedule_db = None
        if data.periodic_schedule:
            periodic_schedule_db = ContractPeriodicScheduleModel(
                frequency_per_year=data.periodic_schedule.frequency_per_year,
                work_months=data.periodic_schedule.work_months,
                work_days=data.periodic_schedule.work_days,
            )

        periodic_work_contents_db = []
        if data.periodic_work_contents:
            for idx, item in enumerate(data.periodic_work_contents):
                periodic_work_contents_db.append(
                    ContractPeriodicWorkContentModel(
                        floor=item.floor,
                        area=item.area,
                        work_content=item.work_content,
                        sort_order=item.sort_order if item.sort_order else idx,
                    )
                )

        # Auto-calculate legacy duration if not provided
        if not duration and data.work_slots and len(data.work_slots) > 0:
            first_slot = sorted(data.work_slots, key=lambda x: x.sort_order)[0]
            if first_slot.start_time and first_slot.end_time:
                duration = self._calculate_slot_duration(
                    first_slot.start_time, first_slot.end_time, first_slot.break_minutes
                )
            elif first_slot.work_duration_hours is not None:
                duration = first_slot.work_duration_hours

        contract = ContractModel(
            internal_code=internal_code,
            external_code=data.external_code,
            contract_type=data.contract_type,
            service_type=data.service_type,
            service_area=data.service_area,
            cleaning_type=data.cleaning_type,
            work_description=data.work_description,
            amount=data.amount,
            hourly_rate=data.hourly_rate,
            tax_type=data.tax_type,
            start_date=data.start_date,
            end_date=data.end_date,
            auto_renew=data.auto_renew,
            invoice_required=data.invoice_required,
            genba_id=data.genba_id,
            customer_id=data.customer_id,
            partner_id=data.partner_id,
            created_by=uuid.UUID(user_id) if user_id else None,
            status="DRAFT",
            # Sprint 5 fields
            contract_name=contract_name,
            service_category=data.service_category,
            weekly_frequency=data.weekly_frequency,
            work_days=data.work_days,
            work_start_time=data.work_start_time,
            work_end_time=data.work_end_time,
            work_duration_hours=duration,
            # Sprint 11 fields
            contract_pdf_url=data.contract_pdf_url,
            work_type=data.work_type,
            sub_service_type=data.sub_service_type,
            work_execution_date=data.work_execution_date,
            work_content_summary=data.work_content_summary,
        )

        created_contract = await ContractRepository.create_with_relations(
            db,
            contract,
            work_slots=work_slots_db if work_slots_db else None,
            worker_counts=worker_counts_db if worker_counts_db else None,
            holiday_rules=holiday_rules_db if holiday_rules_db else None,
            periodic_schedule=periodic_schedule_db,
            periodic_work_contents=periodic_work_contents_db if periodic_work_contents_db else None,
        )

        # Audit log
        new_val = {
            "internal_code": contract.internal_code,
            "contract_type": contract.contract_type,
            "amount": float(contract.amount),
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="contract",
            entity_id=str(created_contract.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )

        # Re-fetch with all relations eagerly loaded so that genba_name,
        # customer_name, partner_name are populated before Pydantic serialization.
        # (genba/customer/partner are set lazy="noload" on the model to prevent
        # implicit async lazy-loads; a dedicated re-fetch is the correct pattern.)
        full_contract = await ContractRepository.get_with_relations(db, created_contract.id)
        return full_contract if full_contract else created_contract

    async def update_contract(
        self, db: AsyncSession, contract_id: uuid.UUID, data: ContractUpdate, user_id: str
    ) -> ContractModel:
        """Update an existing contract and log audit entry."""
        contract = await ContractRepository.get_with_relations(db, contract_id)
        if not contract:
            raise NotFoundError("契約が見つかりません")

        # Validate dates if they are being updated
        start_date = data.start_date if data.start_date is not None else contract.start_date
        end_date = data.end_date if data.end_date is not None else contract.end_date
        if end_date and start_date > end_date:
            raise ValidationError("start_date", "契約開始日は終了日より前の日付にしてください")

        old_val = {
            "status": contract.status,
            "amount": float(contract.amount),
            "service_type": contract.service_type,
        }

        if data.contract_name is not None:
            await self._check_duplicate_contract_name(
                db, data.contract_name, contract.genba_id, exclude_id=contract.id
            )

        # Apply updates
        update_data = data.model_dump(exclude_unset=True)

        # Handle duration logic manually if legacy flat times are updated
        if "work_start_time" in update_data or "work_end_time" in update_data:
            st = (
                data.work_start_time
                if data.work_start_time is not None
                else contract.work_start_time
            )
            et = data.work_end_time if data.work_end_time is not None else contract.work_end_time
            update_data["work_duration_hours"] = self._calculate_duration(st, et)

        # Build nested DB models if provided in update
        work_slots_db = None
        if data.work_slots is not None:
            work_slots_db = []
            for idx, slot in enumerate(data.work_slots):
                slot_duration = slot.work_duration_hours
                if slot_duration is None and slot.start_time and slot.end_time:
                    slot_duration = self._calculate_slot_duration(
                        slot.start_time, slot.end_time, slot.break_minutes
                    )

                work_slots_db.append(
                    ContractWorkSlotModel(
                        start_time=slot.start_time,
                        end_time=slot.end_time,
                        break_minutes=slot.break_minutes,
                        work_duration_hours=slot_duration,
                        sort_order=slot.sort_order if slot.sort_order else idx,
                    )
                )

            # Recalculate duration if replacing slots
            if len(data.work_slots) > 0:
                first_slot = sorted(data.work_slots, key=lambda x: x.sort_order)[0]
                if first_slot.start_time and first_slot.end_time:
                    update_data["work_duration_hours"] = self._calculate_slot_duration(
                        first_slot.start_time, first_slot.end_time, first_slot.break_minutes
                    )
                elif first_slot.work_duration_hours is not None:
                    update_data["work_duration_hours"] = first_slot.work_duration_hours

        worker_counts_db = None
        if data.worker_counts is not None:
            worker_counts_db = []
            for idx, count in enumerate(data.worker_counts):
                worker_counts_db.append(
                    ContractWorkerCountModel(
                        worker_count=count.worker_count,
                        work_duration_hours=count.work_duration_hours,
                        total_hours=count.total_hours,
                        sort_order=count.sort_order if count.sort_order else idx,
                    )
                )

        holiday_rules_db = None
        if data.holiday_rules is not None:
            holiday_rules_db = []
            for hr in data.holiday_rules:
                holiday_rules_db.append(
                    ContractHolidayRuleModel(
                        rule_type=hr.rule_type,
                        action=hr.action,
                    )
                )

        periodic_schedule_db = None
        clear_periodic = False
        if "periodic_schedule" in update_data:
            if data.periodic_schedule is None:
                clear_periodic = True
            else:
                periodic_schedule_db = ContractPeriodicScheduleModel(
                    frequency_per_year=data.periodic_schedule.frequency_per_year,
                    work_months=data.periodic_schedule.work_months,
                    work_days=data.periodic_schedule.work_days,
                )

        periodic_work_contents_db = None
        if data.periodic_work_contents is not None:
            periodic_work_contents_db = []
            for idx, item in enumerate(data.periodic_work_contents):
                periodic_work_contents_db.append(
                    ContractPeriodicWorkContentModel(
                        floor=item.floor,
                        area=item.area,
                        work_content=item.work_content,
                        sort_order=item.sort_order if item.sort_order else idx,
                    )
                )

        # Exclude nested data from setattr loop
        for field in [
            "work_slots",
            "worker_counts",
            "holiday_rules",
            "periodic_schedule",
            "periodic_work_contents",
        ]:
            update_data.pop(field, None)

        for field, value in update_data.items():
            setattr(contract, field, value)

        # Log chi tiết các nested records bị soft-deleted
        if data.holiday_rules is not None:
            old_holiday_rules = [
                {"rule_type": r.rule_type, "action": r.action} for r in contract.holiday_rules
            ]
            new_holiday_rules = [
                {"rule_type": hr.rule_type, "action": hr.action} for hr in data.holiday_rules
            ]
            await audit_service.log(
                session=db,
                action="UPDATE",
                entity_type="contract_holiday_rules",
                entity_id=str(contract.id),
                user_id=user_id,
                old_value=json.dumps(old_holiday_rules, ensure_ascii=False),
                new_value=json.dumps(new_holiday_rules, ensure_ascii=False),
            )

        contract = await ContractRepository.update_with_relations(
            db,
            contract,
            work_slots=work_slots_db,
            worker_counts=worker_counts_db,
            holiday_rules=holiday_rules_db,
            periodic_schedule=periodic_schedule_db,
            periodic_work_contents=periodic_work_contents_db,
            clear_periodic=clear_periodic,
        )

        new_val = {
            "status": contract.status,
            "amount": float(contract.amount),
            "service_type": contract.service_type,
        }

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="contract",
            entity_id=str(contract.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )

        # Re-fetch with all relations eagerly loaded so that genba_name,
        # customer_name, partner_name are populated before Pydantic serialization.
        full_contract = await ContractRepository.get_with_relations(db, contract.id)
        return full_contract if full_contract else contract

    async def delete_contract(self, db: AsyncSession, id: uuid.UUID, user_id: str) -> None:
        """Delete an existing contract."""
        contract = await self.get_contract(db, id, user_id)

        old_val = {
            "status": contract.status,
            "amount": float(contract.amount),
            "service_type": contract.service_type,
        }
        await ContractRepository.delete_contract(db, contract)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="contract",
            entity_id=str(id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )


# Global singleton instance (consistent with other services)
contract_service = ContractService()
