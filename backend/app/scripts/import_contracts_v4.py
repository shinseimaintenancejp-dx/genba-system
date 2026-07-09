import sys
import os
import csv
import asyncio
from datetime import datetime, time
import logging

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.database import async_session_factory, set_rls_context
from app.modules.genba.models import GenbaModel
from app.modules.contract.models import (
    ContractModel, ContractPeriodicScheduleModel,
    ContractWorkSlotModel, ContractWorkerCountModel
)
from app.modules.contract.repository import ContractRepository
from app.modules.customer.models import CustomerModel, CustomerContactModel
from app.modules.auth.models import UserModel
from app.modules.staff.models import StaffModel
from app.modules.worker.models import WorkerModel
from app.modules.partner.models import PartnerCompanyModel
from sqlalchemy import select, delete

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

CSV_PATH = "/Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/sample_input/imported_contract.csv"

def parse_time(t_str: str):
    if not t_str:
        return None
    try:
        return datetime.strptime(t_str.strip(), "%H:%M").time()
    except ValueError:
        return None

def split_weekdays(days_str: str) -> str:
    if not days_str:
        return ""
    # "月水金" -> "月,水,金"
    return ",".join(list(days_str.strip()))

async def run_import():
    if not os.path.exists(CSV_PATH):
        logging.error(f"CSV file not found at {CSV_PATH}")
        return

    async with async_session_factory() as db:
        await set_rls_context(db, user_id="00000000-0000-0000-0000-000000000000", user_role="ADMIN")
        # Delete all existing DAILY RECEIVING contracts (to reset state)
        stmt = select(ContractModel).where(ContractModel.service_category == "DAILY")
        result = await db.execute(stmt)
        daily_contracts = result.scalars().all()
        
        logging.info(f"Found {len(daily_contracts)} existing DAILY contracts. Deleting...")
        for c in daily_contracts:
            await db.delete(c)
        await db.commit()
        logging.info("Old contracts deleted successfully.")

        # Read CSV and import
        success_count = 0
        error_count = 0
        
        with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    ma_genba = row.get("ma_genba", "").strip()
                    ten_hop_dong = row.get("ten_hop_dong", "").strip()
                    so_lan = row.get("so_lan", "").strip()
                    thoi_gian_str = row.get("thoi_gian", "").strip()
                    thu_lam = row.get("thu_lam", "").strip()
                    gio_bat_dau = row.get("gio_bat_dau", "").strip()
                    gio_ket_thuc = row.get("gio_ket_thuc", "").strip()
                    tien_str = row.get("tien", "").strip()

                    # Find Genba
                    stmt = select(GenbaModel).where(GenbaModel.id == ma_genba)
                    result = await db.execute(stmt)
                    genba = result.scalar_one_or_none()

                    if not genba:
                        logging.warning(f"Genba not found for internal_code={ma_genba}. Skipping.")
                        error_count += 1
                        continue

                    # Parse values
                    import math
                    thoi_gian = float(thoi_gian_str) if thoi_gian_str else 0.0
                    amount = float(tien_str) if tien_str else 0
                    so_lan_rounded = math.ceil(float(so_lan)) if so_lan else None

                    start_time = parse_time(gio_bat_dau)
                    end_time = parse_time(gio_ket_thuc)

                    # Content formatting (e.g. for 午前)
                    work_desc = ""
                    if gio_bat_dau == "午前" or gio_ket_thuc == "午前":
                        work_desc = "午前"
                    elif (gio_bat_dau and not start_time) or (gio_ket_thuc and not end_time):
                        work_desc = f"{gio_bat_dau} - {gio_ket_thuc}"

                    # Calculate break
                    break_minutes = 0
                    if start_time and end_time and thoi_gian > 0:
                        s_min = start_time.hour * 60 + start_time.minute
                        e_min = end_time.hour * 60 + end_time.minute
                        diff = e_min - s_min
                        if diff < 0:
                            diff += 24 * 60
                        break_min = diff - int(thoi_gian * 60)
                        if break_min > 0:
                            break_minutes = break_min

                    # Create Contract
                    from datetime import date
                    internal_code = await ContractRepository.generate_next_internal_code(db)
                    
                    formatted_days = split_weekdays(thu_lam) if thu_lam else None
                    
                    new_contract = ContractModel(
                        internal_code=internal_code,
                        genba_id=genba.id,
                        customer_id=genba.customer_id,
                        contract_name=ten_hop_dong if ten_hop_dong else "日常清掃",
                        contract_type="RECEIVING",
                        service_type="日常清掃",
                        service_category="DAILY",
                        amount=amount,
                        tax_type="EXCLUSIVE",
                        auto_renew=True,
                        invoice_required=True,
                        start_date=date(2024, 4, 1),
                        end_date=date(2025, 3, 31),
                        work_duration_hours=thoi_gian,
                        work_description=work_desc,
                        work_days=formatted_days,
                        weekly_frequency=so_lan_rounded
                    )
                    db.add(new_contract)
                    await db.flush()

                    # Create Work Slot
                    ws_duration = thoi_gian if (not start_time or not end_time) else None
                    
                    slot = ContractWorkSlotModel(
                        contract_id=new_contract.id,
                        start_time=start_time,
                        end_time=end_time,
                        break_minutes=break_minutes,
                        work_duration_hours=ws_duration,
                        sort_order=0
                    )
                    db.add(slot)

                    # Create Worker Count
                    wc = ContractWorkerCountModel(
                        contract_id=new_contract.id,
                        worker_count=1,
                        work_duration_hours=thoi_gian if thoi_gian > 0 else 1.0,
                        total_hours=thoi_gian if thoi_gian > 0 else 1.0,
                        sort_order=0
                    )
                    db.add(wc)

                    success_count += 1
                
                except Exception as e:
                    logging.error(f"Error processing row {row}: {e}")
                    error_count += 1

        await db.commit()
        logging.info(f"Import completed! Successfully imported {success_count} contracts. Errors: {error_count}")

if __name__ == "__main__":
    asyncio.run(run_import())
