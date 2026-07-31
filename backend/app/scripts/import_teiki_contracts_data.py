"""
Genba Management System — Import Teiki (Periodic) Contracts Data Script.

Imports periodic contracts from sample_input/teiki_contracts_export.json into PostgreSQL database.
Compatible with any server or deployment environment.
"""

import sys
import os
import json
import asyncio
import uuid
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.config import settings
from app.modules.contract.models import ContractModel, ContractPeriodicScheduleModel
from app.modules.genba.models import GenbaModel
from app.modules.customer.models import CustomerModel


async def import_teiki_data(json_file_path: str = None):
    print("=== START IMPORT: Teiki (Periodic) Contracts Data ===")

    if json_file_path is None:
        json_file_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '../../../sample_input/teiki_contracts_export.json')
        )

    if not os.path.exists(json_file_path):
        print(f"File not found: {json_file_path}")
        return

    with open(json_file_path, 'r', encoding='utf-8') as f:
        records = json.load(f)

    db_url = settings.DATABASE_URL
    if "db:5432" in db_url and not os.getenv("RUNNING_IN_DOCKER"):
        db_url = db_url.replace("db:5432", "localhost:5432")
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(db_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        # Load maps
        cust_res = await session.execute(select(CustomerModel))
        customers = cust_res.scalars().all()
        cust_map_by_name = {c.short_name: c for c in customers}
        cust_map_by_id = {str(c.id): c for c in customers}

        genba_res = await session.execute(select(GenbaModel))
        genbas = genba_res.scalars().all()
        genba_map_by_name = {g.property_name: g for g in genbas}
        genba_map_by_id = {str(g.id): g for g in genbas}

        contracts_imported = 0
        genba_created = 0

        for r in records:
            # 1. Customer resolution
            cust_data = r.get("customer")
            customer_id = None
            if cust_data:
                cust_id_str = cust_data.get("id")
                cust_short = cust_data.get("short_name")
                if cust_id_str and cust_id_str in cust_map_by_id:
                    customer_id = cust_map_by_id[cust_id_str].id
                elif cust_short and cust_short in cust_map_by_name:
                    customer_id = cust_map_by_name[cust_short].id

            # 2. Genba resolution
            genba_data = r.get("genba")
            genba_id = None
            if genba_data:
                g_id_str = genba_data.get("id")
                g_prop_name = genba_data.get("property_name")
                g_address = genba_data.get("address") or "未設定"
                g_notes = genba_data.get("special_notes")
                g_mcd = genba_data.get("external_partner_code")

                if g_id_str and g_id_str in genba_map_by_id:
                    genba_id = genba_map_by_id[g_id_str].id
                elif g_prop_name and g_prop_name in genba_map_by_name:
                    genba_id = genba_map_by_name[g_prop_name].id
                elif g_prop_name:
                    new_genba = GenbaModel(
                        property_name=g_prop_name,
                        address=g_address,
                        customer_id=customer_id,
                        special_notes=g_notes,
                        external_partner_code=g_mcd,
                    )
                    session.add(new_genba)
                    await session.flush()
                    genba_id = new_genba.id
                    genba_map_by_name[g_prop_name] = new_genba
                    genba_map_by_id[str(genba_id)] = new_genba
                    genba_created += 1

            # 3. Check existing contract by internal_code or contract_id
            c_id = uuid.UUID(r["contract_id"]) if r.get("contract_id") else uuid.uuid4()
            existing_res = await session.execute(
                select(ContractModel).where(ContractModel.id == c_id)
            )
            existing_contract = existing_res.scalar_one_or_none()

            sched_data = r.get("schedule") or {}
            work_months = sched_data.get("work_months", [])
            freq = sched_data.get("frequency_per_year", len(work_months))

            start_dt = date.fromisoformat(r["start_date"]) if r.get("start_date") else date(2026, 4, 1)

            if not existing_contract:
                contract = ContractModel(
                    id=c_id,
                    internal_code=r.get("internal_code") or f"TEIKI-{str(c_id)[:8].upper()}",
                    external_code=r.get("external_code"),
                    contract_type=r.get("contract_type", "RECEIVING"),
                    service_category="PERIODIC",
                    service_type=r.get("service_type", "定期清掃"),
                    contract_name=r.get("contract_name", "定期清掃"),
                    amount=r.get("amount", 0.0),
                    start_date=start_dt,
                    customer_id=customer_id,
                    genba_id=genba_id,
                    work_content_summary=r.get("work_content_summary"),
                    status=r.get("status", "ACTIVE"),
                )
                session.add(contract)
                await session.flush()

                schedule = ContractPeriodicScheduleModel(
                    contract_id=contract.id,
                    frequency_per_year=freq,
                    work_months=work_months,
                    work_days=sched_data.get("work_days", []),
                )
                session.add(schedule)
                contracts_imported += 1

        await session.commit()
        print(f"✓ Import finished successfully!")
        print(f"  - New Genba created: {genba_created}")
        print(f"  - Contracts imported: {contracts_imported}")


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(import_teiki_data(filepath))
