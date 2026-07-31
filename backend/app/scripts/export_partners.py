import sys
import os
import asyncio
import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.config import settings
from app.modules.partner.models import PartnerCompanyModel

async def main():
    print("Starting partner export...")
    
    # Setup DB
    engine = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        stmt = select(PartnerCompanyModel)
        result = await session.execute(stmt)
        partners = result.scalars().all()
        
        data = []
        for p in partners:
            data.append({
                "Partner ID (Mã công ty)": str(p.id),
                "会社名": p.company_name,
                "役員": p.executive,
                "氏名": p.contact_person,
                "郵便番号": p.postal_code,
                "住所": p.address,
                "電話番号": p.phone,
                "携帯番号": p.mobile,
                "FAX番号": p.fax,
                "Email": p.email,
                "Trạng thái hoạt động": "Active" if p.is_active else "Inactive",
                "Ngày tạo": p.created_at.strftime("%Y-%m-%d %H:%M:%S") if p.created_at else ""
            })
            
        df = pd.DataFrame(data)
        out_path = '/Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/sample_input/exported_partners.csv'
        df.to_csv(out_path, index=False, encoding='utf-8-sig')
        print(f"Exported {len(data)} partners to {out_path}")

if __name__ == "__main__":
    asyncio.run(main())
