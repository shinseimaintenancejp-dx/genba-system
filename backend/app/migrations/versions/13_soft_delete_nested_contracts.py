"""
Genba Management System — Alembic Migration: 13_soft_delete_nested_contracts

Adds deleted_at column to nested contract tables for soft-delete.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "13_soft_delete_nested"
down_revision: str | Sequence[str] | None = "12_contract_enhancement"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add deleted_at column and change unique constraint to partial index."""

    tables = [
        "contract_work_slots",
        "contract_worker_counts",
        "contract_holiday_rules",
        "contract_periodic_schedule",
    ]

    for table in tables:
        op.add_column(
            table,
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        )

    # Change unique constraint to partial index for soft-delete compatibility
    op.drop_constraint("uq_contract_holiday_rule_type", "contract_holiday_rules", type_="unique")
    
    op.execute("""
        CREATE UNIQUE INDEX uq_contract_holiday_rule_type_active
        ON contract_holiday_rules (contract_id, rule_type)
        WHERE deleted_at IS NULL
    """)


def downgrade() -> None:
    """Remove deleted_at column and revert to full unique constraint."""

    op.execute("DROP INDEX uq_contract_holiday_rule_type_active")
    
    op.create_unique_constraint(
        "uq_contract_holiday_rule_type",
        "contract_holiday_rules",
        ["contract_id", "rule_type"],
    )

    tables = [
        "contract_periodic_schedule",
        "contract_holiday_rules",
        "contract_worker_counts",
        "contract_work_slots",
    ]

    for table in tables:
        op.drop_column(table, "deleted_at")
