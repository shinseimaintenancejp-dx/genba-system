"""Add scheduled cancellation fields to contracts and cancelled_by_scheduled_id to invoices.

Revision ID: d1e2f3a4b5c6
Revises: c4f91e2b3a07
Create Date: 2026-08-21 17:15:00.000000

Changes:
- contracts: add scheduled_cancellation_date, cancellation_reason, cancellation_requested_at
- invoices: add cancelled_by_scheduled_id (FK → contracts.id) to track which records
  were soft-cancelled by a scheduled cancellation, enabling safe Undo.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "d1e2f3a4b5c6"
down_revision = "c4f91e2b3a07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- contracts table ---
    op.add_column(
        "contracts",
        sa.Column("scheduled_cancellation_date", sa.Date(), nullable=True, comment="Future date when contract will be auto-cancelled"),
    )
    op.add_column(
        "contracts",
        sa.Column("cancellation_reason", sa.Text(), nullable=True, comment="Reason for cancellation entered by user"),
    )
    op.add_column(
        "contracts",
        sa.Column("cancellation_requested_at", sa.DateTime(timezone=True), nullable=True, comment="Timestamp when schedule_cancel was initiated"),
    )

    # Index for Cron Job lookup: ACTIVE contracts with scheduled_cancellation_date <= today
    op.create_index(
        "ix_contracts_scheduled_cancellation_date",
        "contracts",
        ["scheduled_cancellation_date"],
        postgresql_where=sa.text("scheduled_cancellation_date IS NOT NULL"),
    )

    # --- invoices table ---
    op.add_column(
        "invoices",
        sa.Column(
            "cancelled_by_scheduled_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="SET NULL"),
            nullable=True,
            comment="FK to the contract whose schedule_cancel caused this invoice to be soft-cancelled. NULL = cancelled by other means.",
        ),
    )
    op.create_index(
        "ix_invoices_cancelled_by_scheduled_id",
        "invoices",
        ["cancelled_by_scheduled_id"],
        postgresql_where=sa.text("cancelled_by_scheduled_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_invoices_cancelled_by_scheduled_id", table_name="invoices")
    op.drop_column("invoices", "cancelled_by_scheduled_id")

    op.drop_index("ix_contracts_scheduled_cancellation_date", table_name="contracts")
    op.drop_column("contracts", "cancellation_requested_at")
    op.drop_column("contracts", "cancellation_reason")
    op.drop_column("contracts", "scheduled_cancellation_date")
