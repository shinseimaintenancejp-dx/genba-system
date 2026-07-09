"""
Genba Management System — Alembic Migration: 14_cleaning_areas_and_task_updates

Adds m_cleaning_areas master table and updates daily_cleaning_tasks table:
- day_of_week: VARCHAR(10) → VARCHAR(50) for comma-separated multi-day values
- start_time: NOT NULL → NULLABLE (optional start time)
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

# Revision identifiers used by Alembic
revision: str = "14_cleaning_areas_tasks"
down_revision: str | Sequence[str] | None = "13_soft_delete_nested"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Default cleaning area seed data
DEFAULT_AREAS = [
    "エントランス",
    "アプローチ",
    "外周",
    "風除室",
    "駐輪場",
    "EV内",
    "各階廊下",
    "階段",
    "トイレ",
    "男性トイレ",
    "女性トイレ",
    "屋上",
]


def upgrade() -> None:
    """Create m_cleaning_areas table and update daily_cleaning_tasks columns."""

    # 1. Create m_cleaning_areas master table
    op.create_table(
        "m_cleaning_areas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.UniqueConstraint("name", name="uq_cleaning_areas_name"),
    )

    # 2. Seed default areas
    areas_table = sa.table(
        "m_cleaning_areas",
        sa.column("name", sa.String),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(
        areas_table,
        [{"name": name, "sort_order": idx} for idx, name in enumerate(DEFAULT_AREAS)],
    )

    # 3. Alter daily_cleaning_tasks.day_of_week: VARCHAR(10) → VARCHAR(50)
    op.alter_column(
        "daily_cleaning_tasks",
        "day_of_week",
        existing_type=sa.String(10),
        type_=sa.String(50),
        existing_nullable=True,
    )

    # 4. Alter daily_cleaning_tasks.start_time: NOT NULL → NULLABLE
    op.alter_column(
        "daily_cleaning_tasks",
        "start_time",
        existing_type=sa.Time(),
        nullable=True,
    )


def downgrade() -> None:
    """Reverse all changes from this migration."""

    # Revert start_time back to NOT NULL (requires no NULL values in DB)
    op.alter_column(
        "daily_cleaning_tasks",
        "start_time",
        existing_type=sa.Time(),
        nullable=False,
    )

    # Revert day_of_week back to VARCHAR(10)
    op.alter_column(
        "daily_cleaning_tasks",
        "day_of_week",
        existing_type=sa.String(50),
        type_=sa.String(10),
        existing_nullable=True,
    )

    # Drop the m_cleaning_areas table
    op.drop_table("m_cleaning_areas")
