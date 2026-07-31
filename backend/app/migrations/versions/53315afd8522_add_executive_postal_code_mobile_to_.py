"""
Add executive, postal_code, mobile to partner_companies

Revision ID: 53315afd8522
Revises: b0c17e0811cb
Create Date: 2026-07-28 00:45:08.754549+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op



# Revision identifiers used by Alembic
revision: str = '53315afd8522'
down_revision: str | Sequence[str] | None = 'b0c17e0811cb'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    op.add_column('partner_companies', sa.Column('executive', sa.String(length=100), nullable=True))
    op.add_column('partner_companies', sa.Column('postal_code', sa.String(length=20), nullable=True))
    op.add_column('partner_companies', sa.Column('mobile', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Reverse this migration. MUST be implemented — see BE§7."""
    op.drop_column('partner_companies', 'mobile')
    op.drop_column('partner_companies', 'postal_code')
    op.drop_column('partner_companies', 'executive')
