"""
Genba Management System — Alembic Migration: 06_create_manuals_part2

Creates:
- periodic_cleaning_plans table (N:1 with genba)
- periodic_cleaning_details table (N:1 with periodic_cleaning_plans)
- work_schedules table (N:1 with genba)
- genba_custom_holidays table (N:1 with genba)
- genba_equipment table (N:1 with genba)
- cleaning_work_standards table (N:1 with genba)
- RLS policies on all 6 tables

Sprint 7: Manuals Part 2 & Operations
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "06_create_manuals_part2"
down_revision: str | Sequence[str] | None = "05_create_manuals_part1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create periodic plans, schedules, equipment, standards tables and configure RLS."""

    # ==========================================================================
    # periodic_cleaning_plans table
    # ==========================================================================
    op.create_table(
        "periodic_cleaning_plans",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "work_team_type",
            sa.String(10),
            nullable=False,
        ),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("partner_companies.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("work_content", sa.String(200), nullable=False),
        sa.Column("month_apr", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_may", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_jun", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_jul", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_aug", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_sep", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_oct", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_nov", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_dec", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_jan", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_feb", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("month_mar", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("special_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "work_team_type IN ('SELF', 'PARTNER')", name="chk_work_team_type"
        ),
    )
    op.create_index(
        "ix_periodic_cleaning_plans_genba_id",
        "periodic_cleaning_plans",
        ["genba_id"],
    )

    # ==========================================================================
    # periodic_cleaning_details table
    # ==========================================================================
    op.create_table(
        "periodic_cleaning_details",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "plan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("periodic_cleaning_plans.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("location", sa.String(100), nullable=False),
        sa.Column("floor_material", sa.String(100), nullable=True),
        sa.Column("area_name", sa.String(200), nullable=False),
        sa.Column("work_content", sa.Text(), nullable=False),
        sa.Column("special_notes", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_periodic_cleaning_details_plan_id",
        "periodic_cleaning_details",
        ["plan_id"],
    )

    # ==========================================================================
    # work_schedules table
    # ==========================================================================
    op.create_table(
        "work_schedules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("shift_label", sa.String(50), nullable=True),
        sa.Column("work_days", sa.String(50), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("break_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("times_per_week", sa.Integer(), nullable=True),
        sa.Column("hours_per_day", sa.Numeric(4, 2), nullable=True),
        sa.Column("holiday_rule", sa.String(20), nullable=False, server_default="OFF"),
        sa.Column("obon_work", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("new_year_work", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("holiday_shift_rule", sa.String(50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "holiday_rule IN ('OFF', 'SHIFT_BEFORE', 'SHIFT_AFTER', 'WORK')",
            name="chk_holiday_rule",
        ),
    )
    op.create_index(
        "ix_work_schedules_genba_id",
        "work_schedules",
        ["genba_id"],
    )

    # ==========================================================================
    # genba_custom_holidays table
    # ==========================================================================
    op.create_table(
        "genba_custom_holidays",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("holiday_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column("substitute_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index(
        "ix_genba_custom_holidays_genba_id",
        "genba_custom_holidays",
        ["genba_id"],
    )

    # ==========================================================================
    # genba_equipment table
    # ==========================================================================
    op.create_table(
        "genba_equipment",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("equipment_name", sa.String(200), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index(
        "ix_genba_equipment_genba_id",
        "genba_equipment",
        ["genba_id"],
    )

    # ==========================================================================
    # cleaning_work_standards table
    # ==========================================================================
    op.create_table(
        "cleaning_work_standards",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("floor_number", sa.String(20), nullable=False),
        sa.Column("area_name", sa.String(200), nullable=False),
        sa.Column("floor_material", sa.String(100), nullable=True),
        sa.Column("area_sqm", sa.Numeric(8, 2), nullable=True),
        sa.Column(
            "daily_tasks",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "periodic_tasks",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index(
        "ix_cleaning_work_standards_genba_id",
        "cleaning_work_standards",
        ["genba_id"],
    )

    # ==========================================================================
    # Row-Level Security Configuration
    # ==========================================================================
    tables = [
        "periodic_cleaning_plans",
        "periodic_cleaning_details",
        "work_schedules",
        "genba_custom_holidays",
        "genba_equipment",
        "cleaning_work_standards",
    ]

    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

    # 1. Staff policies (ALL access)
    for table in tables:
        op.execute(f"""
            CREATE POLICY staff_{table}_policy ON {table}
            FOR ALL
            USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
        """)

    # Helper subqueries for Partner and Worker
    # Partner active contracted genba subquery
    partner_subquery = """
        genba_id IN (
            SELECT c.genba_id FROM contracts c
            WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
              AND c.contract_type = 'ORDERING'
              AND c.status = 'ACTIVE'
        )
    """

    # Worker active assigned genba subquery
    worker_subquery = """
        genba_id IN (
            SELECT gw.genba_id FROM genba_workers gw
            WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
              AND gw.is_active = TRUE
        )
    """

    # 2. Partner policies (SELECT access)
    partner_select_tables = [
        "periodic_cleaning_plans",
        "work_schedules",
        "genba_custom_holidays",
        "genba_equipment",
        "cleaning_work_standards",
    ]
    for table in partner_select_tables:
        op.execute(f"""
            CREATE POLICY partner_{table}_policy ON {table}
            FOR SELECT
            USING (
                current_setting('app.user_role', TRUE) = 'PARTNER'
                AND {partner_subquery}
            )
        """)

    # Special Partner policy for details (joins plans)
    op.execute(f"""
        CREATE POLICY partner_periodic_cleaning_details_policy ON periodic_cleaning_details
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND plan_id IN (
                SELECT p.id FROM periodic_cleaning_plans p
                WHERE p.genba_id IN (
                    SELECT c.genba_id FROM contracts c
                    WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
                      AND c.contract_type = 'ORDERING'
                      AND c.status = 'ACTIVE'
                )
            )
        )
    """)

    # 3. Worker policies (SELECT access)
    worker_select_tables = [
        "periodic_cleaning_plans",
        "work_schedules",
        "genba_custom_holidays",
        "genba_equipment",
        "cleaning_work_standards",
    ]
    for table in worker_select_tables:
        op.execute(f"""
            CREATE POLICY worker_{table}_policy ON {table}
            FOR SELECT
            USING (
                current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
                AND {worker_subquery}
            )
        """)

    # Special Worker policy for details (joins plans)
    op.execute(f"""
        CREATE POLICY worker_periodic_cleaning_details_policy ON periodic_cleaning_details
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND plan_id IN (
                SELECT p.id FROM periodic_cleaning_plans p
                WHERE p.genba_id IN (
                    SELECT gw.genba_id FROM genba_workers gw
                    WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                      AND gw.is_active = TRUE
                )
            )
        )
    """)


def downgrade() -> None:
    """Drop tables and RLS policies."""
    tables = [
        "periodic_cleaning_plans",
        "periodic_cleaning_details",
        "work_schedules",
        "genba_custom_holidays",
        "genba_equipment",
        "cleaning_work_standards",
    ]

    # Drop policies
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS staff_{table}_policy ON {table}")
        op.execute(f"DROP POLICY IF EXISTS partner_{table}_policy ON {table}")
        op.execute(f"DROP POLICY IF EXISTS worker_{table}_policy ON {table}")

    # Drop tables
    op.drop_table("cleaning_work_standards")
    op.drop_table("genba_equipment")
    op.drop_table("genba_custom_holidays")
    op.drop_table("work_schedules")
    op.drop_table("periodic_cleaning_details")
    op.drop_table("periodic_cleaning_plans")
