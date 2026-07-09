"""
update_work_slots

Revision ID: b0c17e0811cb
Revises: 967f704485b0
Create Date: 2026-07-08 00:56:03.234124+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op



# Revision identifiers used by Alembic
revision: str = 'b0c17e0811cb'
down_revision: str | Sequence[str] | None = '967f704485b0'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    op.alter_column('contract_work_slots', 'start_time',
               existing_type=sa.Time(),
               nullable=True)
    op.alter_column('contract_work_slots', 'end_time',
               existing_type=sa.Time(),
               nullable=True)
    op.add_column('contract_work_slots', sa.Column('work_duration_hours', sa.Numeric(precision=4, scale=2), nullable=True))


def downgrade() -> None:
    """Reverse this migration. MUST be implemented — see BE§7."""
    op.drop_column('contract_work_slots', 'work_duration_hours')
    op.alter_column('contract_work_slots', 'end_time',
               existing_type=sa.Time(),
               nullable=False)
    op.alter_column('contract_work_slots', 'start_time',
               existing_type=sa.Time(),
               nullable=False)
