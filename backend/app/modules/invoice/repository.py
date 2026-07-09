"""
Genba Management System — Invoice Repository.

HIGH-01 Fix: Invoice number generation uses pg_advisory_xact_lock to prevent
TOCTOU race conditions when concurrent requests generate numbers simultaneously.
"""

import uuid
from typing import Sequence

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.invoice.models import InvoiceModel


class InvoiceRepository:
    """Repository for Invoice operations."""

    async def get_by_id(self, db: AsyncSession, invoice_id: uuid.UUID) -> InvoiceModel | None:
        query = select(InvoiceModel).where(InvoiceModel.id == invoice_id)
        result = await db.execute(query)
        return result.scalars().first()

    async def list_by_contract(self, db: AsyncSession, contract_id: uuid.UUID) -> Sequence[InvoiceModel]:
        query = (
            select(InvoiceModel)
            .where(InvoiceModel.contract_id == contract_id)
            .order_by(InvoiceModel.billing_period_year.desc(), InvoiceModel.billing_period_month.desc())
        )
        result = await db.execute(query)
        return result.scalars().all()

    async def get_by_period_and_contract(
        self, db: AsyncSession, contract_id: uuid.UUID, year: int, month: int, type: str
    ) -> InvoiceModel | None:
        query = select(InvoiceModel).where(
            InvoiceModel.contract_id == contract_id,
            InvoiceModel.billing_period_year == year,
            InvoiceModel.billing_period_month == month,
            InvoiceModel.invoice_type == type,
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def create(self, db: AsyncSession, invoice: InvoiceModel) -> InvoiceModel:
        db.add(invoice)
        await db.flush()
        return invoice

    async def update(self, db: AsyncSession, invoice: InvoiceModel) -> InvoiceModel:
        db.add(invoice)
        await db.flush()
        return invoice

    async def delete(self, db: AsyncSession, invoice: InvoiceModel) -> None:
        await db.delete(invoice)
        await db.flush()

    async def get_next_invoice_number(self, db: AsyncSession, is_outgoing: bool) -> str:
        """
        Generate a unique sequential invoice number atomically.

        HIGH-01 Fix: Uses pg_advisory_xact_lock to serialize concurrent calls
        within the same transaction, preventing TOCTOU race conditions that
        would produce duplicate invoice numbers under concurrent load.

        Lock key is deterministic per direction (IN/OUT) so OUTGOING and
        INCOMING generation can proceed concurrently without blocking each other.

        Format: INV-{OUT|IN}-{YYYYMMDD}-{NNNN}
        Example: INV-OUT-20260617-0001
        """
        import pytz
        from datetime import datetime

        jst = pytz.timezone("Asia/Tokyo")
        today = datetime.now(jst).strftime("%Y%m%d")

        direction = "OUT" if is_outgoing else "IN"
        prefix = f"INV-{direction}-{today}-"

        # Acquire transaction-scoped advisory lock to serialize invoice number
        # generation for this direction. Lock is automatically released at
        # transaction end — no explicit unlock needed.
        # Lock key: hashtext of unique string per direction to avoid collisions.
        lock_key = "invoice_number_out" if is_outgoing else "invoice_number_in"
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
            {"lock_key": lock_key},
        )

        # Safe to read-then-increment — lock prevents concurrent execution
        query = select(InvoiceModel.invoice_number).where(
            InvoiceModel.invoice_number.like(f"{prefix}%")
        ).order_by(InvoiceModel.invoice_number.desc())

        result = await db.execute(query)
        last_number = result.scalars().first()

        if last_number:
            try:
                sequence = int(last_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                sequence = 1
        else:
            sequence = 1

        return f"{prefix}{sequence:04d}"


invoice_repository = InvoiceRepository()
