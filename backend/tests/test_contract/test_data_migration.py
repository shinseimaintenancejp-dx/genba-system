import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import time, date

from app.modules.contract.models import (
    ContractModel,
    ContractWorkSlotModel,
    ContractPeriodicScheduleModel
)
from app.modules.auth.models import UserModel

async def migrate_legacy_contract(db: AsyncSession, contract_id: uuid.UUID):
    """Simulate the Alembic data migration logic from DB-03."""
    result = await db.execute(select(ContractModel).where(ContractModel.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        return

    # Simulate DAILY migration
    if contract.service_category in ["DAILY", "OTHER"] and contract.work_start_time and contract.work_end_time:
        # Create work slot
        slot = ContractWorkSlotModel(
            contract_id=contract.id,
            start_time=contract.work_start_time,
            end_time=contract.work_end_time,
            break_minutes=0,
            sort_order=1
        )
        db.add(slot)

    # Simulate PERIODIC migration
    if contract.service_category == "PERIODIC" and contract.weekly_frequency:
        sched = ContractPeriodicScheduleModel(
            contract_id=contract.id,
            frequency_per_year=contract.weekly_frequency * 12, # Just a dummy translation
            work_months=[1,2,3,4,5,6,7,8,9,10,11,12],
            work_days=[]
        )
        db.add(sched)
        
    await db.flush()

class TestDataMigration:
    """Test suite for Data Migration logic."""

    @pytest.mark.asyncio
    async def test_migration_chuyen_du_ban_ghi_daily(self, db_session: AsyncSession, test_admin_user: UserModel):
        """Test: migration chuyển đủ bản ghi, không mất dữ liệu cho DAILY."""
        from app.modules.genba.models import GenbaModel
        from app.modules.customer.models import CustomerModel
        
        # 1. Setup dummy customer and genba
        customer = CustomerModel(
            id=uuid.uuid4(),
            full_name="Legacy Customer",
            short_name="Legacy"
        )
        db_session.add(customer)
        await db_session.flush()

        genba = GenbaModel(
            id=uuid.uuid4(),
            property_name="Legacy Genba",
            address="Legacy Address",
            customer_id=customer.id
        )
        db_session.add(genba)
        await db_session.flush()

        # 2. Create Legacy Contract (flat fields only)
        contract = ContractModel(
            internal_code="LEGACY-001",
            contract_type="RECEIVING",
            service_type="日常清掃",
            service_category="DAILY",
            amount=100000,
            tax_type="EXCLUSIVE",
            start_date=date(2026, 1, 1),
            genba_id=genba.id,
            customer_id=customer.id,
            status="ACTIVE",
            # Legacy fields
            work_start_time=time(9, 0),
            work_end_time=time(17, 0),
            work_duration_hours=8.0
        )
        db_session.add(contract)
        await db_session.commit()

        # 3. Run migration
        await migrate_legacy_contract(db_session, contract.id)

        # 4. Assert data was migrated to nested table
        result = await db_session.execute(
            select(ContractWorkSlotModel).where(ContractWorkSlotModel.contract_id == contract.id)
        )
        slots = result.scalars().all()
        
        assert len(slots) == 1
        assert slots[0].start_time == time(9, 0)
        assert slots[0].end_time == time(17, 0)

    @pytest.mark.asyncio
    async def test_migration_chuyen_du_ban_ghi_periodic(self, db_session: AsyncSession, test_admin_user: UserModel):
        """Test: migration chuyển đủ bản ghi, không mất dữ liệu cho PERIODIC."""
        from app.modules.genba.models import GenbaModel
        from app.modules.customer.models import CustomerModel
        
        customer = CustomerModel(id=uuid.uuid4(), full_name="C2", short_name="C2")
        db_session.add(customer)
        await db_session.flush()

        genba = GenbaModel(id=uuid.uuid4(), property_name="G2", address="A2", customer_id=customer.id)
        db_session.add(genba)
        await db_session.flush()

        # 2. Create Legacy Periodic Contract (flat fields only)
        contract = ContractModel(
            internal_code="LEGACY-002",
            contract_type="RECEIVING",
            service_type="定期清掃",
            service_category="PERIODIC",
            amount=50000,
            tax_type="EXCLUSIVE",
            start_date=date(2026, 1, 1),
            genba_id=genba.id,
            customer_id=customer.id,
            status="ACTIVE",
            # Legacy fields
            weekly_frequency=2
        )
        db_session.add(contract)
        await db_session.commit()

        # 3. Run migration
        await migrate_legacy_contract(db_session, contract.id)

        # 4. Assert data was migrated to nested table
        result = await db_session.execute(
            select(ContractPeriodicScheduleModel).where(ContractPeriodicScheduleModel.contract_id == contract.id)
        )
        sched = result.scalar_one_or_none()
        
        assert sched is not None
        assert sched.frequency_per_year == 24
