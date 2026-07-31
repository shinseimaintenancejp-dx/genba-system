"""
Genba Management System — Contract Module: Repository.

Data access object for contracts (契約).
"""

import uuid
from datetime import datetime, timezone
from typing import Sequence
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload, joinedload
from app.modules.genba.models import GenbaModel, GenbaStaffAssignmentModel
from app.modules.contract.models import (
    ContractModel,
    ContractWorkSlotModel,
    ContractWorkerCountModel,
    ContractHolidayRuleModel,
    ContractPeriodicScheduleModel,
    ContractPeriodicWorkContentModel,
)


class ContractRepository:
    """Repository class for handling DB operations for Contracts."""

    @staticmethod
    async def get_by_id(db: AsyncSession, contract_id: uuid.UUID) -> ContractModel | None:
        """Retrieve a contract by ID."""
        result = await db.execute(
            select(ContractModel)
            .options(
                joinedload(ContractModel.genba),
                joinedload(ContractModel.customer),
                joinedload(ContractModel.partner),
            )
            .where(ContractModel.id == contract_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_with_relations(db: AsyncSession, contract_id: uuid.UUID) -> ContractModel | None:
        """Retrieve a contract by ID, including all nested relations eager-loaded without N+1."""
        stmt = (
            select(ContractModel)
            .where(ContractModel.id == contract_id)
            .options(
                joinedload(ContractModel.genba),
                joinedload(ContractModel.customer),
                joinedload(ContractModel.partner),
                selectinload(ContractModel.work_slots),
                selectinload(ContractModel.worker_counts),
                selectinload(ContractModel.holiday_rules),
                selectinload(ContractModel.periodic_schedule),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def generate_next_internal_code(db: AsyncSession) -> str:
        """Generate the next sequence-based internal contract code: CTR-YYYYMM-XXXX."""
        now = datetime.now(timezone.utc)
        prefix = f"CTR-{now.strftime('%Y%m')}-"
        
        stmt = (
            select(ContractModel.internal_code)
            .where(ContractModel.internal_code.like(f"{prefix}%"))
            .order_by(ContractModel.internal_code.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        last_code = result.scalar_one_or_none()
        
        if last_code:
            try:
                seq_str = last_code.split("-")[-1]
                next_seq = int(seq_str) + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1
            
        return f"{prefix}{next_seq:04d}"

    @staticmethod
    async def list_all(
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
        staff_id: uuid.UUID | None = None,
        periodic_month: int | None = None,
    ) -> Sequence[ContractModel]:
        """List all contracts with filters and pagination, ordered by Genba name."""
        query = (
            select(ContractModel)
            .outerjoin(GenbaModel, ContractModel.genba_id == GenbaModel.id)
            .options(
                joinedload(ContractModel.genba),
                joinedload(ContractModel.customer),
                joinedload(ContractModel.partner),
            )
        )
        
        if staff_id:
            query = query.join(GenbaStaffAssignmentModel, ContractModel.genba_id == GenbaStaffAssignmentModel.genba_id)
            
        if periodic_month:
            query = query.join(ContractPeriodicScheduleModel, ContractModel.id == ContractPeriodicScheduleModel.contract_id)

        filters = []

        if status:
            filters.append(ContractModel.status == status)
        if contract_type:
            filters.append(ContractModel.contract_type == contract_type)
        if genba_id:
            filters.append(ContractModel.genba_id == genba_id)
        if customer_ids:
            filters.append(ContractModel.customer_id.in_(customer_ids))
        elif customer_id:
            filters.append(ContractModel.customer_id == customer_id)
        if partner_id:
            filters.append(ContractModel.partner_id == partner_id)
        if service_category:
            filters.append(ContractModel.service_category == service_category)
        if staff_id:
            filters.append(GenbaStaffAssignmentModel.staff_id == staff_id)
        if periodic_month:
            filters.append(ContractPeriodicScheduleModel.work_months.contains([periodic_month]))
        if search_query:
            filters.append(
                or_(
                    ContractModel.internal_code.ilike(f"%{search_query}%"),
                    ContractModel.external_code.ilike(f"%{search_query}%"),
                    ContractModel.service_type.ilike(f"%{search_query}%"),
                    GenbaModel.property_name.ilike(f"%{search_query}%"),
                )
            )

        if filters:
            query = query.where(and_(*filters))

        query = (
            query.order_by(
                GenbaModel.property_name.asc().nulls_last(),
                ContractModel.internal_code.asc(),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def count_all(
        db: AsyncSession,
        status: str | None = None,
        contract_type: str | None = None,
        genba_id: uuid.UUID | None = None,
        customer_id: uuid.UUID | None = None,
        customer_ids: list[uuid.UUID] | None = None,
        partner_id: uuid.UUID | None = None,
        search_query: str | None = None,
        service_category: str | None = None,
        staff_id: uuid.UUID | None = None,
        periodic_month: int | None = None,
    ) -> int:
        """Count total contracts matching criteria."""
        query = select(func.count()).select_from(ContractModel).outerjoin(GenbaModel, ContractModel.genba_id == GenbaModel.id)
        
        if staff_id:
            query = query.join(GenbaStaffAssignmentModel, ContractModel.genba_id == GenbaStaffAssignmentModel.genba_id)
            
        if periodic_month:
            query = query.join(ContractPeriodicScheduleModel, ContractModel.id == ContractPeriodicScheduleModel.contract_id)

        filters = []

        if status:
            filters.append(ContractModel.status == status)
        if contract_type:
            filters.append(ContractModel.contract_type == contract_type)
        if genba_id:
            filters.append(ContractModel.genba_id == genba_id)
        if customer_ids:
            filters.append(ContractModel.customer_id.in_(customer_ids))
        elif customer_id:
            filters.append(ContractModel.customer_id == customer_id)
        if partner_id:
            filters.append(ContractModel.partner_id == partner_id)
        if service_category:
            filters.append(ContractModel.service_category == service_category)
        if staff_id:
            filters.append(GenbaStaffAssignmentModel.staff_id == staff_id)
        if periodic_month:
            filters.append(ContractPeriodicScheduleModel.work_months.contains([periodic_month]))
        if search_query:
            filters.append(
                or_(
                    ContractModel.internal_code.ilike(f"%{search_query}%"),
                    ContractModel.external_code.ilike(f"%{search_query}%"),
                    ContractModel.service_type.ilike(f"%{search_query}%"),
                    GenbaModel.property_name.ilike(f"%{search_query}%"),
                )
            )

        if filters:
            query = query.where(and_(*filters))

        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def list_by_genba_and_category(
        db: AsyncSession,
        genba_id: uuid.UUID,
        service_category: str,
    ) -> Sequence[ContractModel]:
        """List contracts for a specific genba filtered by service category."""
        query = (
            select(ContractModel)
            .options(
                joinedload(ContractModel.genba),
                joinedload(ContractModel.customer),
                joinedload(ContractModel.partner),
            )
            .where(
                and_(
                    ContractModel.genba_id == genba_id,
                    ContractModel.service_category == service_category,
                )
            )
            .order_by(ContractModel.internal_code)
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create(db: AsyncSession, model: ContractModel) -> ContractModel:
        """Create a new contract."""
        db.add(model)
        await db.flush()
        return model

    @staticmethod
    async def create_with_relations(
        db: AsyncSession,
        contract: ContractModel,
        work_slots: list[ContractWorkSlotModel] | None = None,
        worker_counts: list[ContractWorkerCountModel] | None = None,
        holiday_rules: list[ContractHolidayRuleModel] | None = None,
        periodic_schedule: ContractPeriodicScheduleModel | None = None,
        periodic_work_contents: list[ContractPeriodicWorkContentModel] | None = None,
    ) -> ContractModel:
        """Create a new contract along with its nested records in a single transaction."""
        contract.work_slots = work_slots if work_slots is not None else []
        contract.worker_counts = worker_counts if worker_counts is not None else []
        contract.holiday_rules = holiday_rules if holiday_rules is not None else []
        contract.periodic_schedule = periodic_schedule
        contract.periodic_work_contents = periodic_work_contents if periodic_work_contents is not None else []

        db.add(contract)
        await db.flush()
        return contract

    @staticmethod
    async def update_with_relations(
        db: AsyncSession,
        contract: ContractModel,
        work_slots: list[ContractWorkSlotModel] | None = None,
        worker_counts: list[ContractWorkerCountModel] | None = None,
        holiday_rules: list[ContractHolidayRuleModel] | None = None,
        periodic_schedule: ContractPeriodicScheduleModel | None = None,
        periodic_work_contents: list[ContractPeriodicWorkContentModel] | None = None,
        clear_periodic: bool = False,
    ) -> ContractModel:
        """Update a contract by replacing its nested records using soft delete."""
        now = datetime.now(timezone.utc)

        # Soft delete các bản ghi cũ trước
        if work_slots is not None:
            for slot in contract.work_slots:
                slot.deleted_at = now

        if worker_counts is not None:
            for count in contract.worker_counts:
                count.deleted_at = now

        if holiday_rules is not None:
            for rule in contract.holiday_rules:
                rule.deleted_at = now

        if periodic_work_contents is not None:
            for pwc in contract.periodic_work_contents:
                pwc.deleted_at = now

        await db.flush()  # Đảm bảo UPDATE (soft delete) xảy ra trước INSERT

        # Thêm bản ghi mới (active)
        if work_slots is not None:
            contract.work_slots = work_slots
        if worker_counts is not None:
            contract.worker_counts = worker_counts
        if holiday_rules is not None:
            contract.holiday_rules = holiday_rules
        if periodic_work_contents is not None:
            contract.periodic_work_contents = periodic_work_contents

        # Xử lý periodic schedule 1-1
        if clear_periodic and contract.periodic_schedule:
            contract.periodic_schedule.deleted_at = now
        elif periodic_schedule is not None:
            if contract.periodic_schedule:
                # Update in place to avoid unique constraint violation on contract_id
                contract.periodic_schedule.frequency_per_year = periodic_schedule.frequency_per_year
                contract.periodic_schedule.work_months = periodic_schedule.work_months
                contract.periodic_schedule.work_days = periodic_schedule.work_days
                contract.periodic_schedule.deleted_at = None
                contract.periodic_schedule.updated_at = now
            else:
                contract.periodic_schedule = periodic_schedule

        await db.flush()
        return contract

    @staticmethod
    async def delete_contract(db: AsyncSession, contract: ContractModel) -> None:
        """Delete an existing contract."""
        await db.delete(contract)
        await db.flush()
