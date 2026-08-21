"""
Genba Management System — Scheduled Cancellation Cron Job.

Runs daily (e.g. via APScheduler or a container cron) to automatically
convert contracts with scheduled_cancellation_date <= TODAY from ACTIVE → CANCELLED.

Usage (manual test):
    python -m app.scripts.run_scheduled_cancellations

Or configure in docker-compose as a separate service that runs this once per day.
"""

import asyncio
import logging
from datetime import date, datetime, timezone

import sqlalchemy as sa
from sqlalchemy import update, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory

logger = logging.getLogger(__name__)


async def process_scheduled_cancellations(db: AsyncSession) -> dict:
    """
    Find all ACTIVE contracts with scheduled_cancellation_date <= today
    and promote them to CANCELLED status.

    Also cancels any remaining DRAFT/AUTO_GENERATED invoices beyond the
    cancellation date that were not yet soft-cancelled at schedule time.

    Returns a summary dict for logging/reporting.
    """
    from app.modules.contract.models import ContractModel, ContractOrderingLinkModel
    from app.modules.invoice.models import InvoiceModel

    today = date.today()
    processed_count = 0
    invoice_count = 0
    errors: list[str] = []

    # Find all contracts due for cancellation today or earlier
    stmt = select(ContractModel).where(
        ContractModel.status == "ACTIVE",
        ContractModel.scheduled_cancellation_date.is_not(None),
        ContractModel.scheduled_cancellation_date <= today,
    )
    result = await db.execute(stmt)
    contracts_to_cancel = result.scalars().all()

    logger.info(
        f"[ScheduledCancellation] Found {len(contracts_to_cancel)} contracts due for cancellation on {today}."
    )

    for contract in contracts_to_cancel:
        try:
            cancel_date = contract.scheduled_cancellation_date

            # Cancel the contract itself
            await db.execute(
                update(ContractModel)
                .where(ContractModel.id == contract.id)
                .values(
                    status="CANCELLED",
                    end_date=cancel_date,
                    scheduled_cancellation_date=None,  # Clear after execution
                )
            )
            processed_count += 1

            # Cancel any remaining DRAFT/AUTO_GENERATED invoices not yet soft-cancelled
            cancel_year = cancel_date.year
            cancel_month = cancel_date.month

            inv_stmt = (
                update(InvoiceModel)
                .where(
                    InvoiceModel.contract_id == contract.id,
                    InvoiceModel.status.in_(["DRAFT", "AUTO_GENERATED"]),
                    sa.or_(
                        InvoiceModel.billing_period_year > cancel_year,
                        sa.and_(
                            InvoiceModel.billing_period_year == cancel_year,
                            InvoiceModel.billing_period_month > cancel_month,
                        ),
                    ),
                )
                .values(status="CANCELLED")
                .returning(InvoiceModel.id)
            )
            inv_result = await db.execute(inv_stmt)
            invoice_count += len(inv_result.scalars().all())

            logger.info(
                f"[ScheduledCancellation] Cancelled contract {contract.id} "
                f"(internal_code={contract.internal_code}) effective {cancel_date}."
            )

        except Exception as exc:
            error_msg = f"Error cancelling contract {contract.id}: {exc!r}"
            logger.error(f"[ScheduledCancellation] {error_msg}")
            errors.append(error_msg)

    await db.commit()

    summary = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "date_checked": today.isoformat(),
        "contracts_cancelled": processed_count,
        "invoices_cancelled": invoice_count,
        "errors": errors,
    }

    logger.info(f"[ScheduledCancellation] Done. Summary: {summary}")
    return summary


async def main() -> None:
    """Entry point for running the cron job manually or from a scheduler."""
    async with async_session_factory() as db:
        summary = await process_scheduled_cancellations(db)
        print(summary)


if __name__ == "__main__":
    asyncio.run(main())
