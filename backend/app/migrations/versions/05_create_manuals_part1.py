"""
Genba Management System — Alembic Migration: 05_create_manuals_part1

Creates:
- entry_exit_instructions table (1:1 with genba)
- daily_cleaning_tasks table (N:1 with genba)
- memos table (N:1 with genba)
- memo_attachments table (N:1 with memos)
- RLS policies on all 4 tables

Sprint 6: Manuals Part 1 — Entry/Exit, Daily, Memo
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "05_create_manuals_part1"
down_revision: str | Sequence[str] | None = "02_create_customers_and_genba"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create manual and memo-related tables, configure RLS."""

    # ==========================================================================
    # entry_exit_instructions table
    # ==========================================================================
    op.create_table(
        "entry_exit_instructions",
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
            unique=True,
        ),
        sa.Column("entry_method", sa.Text, nullable=True),
        sa.Column("exit_method", sa.Text, nullable=True),
        sa.Column("safety_notes", sa.Text, nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index(
        "ix_entry_exit_instructions_genba_id",
        "entry_exit_instructions",
        ["genba_id"],
    )

    # ==========================================================================
    # daily_cleaning_tasks table
    # ==========================================================================
    op.create_table(
        "daily_cleaning_tasks",
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
        sa.Column("day_of_week", sa.String(10), nullable=True),  # NULL=毎日, 月,火...
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("floor", sa.String(50), nullable=True),
        sa.Column("area_name", sa.String(200), nullable=False),
        sa.Column("work_content", sa.Text, nullable=False),
        sa.Column("special_notes", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
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
        "ix_daily_cleaning_tasks_genba_id",
        "daily_cleaning_tasks",
        ["genba_id"],
    )

    # ==========================================================================
    # memos table
    # ==========================================================================
    op.create_table(
        "memos",
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
        sa.Column("memo_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
    op.create_index("ix_memos_genba_id", "memos", ["genba_id"])

    # ==========================================================================
    # memo_attachments table
    # ==========================================================================
    op.create_table(
        "memo_attachments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "memo_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("memos.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file_name", sa.String(200), nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("file_size", sa.Integer, nullable=True),
        sa.Column("file_type", sa.String(50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_memo_attachments_memo_id", "memo_attachments", ["memo_id"])

    # ==========================================================================
    # Row-Level Security for entry_exit_instructions
    # ==========================================================================
    op.execute("ALTER TABLE entry_exit_instructions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE entry_exit_instructions FORCE ROW LEVEL SECURITY")

    # Staff/Admin
    op.execute("""
        CREATE POLICY staff_entry_exit_policy ON entry_exit_instructions
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Partner (view contracted genbas)
    op.execute("""
        CREATE POLICY partner_entry_exit_policy ON entry_exit_instructions
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND genba_id IN (
                SELECT c.genba_id FROM contracts c
                WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
                  AND c.contract_type = 'ORDERING'
                  AND c.status = 'ACTIVE'
            )
        )
    """)

    # Worker (view assigned genbas)
    op.execute("""
        CREATE POLICY worker_entry_exit_policy ON entry_exit_instructions
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND genba_id IN (
                SELECT gw.genba_id FROM genba_workers gw
                WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                  AND gw.is_active = TRUE
            )
        )
    """)

    # ==========================================================================
    # Row-Level Security for daily_cleaning_tasks
    # ==========================================================================
    op.execute("ALTER TABLE daily_cleaning_tasks ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE daily_cleaning_tasks FORCE ROW LEVEL SECURITY")

    # Staff/Admin
    op.execute("""
        CREATE POLICY staff_daily_tasks_policy ON daily_cleaning_tasks
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Partner (view contracted genbas)
    op.execute("""
        CREATE POLICY partner_daily_tasks_policy ON daily_cleaning_tasks
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND genba_id IN (
                SELECT c.genba_id FROM contracts c
                WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
                  AND c.contract_type = 'ORDERING'
                  AND c.status = 'ACTIVE'
            )
        )
    """)

    # Worker (view assigned genbas)
    op.execute("""
        CREATE POLICY worker_daily_tasks_policy ON daily_cleaning_tasks
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND genba_id IN (
                SELECT gw.genba_id FROM genba_workers gw
                WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                  AND gw.is_active = TRUE
            )
        )
    """)

    # ==========================================================================
    # Row-Level Security for memos
    # ==========================================================================
    op.execute("ALTER TABLE memos ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE memos FORCE ROW LEVEL SECURITY")

    # Staff/Admin
    op.execute("""
        CREATE POLICY staff_memos_policy ON memos
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Worker (view assigned genbas)
    op.execute("""
        CREATE POLICY worker_memos_policy ON memos
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND genba_id IN (
                SELECT gw.genba_id FROM genba_workers gw
                WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                  AND gw.is_active = TRUE
            )
        )
    """)

    # ==========================================================================
    # Row-Level Security for memo_attachments
    # ==========================================================================
    op.execute("ALTER TABLE memo_attachments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE memo_attachments FORCE ROW LEVEL SECURITY")

    # Staff/Admin
    op.execute("""
        CREATE POLICY staff_attachments_policy ON memo_attachments
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Worker (view assigned genbas)
    op.execute("""
        CREATE POLICY worker_attachments_policy ON memo_attachments
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND memo_id IN (
                SELECT m.id FROM memos m
                WHERE m.genba_id IN (
                    SELECT gw.genba_id FROM genba_workers gw
                    WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                      AND gw.is_active = TRUE
                )
            )
        )
    """)


def downgrade() -> None:
    """Drop tables and their RLS policies."""

    # Drop RLS policies
    op.execute("DROP POLICY IF EXISTS staff_entry_exit_policy ON entry_exit_instructions")
    op.execute("DROP POLICY IF EXISTS partner_entry_exit_policy ON entry_exit_instructions")
    op.execute("DROP POLICY IF EXISTS worker_entry_exit_policy ON entry_exit_instructions")

    op.execute("DROP POLICY IF EXISTS staff_daily_tasks_policy ON daily_cleaning_tasks")
    op.execute("DROP POLICY IF EXISTS partner_daily_tasks_policy ON daily_cleaning_tasks")
    op.execute("DROP POLICY IF EXISTS worker_daily_tasks_policy ON daily_cleaning_tasks")

    op.execute("DROP POLICY IF EXISTS staff_memos_policy ON memos")
    op.execute("DROP POLICY IF EXISTS worker_memos_policy ON memos")

    op.execute("DROP POLICY IF EXISTS staff_attachments_policy ON memo_attachments")
    op.execute("DROP POLICY IF EXISTS worker_attachments_policy ON memo_attachments")

    # Drop tables
    op.drop_table("memo_attachments")
    op.drop_table("memos")
    op.drop_table("daily_cleaning_tasks")
    op.drop_table("entry_exit_instructions")
