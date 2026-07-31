import sys
import os
import asyncio
import pandas as pd
import glob
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.config import settings
from app.modules.partner.models import PartnerCompanyModel

async def main():
    print("Starting partner import...")
    
    # Setup DB
    engine = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    # Read Excel
    files = glob.glob(os.path.join(os.path.dirname(__file__), '../../../sample_input/*会員名簿*.xlsx'))
    if not files:
        print("Could not find the Excel file for partners.")
        return
        
    excel_path = files[0]
    print(f"Reading from {excel_path}")
    
    df = pd.read_excel(excel_path, skiprows=2)
    # columns: ['会社名', '役員', '氏名', '郵便番号', '住所', '電話番号', '携帯番号', 'FAX番号']
    
    # Iterating through dataframe and checking nan
    
    imported_count = 0
    updated_count = 0
    
    async with async_session() as session:
        for index, row in df.iterrows():
            company_name = row.get('会社名')
            if pd.isna(company_name):
                continue
                
            executive = row.get('役員')
            executive = str(executive).strip() if pd.notna(executive) else None
            contact_person = row.get('氏名')
            contact_person = str(contact_person).strip() if pd.notna(contact_person) else None
            postal_code = row.get('郵便番号')
            postal_code = str(postal_code).strip() if pd.notna(postal_code) else None
            address = row.get('住所')
            address = str(address).strip() if pd.notna(address) else None
            phone = row.get('電話番号')
            phone = str(phone).strip() if pd.notna(phone) else None
            mobile = row.get('携帯番号')
            mobile = str(mobile).strip() if pd.notna(mobile) else None
            fax = row.get('FAX番号')
            fax = str(fax).strip() if pd.notna(fax) else None
            
            # Check if company already exists
            stmt = select(PartnerCompanyModel).where(PartnerCompanyModel.company_name == company_name)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                existing.executive = executive
                existing.contact_person = contact_person
                existing.postal_code = postal_code
                existing.address = address
                existing.phone = phone
                existing.mobile = mobile
                existing.fax = fax
                updated_count += 1
            else:
                new_partner = PartnerCompanyModel(
                    company_name=company_name,
                    executive=executive,
                    contact_person=contact_person,
                    postal_code=postal_code,
                    address=address,
                    phone=phone,
                    mobile=mobile,
                    fax=fax
                )
                session.add(new_partner)
                imported_count += 1
                
        await session.commit()
    
    print(f"Successfully imported {imported_count} new partners, updated {updated_count} existing partners.")

if __name__ == "__main__":
    asyncio.run(main())
