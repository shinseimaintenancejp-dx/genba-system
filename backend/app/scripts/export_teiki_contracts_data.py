"""
Genba Management System — Export Teiki (Periodic) Contracts Data Script.

Exports all periodic contracts, associated schedules, genba, and customer data
to sample_input/teiki_contracts_export.json and sample_input/teiki_contracts_export.csv.
"""

import sys
import os
import json
import asyncio
import pandas as pd
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.config import settings
from app.modules.contract.models import ContractModel
from app.modules.genba.models import GenbaModel
from app.modules.customer.models import CustomerModel


async def export_teiki_data():
    print("=== START EXPORT: Teiki (Periodic) Contracts Data ===")

    # Handle local vs docker database URL
    db_url = settings.DATABASE_URL
    if "db:5432" in db_url:
        db_url = db_url.replace("db:5432", "localhost:5432")
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(db_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    output_json_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '../../../sample_input/teiki_contracts_export.json')
    )
    output_csv_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '../../../sample_input/teiki_contracts_export.csv')
    )

    async with async_session() as session:
        stmt = (
            select(ContractModel)
            .where(ContractModel.service_category == 'PERIODIC')
            .options(
                selectinload(ContractModel.periodic_schedule),
                selectinload(ContractModel.genba),
                selectinload(ContractModel.customer),
            )
            .order_by(ContractModel.created_at)
        )

        result = await session.execute(stmt)
        contracts = result.scalars().all()

        export_records = []
        csv_rows = []

        for c in contracts:
            work_months = c.periodic_schedule.work_months if c.periodic_schedule else []
            freq = c.periodic_schedule.frequency_per_year if c.periodic_schedule else len(work_months)

            record = {
                "contract_id": str(c.id),
                "internal_code": c.internal_code,
                "external_code": c.external_code,
                "contract_type": c.contract_type,
                "service_category": c.service_category,
                "service_type": c.service_type,
                "contract_name": c.contract_name,
                "amount": float(c.amount) if c.amount is not None else 0.0,
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "end_date": c.end_date.isoformat() if c.end_date else None,
                "auto_renew": c.auto_renew,
                "status": c.status,
                "work_content_summary": c.work_content_summary,
                "customer": {
                    "id": str(c.customer.id) if c.customer else None,
                    "full_name": c.customer.full_name if c.customer else None,
                    "short_name": c.customer.short_name if c.customer else None,
                    "branch_name": c.customer.branch_name if c.customer else None,
                } if c.customer else None,
                "genba": {
                    "id": str(c.genba.id) if c.genba else None,
                    "property_name": c.genba.property_name if c.genba else None,
                    "address": c.genba.address if c.genba else None,
                    "special_notes": c.genba.special_notes if c.genba else None,
                    "external_partner_code": c.genba.external_partner_code if c.genba else None,
                } if c.genba else None,
                "schedule": {
                    "frequency_per_year": freq,
                    "work_months": work_months,
                    "work_days": c.periodic_schedule.work_days if c.periodic_schedule else [],
                } if c.periodic_schedule else None,
            }
            export_records.append(record)

            # Flatten for CSV export
            csv_row = {
                "Hợp đồng ID": str(c.id),
                "Mã nội bộ": c.internal_code,
                "Loại HĐ": c.contract_type,
                "Tên hợp đồng (仕様)": c.contract_name,
                "Dịch vụ": c.service_type,
                "Số tiền (請求金額)": float(c.amount) if c.amount is not None else 0.0,
                "Số lần/năm": freq,
                "Tên Genba (物件名)": c.genba.property_name if c.genba else "",
                "MCD": c.genba.external_partner_code if c.genba else "",
                "Khách hàng (取引先/支店)": c.customer.short_name if c.customer else "",
                "Ghi chú (備考)": c.work_content_summary or "",
                "Tháng 4": "⚫︎" if 4 in work_months else "-",
                "Tháng 5": "⚫︎" if 5 in work_months else "-",
                "Tháng 6": "⚫︎" if 6 in work_months else "-",
                "Tháng 7": "⚫︎" if 7 in work_months else "-",
                "Tháng 8": "⚫︎" if 8 in work_months else "-",
                "Tháng 9": "⚫︎" if 9 in work_months else "-",
                "Tháng 10": "⚫︎" if 10 in work_months else "-",
                "Tháng 11": "⚫︎" if 11 in work_months else "-",
                "Tháng 12": "⚫︎" if 12 in work_months else "-",
                "Tháng 1": "⚫︎" if 1 in work_months else "-",
                "Tháng 2": "⚫︎" if 2 in work_months else "-",
                "Tháng 3": "⚫︎" if 3 in work_months else "-",
            }
            csv_rows.append(csv_row)

        # Ensure parent output directory exists
        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)

        # Write JSON
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(export_records, f, ensure_ascii=False, indent=2)

        # Write CSV
        df = pd.DataFrame(csv_rows)
        df.to_csv(output_csv_path, index=False, encoding='utf-8-sig')

        print(f"✓ JSON Exported successfully: {output_json_path} ({len(export_records)} items)")
        print(f"✓ CSV Exported successfully: {output_csv_path} ({len(csv_rows)} rows)")


if __name__ == "__main__":
    asyncio.run(export_teiki_data())
