import sys
import os
import asyncio
import uuid
import pandas as pd
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.config import settings
from app.modules.customer.models import CustomerModel
from app.modules.genba.models import GenbaModel
from app.modules.contract.models import ContractModel, ContractPeriodicScheduleModel
from app.modules.staff.models import StaffModel
from app.modules.worker.models import WorkerModel
from app.modules.partner.models import PartnerCompanyModel
from app.modules.auth.models import UserModel

async def main():
    print("BẮT ĐẦU SPRINT 13: Import Hợp đồng Vệ sinh Định kỳ (Toàn bộ các Sheet)")
    
    engine = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    excel_path = '/Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/sample_input/全物件HZ0_cleaned01.xlsx'
    if not os.path.exists(excel_path):
        print(f"File không tồn tại: {excel_path}")
        return
        
    # Đọc tất cả các sheet
    dfs = pd.read_excel(excel_path, sheet_name=None)
    
    async with async_session() as session:
        # Load customers map
        cust_res = await session.execute(select(CustomerModel))
        customers = cust_res.scalars().all()
        cust_map = {c.short_name: c.id for c in customers}
        
        # Load genbas map
        genba_res = await session.execute(select(GenbaModel))
        genbas = genba_res.scalars().all()
        genba_map_by_id = {str(g.id): g for g in genbas}
        genba_map_by_name = {g.property_name: g for g in genbas}
        
        genba_created = 0
        contract_created = 0
        
        # Pass 1: Count total occurrences of (genba_name, shiyou) across all sheets
        total_counts = {}
        
        for sheet_name, df in dfs.items():
            for index, row in df.iterrows():
                property_name = row.get('物件名')
                shiyou = row.get('仕様')
                if pd.notna(property_name) and pd.notna(shiyou):
                    property_name = str(property_name).strip()
                    shiyou = str(shiyou).strip()
                    
                    if property_name not in total_counts:
                        total_counts[property_name] = {}
                    if shiyou not in total_counts[property_name]:
                        total_counts[property_name][shiyou] = 1
                    else:
                        total_counts[property_name][shiyou] += 1
        
        # Pass 2: Actually create the contracts
        contract_counters = {}
        
        for sheet_name, df in dfs.items():
            print(f"--- Đang xử lý Sheet: {sheet_name} ---")
            
            for index, row in df.iterrows():
                branch_name = row.get('支店')
                genba_id_str = row.get('id')
                property_name = row.get('物件名')
                shiyou = row.get('仕様')
                price = row.get('請求金額')
                bikou = row.get('備考')
                
                # Handling MCD variants
                mcd_val = row.get('MCD')
                if pd.isna(mcd_val):
                    mcd_val = row.get('ＭＣＤ')
                if pd.isna(mcd_val):
                    mcd_val = row.get('ＭCD')
                
                if pd.isna(branch_name) or pd.isna(property_name) or pd.isna(shiyou):
                    continue
                    
                property_name = str(property_name).strip()
                
                # Customer handling
                branch_name = str(branch_name).strip()
                customer_id = cust_map.get(branch_name)
                
                # Note handling
                bikou_str = str(bikou).strip() if pd.notna(bikou) else None
                
                # MCD handling
                mcd_str = None
                if pd.notna(mcd_val):
                    # convert float '70001231.0' to string '70001231'
                    mcd_str = str(mcd_val).replace('.0', '').strip()
                
                # Genba handling
                genba_id = None
                genba_obj = None
                if pd.notna(genba_id_str) and str(genba_id_str).strip() != "":
                    genba_id_str = str(genba_id_str).strip()
                    if genba_id_str in genba_map_by_id:
                        genba_obj = genba_map_by_id[genba_id_str]
                        genba_id = genba_obj.id
                
                if not genba_id:
                    if property_name in genba_map_by_name:
                        genba_obj = genba_map_by_name[property_name]
                        genba_id = genba_obj.id
                    else:
                        new_genba = GenbaModel(
                            property_name=property_name,
                            address='未設定',
                            customer_id=customer_id,
                            special_notes=bikou_str,
                            external_partner_code=mcd_str
                        )
                        session.add(new_genba)
                        await session.flush()  # to get new_genba.id
                        genba_obj = new_genba
                        genba_id = new_genba.id
                        genba_map_by_name[property_name] = new_genba
                        genba_map_by_id[str(genba_id)] = new_genba
                        genba_created += 1
                
                # Update external partner code if missing
                if genba_obj and mcd_str and not genba_obj.external_partner_code:
                    genba_obj.external_partner_code = mcd_str
                    session.add(genba_obj)

                # Append special note if not present
                if genba_obj and bikou_str:
                    current_notes = genba_obj.special_notes or ""
                    if bikou_str not in current_notes:
                        if current_notes:
                            genba_obj.special_notes = current_notes + "\n" + bikou_str
                        else:
                            genba_obj.special_notes = bikou_str
                        session.add(genba_obj)
                        
                # Track duplicate contract names
                shiyou = str(shiyou).strip()
                if property_name not in contract_counters:
                    contract_counters[property_name] = {}
                
                if shiyou not in contract_counters[property_name]:
                    contract_counters[property_name][shiyou] = 1
                else:
                    contract_counters[property_name][shiyou] += 1
                
                current_count = contract_counters[property_name][shiyou]
                total_for_this = total_counts[property_name][shiyou]
                
                if total_for_this == 1:
                    contract_name = shiyou
                else:
                    contract_name = f"{shiyou} {current_count}"
                    
                service_type = shiyou
                
                # Safely handle commission fee (price)
                amount = 0.0
                if pd.notna(price):
                    price_str = str(price).replace(',', '').strip()
                    try:
                        amount = float(price_str)
                    except ValueError:
                        amount = 0.0
                        
                # Identify months
                work_months = []
                month_cols = [('4月', 4), ('5月', 5), ('6月', 6), ('7月', 7), ('8月', 8), ('9月', 9), 
                              ('10月', 10), ('11月', 11), ('12月', 12), ('1月', 1), ('2月', 2), ('3月', 3)]
                for col_name, month_num in month_cols:
                    val = row.get(col_name)
                    if pd.notna(val) and str(val).strip() != "":
                        work_months.append(month_num)
                
                internal_code = "TEIKI-" + str(uuid.uuid4())[:8].upper()
                
                new_contract = ContractModel(
                    internal_code=internal_code,
                    contract_type="RECEIVING",
                    service_category="PERIODIC",
                    service_type=service_type,
                    contract_name=contract_name,
                    amount=amount,
                    start_date=date(2026, 4, 1),
                    customer_id=customer_id,
                    genba_id=genba_id,
                    partner_id=None,
                    work_content_summary=bikou_str
                )
                session.add(new_contract)
                await session.flush()
                
                # Schedule
                new_schedule = ContractPeriodicScheduleModel(
                    contract_id=new_contract.id,
                    frequency_per_year=len(work_months),
                    work_months=work_months,
                    work_days=[]
                )
                session.add(new_schedule)
                contract_created += 1
            
        await session.commit()
        print(f"Hoàn thành Import! Đã tạo {genba_created} Genba mới và {contract_created} Hợp đồng định kỳ mới.")

if __name__ == "__main__":
    asyncio.run(main())
