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
from datetime import datetime, time, date
from decimal import Decimal

from sqlalchemy import select
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import NotFoundError, ValidationError
from app.modules.contract.models import (
    ContractHolidayRuleModel,
    ContractModel,
    ContractPeriodicScheduleModel,
    ContractPeriodicWorkContentModel,
    ContractDailyWorkContentModel,
    ContractWorkerCountModel,
    ContractWorkSlotModel,
)
from app.modules.contract.repository import ContractRepository
from app.modules.contract.ordering_link_repository import ordering_link_repository
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


    async def get_linked_ordering_contracts(
        self, db: AsyncSession, receiving_contract_id: uuid.UUID
    ) -> list[dict]:
        from sqlalchemy import select
        from app.modules.contract.models import ContractOrderingLinkModel, ContractModel
        from app.modules.partner.models import PartnerCompanyModel
        
        stmt = (
            select(ContractModel, PartnerCompanyModel.company_name.label("partner_name"))
            .join(ContractOrderingLinkModel, ContractOrderingLinkModel.ordering_contract_id == ContractModel.id)
            .outerjoin(PartnerCompanyModel, ContractModel.partner_id == PartnerCompanyModel.id)
            .where(
                ContractOrderingLinkModel.receiving_contract_id == receiving_contract_id,
                ContractModel.status.not_in(["CANCELLED", "EXPIRED"])
            )
        )
        
        result = await db.execute(stmt)
        rows = result.all()
        
        linked_contracts = []
        for contract, partner_name in rows:
            linked_contracts.append({
                "id": contract.id,
                "contract_name": contract.contract_name,
                "internal_code": contract.internal_code,
                "status": contract.status,
                "partner_id": contract.partner_id,
                "partner_name": partner_name
            })
            
        return linked_contracts

    async def cancel_contract_with_links(
        self, db: AsyncSession, contract_id: uuid.UUID, end_date: date, current_user_id: uuid.UUID
    ) -> dict:
        from app.modules.contract.models import ContractModel, ContractOrderingLinkModel
        from sqlalchemy import select, update
        from fastapi import HTTPException
        
        # This will happen in a transaction managed by the router `async with db.begin():` (actually db is AsyncSession)
        
        # 1. Fetch main contract
        main_contract = await ContractRepository.get_by_id(db, contract_id)
        if not main_contract:
            raise HTTPException(status_code=404, detail="Contract not found")
            
        if main_contract.status == "CANCELLED":
            raise HTTPException(status_code=400, detail="この契約は既に解約されています。")
            
        # Validate date
        if main_contract.start_date > end_date:
            from pydantic import ValidationError
            from app.core.exceptions import CustomValidationError
            raise CustomValidationError(errors=[{"loc": ["start_date"], "msg": "契約開始日は終了日より前の日付にしてください", "type": "value_error"}])

        # 2. Get all linked ordering contracts
        stmt = select(ContractOrderingLinkModel.ordering_contract_id).where(
            ContractOrderingLinkModel.receiving_contract_id == contract_id
        )
        result = await db.execute(stmt)
        ordering_ids = result.scalars().all()
        
        # 3. Cancel all ordering contracts
        if ordering_ids:
            update_stmt = (
                update(ContractModel)
                .where(ContractModel.id.in_(ordering_ids))
                .values(status="CANCELLED", end_date=end_date)
            )
            await db.execute(update_stmt)
            
        # 4. Cancel main contract
        update_main_stmt = (
            update(ContractModel)
            .where(ContractModel.id == contract_id)
            .values(status="CANCELLED", end_date=end_date)
        )
        await db.execute(update_main_stmt)
        
        # The transaction commit will happen in router (if we don't commit here). But we should ensure the router commits.
        await db.commit()
        
        return {"status": "success", "cancelled_ordering_contracts_count": len(ordering_ids)}

    async def schedule_cancel(
        self,
        db: AsyncSession,
        contract_id: uuid.UUID,
        cancellation_date: date,
        reason: str | None,
        current_user_id: uuid.UUID,
    ) -> dict:
        """
        Schedule a future-dated contract cancellation.

        - If cancellation_date <= today: immediately cancel via existing logic.
        - If cancellation_date > today:
            1. Mark contract with scheduled_cancellation_date, auto_renew=False.
            2. Soft-cancel future invoices (billing > cancellation month) by marking
               cancelled_by_scheduled_id = contract_id.
            3. Cascade to linked ordering contracts.
        """
        from app.modules.contract.models import ContractModel, ContractOrderingLinkModel
        from app.modules.invoice.models import InvoiceModel
        from sqlalchemy import select, update
        from fastapi import HTTPException
        from datetime import date as date_type, datetime, timezone

        today = date_type.today()

        # Fetch main contract
        main_contract = await ContractRepository.get_by_id(db, contract_id)
        if not main_contract:
            raise HTTPException(status_code=404, detail="契約が見つかりません。")

        if main_contract.status == "CANCELLED":
            raise HTTPException(status_code=400, detail="この契約は既に解約されています。")

        if main_contract.scheduled_cancellation_date is not None:
            raise HTTPException(
                status_code=400,
                detail=f"この契約は既に {main_contract.scheduled_cancellation_date} に解約予定です。先に解約予定をキャンセルしてください。",
            )

        if main_contract.start_date > cancellation_date:
            raise HTTPException(status_code=400, detail="解約日は契約開始日以降の日付を指定してください。")

        # If today or past → immediate cancel via existing logic
        if cancellation_date <= today:
            result = await self.cancel_contract_with_links(db, contract_id, cancellation_date, current_user_id)
            return {
                "status": "success",
                "scheduled_cancellation_date": cancellation_date,
                "cancelled_ordering_count": result.get("cancelled_ordering_contracts_count", 0),
                "cancelled_invoices_count": 0,
                "immediate": True,
            }

        # Future-dated: update the main contract
        await db.execute(
            update(ContractModel)
            .where(ContractModel.id == contract_id)
            .values(
                scheduled_cancellation_date=cancellation_date,
                cancellation_reason=reason,
                cancellation_requested_at=datetime.now(timezone.utc),
                auto_renew=False,
            )
        )

        # Soft-cancel invoices with billing_period AFTER the cancellation month
        # (invoices in the same month as cancellation_date are kept — Phương án A)
        cancel_year = cancellation_date.year
        cancel_month = cancellation_date.month

        invoice_result = await db.execute(
            update(InvoiceModel)
            .where(
                InvoiceModel.contract_id == contract_id,
                InvoiceModel.status.not_in(["CANCELLED", "PAID"]),
                InvoiceModel.cancelled_by_scheduled_id.is_(None),
                # Only future months (strictly after cancellation month)
                sa.or_(
                    InvoiceModel.billing_period_year > cancel_year,
                    sa.and_(
                        InvoiceModel.billing_period_year == cancel_year,
                        InvoiceModel.billing_period_month > cancel_month,
                    ),
                ),
            )
            .values(
                status="CANCELLED",
                cancelled_by_scheduled_id=contract_id,
            )
            .returning(InvoiceModel.id)
        )
        cancelled_invoice_ids = invoice_result.scalars().all()

        # Cascade to ordering contracts
        ordering_result = await db.execute(
            select(ContractOrderingLinkModel.ordering_contract_id).where(
                ContractOrderingLinkModel.receiving_contract_id == contract_id
            )
        )
        ordering_ids = ordering_result.scalars().all()

        cascade_invoice_count = 0
        for oid in ordering_ids:
            ordering_contract = await ContractRepository.get_by_id(db, oid)
            if not ordering_contract or ordering_contract.status == "CANCELLED":
                continue

            await db.execute(
                update(ContractModel)
                .where(ContractModel.id == oid)
                .values(
                    scheduled_cancellation_date=cancellation_date,
                    cancellation_reason=reason,
                    cancellation_requested_at=datetime.now(timezone.utc),
                    auto_renew=False,
                )
            )

            # Soft-cancel future invoices for ordering contracts too
            oid_invoice_result = await db.execute(
                update(InvoiceModel)
                .where(
                    InvoiceModel.contract_id == oid,
                    InvoiceModel.status.not_in(["CANCELLED", "PAID"]),
                    InvoiceModel.cancelled_by_scheduled_id.is_(None),
                    sa.or_(
                        InvoiceModel.billing_period_year > cancel_year,
                        sa.and_(
                            InvoiceModel.billing_period_year == cancel_year,
                            InvoiceModel.billing_period_month > cancel_month,
                        ),
                    ),
                )
                .values(
                    status="CANCELLED",
                    cancelled_by_scheduled_id=oid,
                )
                .returning(InvoiceModel.id)
            )
            cascade_invoice_count += len(oid_invoice_result.scalars().all())

        await db.commit()

        return {
            "status": "success",
            "scheduled_cancellation_date": cancellation_date,
            "cancelled_ordering_count": len(ordering_ids),
            "cancelled_invoices_count": len(cancelled_invoice_ids) + cascade_invoice_count,
        }

    async def undo_cancel(
        self,
        db: AsyncSession,
        contract_id: uuid.UUID,
        current_user_id: uuid.UUID,
    ) -> dict:
        """
        Undo a scheduled cancellation.

        Safe because we only restore invoices that have
        cancelled_by_scheduled_id == contract_id (or linked ordering contract ids).
        """
        from app.modules.contract.models import ContractModel, ContractOrderingLinkModel
        from app.modules.invoice.models import InvoiceModel
        from sqlalchemy import select, update
        from fastapi import HTTPException
        from datetime import date as date_type

        today = date_type.today()

        main_contract = await ContractRepository.get_by_id(db, contract_id)
        if not main_contract:
            raise HTTPException(status_code=404, detail="契約が見つかりません。")

        if main_contract.scheduled_cancellation_date is None:
            raise HTTPException(status_code=400, detail="この契約には解約予定がありません。")

        if main_contract.scheduled_cancellation_date <= today:
            raise HTTPException(
                status_code=400,
                detail="解約予定日が過去のため、解約のキャンセルはできません。",
            )

        # Restore ordering contracts first (cascade)
        ordering_result = await db.execute(
            select(ContractOrderingLinkModel.ordering_contract_id).where(
                ContractOrderingLinkModel.receiving_contract_id == contract_id
            )
        )
        ordering_ids = ordering_result.scalars().all()

        restored_ordering = 0
        restored_invoices = 0

        for oid in ordering_ids:
            ordering_contract = await ContractRepository.get_by_id(db, oid)
            if not ordering_contract:
                continue
            if ordering_contract.scheduled_cancellation_date != main_contract.scheduled_cancellation_date:
                continue  # was scheduled separately, do not undo

            await db.execute(
                update(ContractModel)
                .where(ContractModel.id == oid)
                .values(
                    scheduled_cancellation_date=None,
                    cancellation_reason=None,
                    cancellation_requested_at=None,
                    auto_renew=True,
                )
            )
            restored_ordering += 1

            # Restore invoices soft-cancelled by this ordering contract's scheduled cancel
            inv_result = await db.execute(
                update(InvoiceModel)
                .where(InvoiceModel.cancelled_by_scheduled_id == oid)
                .values(
                    status="AUTO_GENERATED",
                    cancelled_by_scheduled_id=None,
                )
                .returning(InvoiceModel.id)
            )
            restored_invoices += len(inv_result.scalars().all())

        # Restore main contract
        await db.execute(
            update(ContractModel)
            .where(ContractModel.id == contract_id)
            .values(
                scheduled_cancellation_date=None,
                cancellation_reason=None,
                cancellation_requested_at=None,
                auto_renew=True,
            )
        )

        # Restore invoices soft-cancelled by this contract's scheduled cancel
        main_inv_result = await db.execute(
            update(InvoiceModel)
            .where(InvoiceModel.cancelled_by_scheduled_id == contract_id)
            .values(
                status="AUTO_GENERATED",
                cancelled_by_scheduled_id=None,
            )
            .returning(InvoiceModel.id)
        )
        restored_invoices += len(main_inv_result.scalars().all())

        await db.commit()

        return {
            "status": "success",
            "restored_invoices_count": restored_invoices,
            "restored_ordering_count": restored_ordering,
        }


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
        current_user_id: str | None = None,
        current_user_role: str | None = None,
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
            current_user_id=current_user_id,
            current_user_role=current_user_role,
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
            current_user_id=current_user_id,
            current_user_role=current_user_role,
        )
        return items, total

    def _build_contract_snapshot(self, contract: "ContractModel") -> dict:
        """Build a comprehensive snapshot dict of the current contract state.

        Captures all user-visible fields including nested work content details.
        Used as old_value (before update) and new_value (after update) in audit logs.
        Never log sensitive internal IDs or system fields.
        """
        # Base fields
        snapshot: dict = {
            "contract_name": contract.contract_name,
            "status": contract.status,
            "contract_type": contract.contract_type,
            "service_category": contract.service_category,
            "internal_code": contract.internal_code,
            "amount": float(contract.amount) if contract.amount is not None else None,
            "tax_type": contract.tax_type,
            "start_date": str(contract.start_date) if contract.start_date else None,
            "end_date": str(contract.end_date) if contract.end_date else None,
            "work_type": contract.work_type,
            "sub_service_type": contract.sub_service_type,
            "work_execution_date": str(contract.work_execution_date) if contract.work_execution_date else None,
            "work_content_summary": contract.work_content_summary,
            "auto_renew": contract.auto_renew,
            "invoice_required": contract.invoice_required,
        }

        # Work slots (ca làm việc)
        if contract.work_slots:
            snapshot["work_slots"] = [
                {
                    "start_time": str(s.start_time) if s.start_time else None,
                    "end_time": str(s.end_time) if s.end_time else None,
                    "break_minutes": s.break_minutes,
                    "work_duration_hours": float(s.work_duration_hours) if s.work_duration_hours else None,
                }
                for s in sorted(contract.work_slots, key=lambda x: x.sort_order)
            ]

        # Worker counts (số nhân sự)
        if contract.worker_counts:
            snapshot["worker_counts"] = [
                {
                    "worker_count": w.worker_count,
                    "work_duration_hours": float(w.work_duration_hours) if w.work_duration_hours else None,
                    "total_hours": float(w.total_hours) if w.total_hours else None,
                }
                for w in sorted(contract.worker_counts, key=lambda x: x.sort_order)
            ]

        # Holiday rules (quy tắc ngày lễ)
        if contract.holiday_rules:
            snapshot["holiday_rules"] = [
                {"rule_type": h.rule_type, "action": h.action}
                for h in contract.holiday_rules
            ]

        # Periodic schedule (lịch định kỳ)
        if contract.periodic_schedule:
            ps = contract.periodic_schedule
            snapshot["periodic_schedule"] = {
                "frequency_per_year": ps.frequency_per_year,
                "work_months": ps.work_months,
                "work_days": ps.work_days,
            }

        # Periodic work contents (nội dung công việc định kỳ chi tiết)
        if contract.periodic_work_contents:
            snapshot["periodic_work_contents"] = [
                {
                    "floor": p.floor,
                    "area": p.area,
                    "work_content": p.work_content,
                }
                for p in sorted(contract.periodic_work_contents, key=lambda x: x.sort_order)
            ]

        # Daily work contents (nội dung công việc hàng ngày chi tiết)
        if contract.daily_work_contents:
            snapshot["daily_work_contents"] = [
                {
                    "category": d.category,
                    "area": d.area,
                    "work_content": d.work_content,
                    "frequency": d.frequency,
                }
                for d in sorted(contract.daily_work_contents, key=lambda x: x.sort_order)
            ]

        return snapshot

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
        self, db: AsyncSession, name: str, genba_id: uuid.UUID, contract_type: str, exclude_id: uuid.UUID | None = None
    ) -> None:
        """Check if contract name already exists in the same genba for the given contract type."""
        stmt = select(ContractModel).where(
            ContractModel.contract_name == name, 
            ContractModel.genba_id == genba_id,
            ContractModel.contract_type == contract_type
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
            await self._check_duplicate_contract_name(db, contract_name, data.genba_id, data.contract_type)

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

        daily_work_contents_db = []
        if data.daily_work_contents:
            for idx, item in enumerate(data.daily_work_contents):
                daily_work_contents_db.append(
                    ContractDailyWorkContentModel(
                        category=item.category,
                        area=item.area,
                        work_content=item.work_content,
                        frequency=item.frequency,
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
            status=data.initial_status,
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
            daily_work_contents=daily_work_contents_db if daily_work_contents_db else None,
        )

        # Process inline ordering links if this is an ORDERING contract
        if data.contract_type == "ORDERING" and data.ordering_links:
            for link_data in data.ordering_links:
                await ordering_link_repository.create_link(db, created_contract.id, link_data)


        # Audit log — re-fetch to get relations populated before building snapshot
        full_for_snapshot = await ContractRepository.get_with_relations(db, created_contract.id)
        snapshot_target = full_for_snapshot if full_for_snapshot else created_contract
        new_val = self._build_contract_snapshot(snapshot_target)
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="contract",
            entity_id=str(created_contract.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False, default=str),
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

        if contract.status == "CANCELLED":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="解約済みの契約は編集できません。")

        # Validate dates if they are being updated
        start_date = data.start_date if data.start_date is not None else contract.start_date
        end_date = data.end_date if data.end_date is not None else contract.end_date
        if end_date and start_date > end_date:
            raise ValidationError("start_date", "契約開始日は終了日より前の日付にしてください")

        # Snapshot BEFORE applying updates — must happen before any setattr
        old_val = self._build_contract_snapshot(contract)

        if data.contract_name is not None:
            await self._check_duplicate_contract_name(
                db, data.contract_name, contract.genba_id, contract.contract_type, exclude_id=contract.id
            )

        # Apply updates
        import logging; logging.error(f"UPDATE_DATA: {data.model_dump(exclude_unset=True)}"); update_data = data.model_dump(exclude_unset=True)

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

        daily_work_contents_db = None
        if data.daily_work_contents is not None:
            daily_work_contents_db = []
            for idx, item in enumerate(data.daily_work_contents):
                daily_work_contents_db.append(
                    ContractDailyWorkContentModel(
                        category=item.category,
                        area=item.area,
                        work_content=item.work_content,
                        frequency=item.frequency,
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
            "daily_work_contents",
            "ordering_links",
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
            daily_work_contents=daily_work_contents_db,
            clear_periodic=clear_periodic,
        )

        # Update ordering links if this is an ORDERING contract
        if contract.contract_type == "ORDERING" and data.ordering_links is not None:
            from sqlalchemy import delete
            from app.modules.contract.models import ContractOrderingLinkModel
            
            # Delete old links
            stmt = delete(ContractOrderingLinkModel).where(
                ContractOrderingLinkModel.ordering_contract_id == contract.id
            )
            await db.execute(stmt)
            
            # Create new links
            for link_data in data.ordering_links:
                await ordering_link_repository.create_link(db, contract.id, link_data)

        # Re-fetch with all relations eagerly loaded
        contract = await ContractRepository.get_with_relations(db, contract.id)
        if not contract:
            raise NotFoundError("契約が見つかりません")

        # Snapshot AFTER all updates applied (including nested relations)
        new_val = self._build_contract_snapshot(contract)

        # Only write audit log if something actually changed
        if json.dumps(old_val, sort_keys=True, default=str) != json.dumps(new_val, sort_keys=True, default=str):
            await audit_service.log(
                session=db,
                action="UPDATE",
                entity_type="contract",
                entity_id=str(contract.id),
                user_id=user_id,
                old_value=json.dumps(old_val, ensure_ascii=False, default=str),
                new_value=json.dumps(new_val, ensure_ascii=False, default=str),
            )

        # Re-fetch with all relations eagerly loaded so that genba_name,
        # customer_name, partner_name are populated before Pydantic serialization.
        full_contract = await ContractRepository.get_with_relations(db, contract.id)
        return full_contract if full_contract else contract

    async def delete_contract(self, db: AsyncSession, id: uuid.UUID, user_id: str) -> None:
        """Delete an existing contract."""
        contract = await self.get_contract(db, id, user_id)

        if contract.status == "CANCELLED":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="解約済みの契約は削除できません。")

        old_val = self._build_contract_snapshot(contract)
        await ContractRepository.delete_contract(db, contract)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="contract",
            entity_id=str(id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False, default=str),
        )


# Global singleton instance (consistent with other services)
contract_service = ContractService()
