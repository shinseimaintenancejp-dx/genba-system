import asyncio
import os
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Assuming backend container env vars
DB_USER = os.getenv("DB_USER", "genba_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "genba_management")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

async def run_fix():
    print(f"Connecting to {DATABASE_URL} ...")
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    ordering_contract_id = "3001dbb9-06e8-4480-a5d6-dbc4b5a0f4bd"
    receiving_contract_id = "92a1d0b1-a75f-4167-b69f-46bdffcc8850"
    
    async with async_session() as session:
        # Check if already exists
        check_stmt = text("SELECT id FROM contract_ordering_links WHERE ordering_contract_id = :ordering_id")
        result = await session.execute(check_stmt, {"ordering_id": ordering_contract_id})
        existing = result.fetchone()
        
        if existing:
            print(f"Link already exists with ID: {existing[0]}")
            return
        
        # Insert
        insert_stmt = text("""
            INSERT INTO contract_ordering_links 
            (id, ordering_contract_id, receiving_contract_id, assignment_type, allocated_amount, created_at, updated_at)
            VALUES 
            (:id, :ordering_id, :receiving_id, 'FULL', :amount, NOW(), NOW())
        """)
        
        link_id = str(uuid.uuid4())
        await session.execute(insert_stmt, {
            "id": link_id,
            "ordering_id": ordering_contract_id,
            "receiving_id": receiving_contract_id,
            "amount": Decimal("18000.00")
        })
        
        await session.commit()
        print(f"Successfully inserted ordering link! ID: {link_id}")

if __name__ == "__main__":
    asyncio.run(run_fix())
