"""
Genba Management System — Alembic Migration: 11_add_genba_type_contract_schedule

Adds columns to existing tables (all nullable / backward-compatible):
- genba: genba_type, genba_type_other, floor_above_ground, floor_basement
- contracts: contract_name, service_category, weekly_frequency, work_days,
             work_start_time, work_end_time, work_duration_hours
- daily_cleaning_tasks: contract_id FK
- periodic_cleaning_plans: contract_id FK

Sprint 5: Genba Registration Enhancement + Contract-Manual Linkage
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "11_genba_type_contract_sch"
down_revision: str | Sequence[str] | None = "10_finance_rls_encrypt_fix"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add new columns to genba, contracts, daily_cleaning_tasks, periodic_cleaning_plans."""

    # ==========================================================================
    # genba table — ADD COLUMNS
    # ==========================================================================
    op.add_column(
        "genba",
        sa.Column("genba_type", sa.String(30), nullable=True),
    )
    op.add_column(
        "genba",
        sa.Column("genba_type_other", sa.String(100), nullable=True),
    )
    op.add_column(
        "genba",
        sa.Column("floor_above_ground", sa.SmallInteger, nullable=True),
    )
    op.add_column(
        "genba",
        sa.Column("floor_basement", sa.SmallInteger, nullable=True),
    )

    # CHECK: genba_type must be one of the allowed values (or NULL)
    op.create_check_constraint(
        "chk_genba_genba_type",
        "genba",
        "genba_type IS NULL OR genba_type IN ('MANSION', 'OFFICE_BUILDING', 'LOGISTICS_CENTER', 'OTHER')",
    )

    # CHECK: if genba_type = 'OTHER', genba_type_other must not be NULL
    op.create_check_constraint(
        "chk_genba_type_other_required",
        "genba",
        "genba_type != 'OTHER' OR genba_type_other IS NOT NULL",
    )

    # ==========================================================================
    # contracts table — ADD COLUMNS (schedule + categorization)
    # ==========================================================================
    op.add_column(
        "contracts",
        sa.Column("contract_name", sa.String(200), nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column(
            "service_category",
            sa.String(20),
            nullable=False,
            server_default="OTHER",
        ),
    )
    op.add_column(
        "contracts",
        sa.Column("weekly_frequency", sa.SmallInteger, nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("work_days", sa.String(50), nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("work_start_time", sa.Time, nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("work_end_time", sa.Time, nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("work_duration_hours", sa.Numeric(4, 2), nullable=True),
    )

    # CHECK: service_category must be one of allowed values
    op.create_check_constraint(
        "chk_contracts_service_category",
        "contracts",
        "service_category IN ('DAILY', 'PERIODIC', 'OTHER')",
    )

    # Index for fast filtering by genba + service_category
    op.create_index(
        "ix_contracts_genba_service_category",
        "contracts",
        ["genba_id", "service_category"],
    )

    # ==========================================================================
    # daily_cleaning_tasks table — ADD contract_id FK
    # ==========================================================================
    op.add_column(
        "daily_cleaning_tasks",
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_daily_cleaning_tasks_contract_id",
        "daily_cleaning_tasks",
        ["contract_id"],
    )

    # ==========================================================================
    # periodic_cleaning_plans table — ADD contract_id FK
    # ==========================================================================
    op.add_column(
        "periodic_cleaning_plans",
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_periodic_cleaning_plans_contract_id",
        "periodic_cleaning_plans",
        ["contract_id"],
    )


def downgrade() -> None:
    """Remove added columns from genba, contracts, daily_cleaning_tasks, periodic_cleaning_plans."""

    # periodic_cleaning_plans
    op.drop_index("ix_periodic_cleaning_plans_contract_id", table_name="periodic_cleaning_plans")
    op.drop_column("periodic_cleaning_plans", "contract_id")

    # daily_cleaning_tasks
    op.drop_index("ix_daily_cleaning_tasks_contract_id", table_name="daily_cleaning_tasks")
    op.drop_column("daily_cleaning_tasks", "contract_id")

    # contracts
    op.drop_index("ix_contracts_genba_service_category", table_name="contracts")
    op.drop_constraint("chk_contracts_service_category", "contracts", type_="check")
    op.drop_column("contracts", "work_duration_hours")
    op.drop_column("contracts", "work_end_time")
    op.drop_column("contracts", "work_start_time")
    op.drop_column("contracts", "work_days")
    op.drop_column("contracts", "weekly_frequency")
    op.drop_column("contracts", "service_category")
    op.drop_column("contracts", "contract_name")

    # genba
    op.drop_constraint("chk_genba_type_other_required", "genba", type_="check")
    op.drop_constraint("chk_genba_genba_type", "genba", type_="check")
    op.drop_column("genba", "floor_basement")
    op.drop_column("genba", "floor_above_ground")
    op.drop_column("genba", "genba_type_other")
    op.drop_column("genba", "genba_type")
