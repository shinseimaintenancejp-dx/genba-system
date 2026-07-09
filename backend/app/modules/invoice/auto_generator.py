"""
Genba Management System — Invoice Auto Generator.

Cron job for automatically generating invoices for active contracts.
Intended to run on the 1st of every month via APScheduler.

HIGH-02 Fix: Acquires a Redis distributed lock before processing to prevent
duplicate invoice generation when running on multiple replicas.
"""

import logging
from datetime import datetime, timezone

from dateutil.relativedelta import relativedelta
from sqlalchemy import select

from app.core.audit import audit_service
from app.core.database import get_db_bypass_rls
from app.core.redis import get_redis, invoice_gen_lock_key
from app.modules.contract.models import ContractModel
from app.modules.invoice.models import InvoiceModel
from app.modules.invoice.repository import invoice_repository

logger = logging.getLogger(__name__)


async def generate_monthly_invoices() -> None:
    """
    Generate invoices for the previous month for all active contracts.
    Intended to be run on the 1st of every month via APScheduler.

    HIGH-02 Fix: Acquires a Redis distributed lock (TTL: 10 min) before
    processing. If another replica has already acquired the lock, this
    invocation exits immediately without generating duplicate invoices.
    """
    logger.info("Starting monthly invoice auto-generation")

    now = datetime.now(timezone.utc)
    # Calculate previous month
    prev_month_date = now - relativedelta(months=1)
    target_year = prev_month_date.year
    target_month = prev_month_date.month

    # Acquire distributed lock to prevent concurrent execution across replicas
    redis_client = await get_redis()
    lock_key = invoice_gen_lock_key(target_year, target_month)

    # Use Redis SET NX with TTL for atomic lock acquisition (10 minute timeout)
    lock_acquired = await redis_client.set(lock_key, "locked", ex=600, nx=True)
    if not lock_acquired:
        logger.info(
            "Invoice auto-generation lock already held — another instance is running. Skipping.",
            extra={"year": target_year, "month": target_month},
        )
        return

    logger.info(
        "Acquired invoice generation lock",
        extra={"year": target_year, "month": target_month, "lock_key": lock_key},
    )

    try:
        # We use a session bypassing RLS because this is a system job
        async for db in get_db_bypass_rls():
            try:
                # Find active contracts requiring invoices
                query = select(ContractModel).where(
                    ContractModel.status == "ACTIVE",
                    ContractModel.invoice_required == True,  # noqa: E712
                )
                result = await db.execute(query)
                contracts = result.scalars().all()

                created_count = 0

                for contract in contracts:
                    invoice_type = "OUTGOING" if contract.contract_type == "RECEIVING" else "INCOMING"

                    # Check if already exists to avoid duplicates
                    existing = await invoice_repository.get_by_period_and_contract(
                        db, contract.id, target_year, target_month, invoice_type
                    )

                    if existing:
                        continue

                    invoice_number = await invoice_repository.get_next_invoice_number(
                        db, invoice_type == "OUTGOING"
                    )
                    tax_amount = float(contract.amount) * 0.1

                    new_invoice = InvoiceModel(
                        invoice_number=invoice_number,
                        invoice_type=invoice_type,
                        issue_date=now.date(),
                        billing_period_year=target_year,
                        billing_period_month=target_month,
                        amount=float(contract.amount),
                        tax_amount=tax_amount,
                        status="AUTO_GENERATED",
                        is_auto_generated=True,
                        contract_id=contract.id,
                    )

                    db.add(new_invoice)
                    await db.flush()

                    # Log system action (user_id=None for system-generated events)
                    await audit_service.log(
                        session=db,
                        action="CREATE",
                        entity_type="invoice",
                        entity_id=str(new_invoice.id),
                        user_id=None,
                    )

                    created_count += 1

                await db.commit()
                logger.info(
                    f"Successfully generated {created_count} invoices for {target_year}-{target_month:02d}"
                )

            except Exception:
                await db.rollback()
                logger.exception(
                    "Failed to auto-generate invoices",
                    extra={"year": target_year, "month": target_month},
                )
                raise

    finally:
        # Always release the lock so next month's run is not blocked
        await redis_client.delete(lock_key)
        logger.info("Released invoice generation lock", extra={"lock_key": lock_key})
