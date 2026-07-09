"""
Genba Management System — Alembic Migration: 12_contract_enhancement

Adds new nested contract tables and new columns to contracts table.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "12_contract_enhancement"
down_revision: str | Sequence[str] | None = "11_genba_type_contract_sch"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add new columns to contracts and create 4 nested tables."""

    # ==========================================================================
    # 1. contracts table — ADD NEW COLUMNS
    # ==========================================================================
    op.add_column(
        "contracts",
        sa.Column("contract_pdf_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("work_type", sa.String(50), nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("sub_service_type", sa.String(50), nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("work_execution_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("work_content_summary", sa.Text(), nullable=True),
    )

    # Note: 'work_start_time', 'work_end_time', 'work_duration_hours' 
    # were already created as nullable=True in revision 11_genba_type_contract_sch.
    # We alter them here explicitly to guarantee they are nullable, as required.
    op.alter_column("contracts", "work_start_time", existing_type=sa.Time(), nullable=True)
    op.alter_column("contracts", "work_end_time", existing_type=sa.Time(), nullable=True)
    op.alter_column("contracts", "work_duration_hours", existing_type=sa.Numeric(4, 2), nullable=True)

    # ==========================================================================
    # 2. CREATE TABLE: contract_work_slots
    # ==========================================================================
    op.create_table(
        "contract_work_slots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("break_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_contract_work_slots_contract_id",
        "contract_work_slots",
        ["contract_id"],
    )

    # ==========================================================================
    # 3. CREATE TABLE: contract_worker_counts
    # ==========================================================================
    op.create_table(
        "contract_worker_counts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("worker_count", sa.Integer(), nullable=False),
        sa.Column("work_duration_hours", sa.Numeric(4, 2), nullable=False),
        sa.Column("total_hours", sa.Numeric(6, 2), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_contract_worker_counts_contract_id",
        "contract_worker_counts",
        ["contract_id"],
    )

    # ==========================================================================
    # 4. CREATE TABLE: contract_holiday_rules
    # ==========================================================================
    op.create_table(
        "contract_holiday_rules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rule_type", sa.String(50), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_contract_holiday_rules_contract_id",
        "contract_holiday_rules",
        ["contract_id"],
    )
    op.create_unique_constraint(
        "uq_contract_holiday_rule_type",
        "contract_holiday_rules",
        ["contract_id", "rule_type"],
    )

    # ==========================================================================
    # 5. CREATE TABLE: contract_periodic_schedule
    # ==========================================================================
    op.create_table(
        "contract_periodic_schedule",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("frequency_per_year", sa.Integer(), nullable=False),
        sa.Column("work_months", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column("work_days", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_contract_periodic_schedule_contract_id",
        "contract_periodic_schedule",
        ["contract_id"],
    )
    op.create_unique_constraint(
        "uq_contract_periodic_schedule",
        "contract_periodic_schedule",
        ["contract_id"],
    )

    # ==========================================================================
    # 6. ROW-LEVEL SECURITY (DB-02)
    # ==========================================================================
    tables = [
        "contract_work_slots",
        "contract_worker_counts",
        "contract_holiday_rules",
        "contract_periodic_schedule",
    ]

    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

        # Staff sees all
        op.execute(f"""
            CREATE POLICY staff_policy_{table} ON {table}
            FOR ALL
            USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
        """)

        # Partner sees own ordering contracts
        op.execute(f"""
            CREATE POLICY partner_policy_{table} ON {table}
            FOR SELECT
            USING (
                current_setting('app.user_role', TRUE) = 'PARTNER'
                AND contract_id IN (
                    SELECT id FROM contracts
                    WHERE partner_id::text = current_setting('app.related_entity_id', TRUE)
                      AND contract_type = 'ORDERING'
                )
            )
        """)

        # Worker sees assigned active genba
        op.execute(f"""
            CREATE POLICY worker_policy_{table} ON {table}
            FOR SELECT
            USING (
                current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
                AND contract_id IN (
                    SELECT c.id FROM contracts c
                    JOIN genba_workers gw ON c.genba_id = gw.genba_id
                    WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                      AND gw.is_active = TRUE
                )
            )
        """)

    # ==========================================================================
    # 7. DATA MIGRATION (DB-03)
    # ==========================================================================
    op.execute("""
        INSERT INTO contract_work_slots (contract_id, start_time, end_time, break_minutes, sort_order)
        SELECT id, work_start_time, COALESCE(work_end_time, work_start_time), 0, 0
        FROM contracts
        WHERE work_start_time IS NOT NULL
    """)


def downgrade() -> None:
    """Drop the 4 new tables and the new columns from contracts."""

    # 1. Drop tables
    op.drop_table("contract_periodic_schedule")
    op.drop_table("contract_holiday_rules")
    op.drop_table("contract_worker_counts")
    op.drop_table("contract_work_slots")

    # 2. Drop new columns
    op.drop_column("contracts", "work_content_summary")
    op.drop_column("contracts", "work_execution_date")
    op.drop_column("contracts", "sub_service_type")
    op.drop_column("contracts", "work_type")
    op.drop_column("contracts", "contract_pdf_url")
