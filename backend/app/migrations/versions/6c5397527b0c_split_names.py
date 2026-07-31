"""
split_names

Revision ID: 6c5397527b0c
Revises: 15_add_display_order
Create Date: 2026-07-30 02:44:01.213824+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op



# Revision identifiers used by Alembic
revision: str = '6c5397527b0c'
down_revision: str | Sequence[str] | None = '15_add_display_order'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    # For users table
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(length=20), nullable=True))
    op.execute("UPDATE users SET last_name = full_name, first_name = ''")
    op.alter_column('users', 'last_name', nullable=False)
    op.alter_column('users', 'first_name', nullable=False)
    op.drop_column('users', 'full_name')

    # For staff table
    op.add_column('staff', sa.Column('last_name', sa.String(length=100), nullable=True))
    op.add_column('staff', sa.Column('first_name', sa.String(length=100), nullable=True))
    op.execute("UPDATE staff SET last_name = full_name, first_name = ''")
    op.alter_column('staff', 'last_name', nullable=False)
    op.alter_column('staff', 'first_name', nullable=False)
    op.drop_column('staff', 'full_name')


def downgrade() -> None:
    """Reverse this migration. MUST be implemented — see BE§7."""
    # For users table
    op.add_column('users', sa.Column('full_name', sa.String(length=200), nullable=True))
    op.execute("UPDATE users SET full_name = last_name || ' ' || first_name")
    op.alter_column('users', 'full_name', nullable=False)
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
    op.drop_column('users', 'phone')

    # For staff table
    op.add_column('staff', sa.Column('full_name', sa.String(length=100), nullable=True))
    op.execute("UPDATE staff SET full_name = last_name || ' ' || first_name")
    op.alter_column('staff', 'full_name', nullable=False)
    op.drop_column('staff', 'last_name')
    op.drop_column('staff', 'first_name')
