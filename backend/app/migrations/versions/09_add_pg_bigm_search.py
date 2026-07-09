"""
add_pg_bigm_search

Revision ID: 6fb5a7a9692c
Revises: 08_create_finance_and_approvals
Create Date: 2026-06-11 23:07:22.689811+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op



# Revision identifiers used by Alembic
revision: str = '6fb5a7a9692c'
down_revision: str | Sequence[str] | None = '08_create_finance_and_approvals'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE INDEX idx_genba_property_name_trgm ON genba USING gin (property_name gin_trgm_ops);")
    op.execute("CREATE INDEX idx_genba_address_trgm ON genba USING gin (address gin_trgm_ops);")


def downgrade() -> None:
    """Reverse this migration. MUST be implemented — see BE§7."""
    op.execute("DROP INDEX IF EXISTS idx_genba_address_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_genba_property_name_trgm;")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm;")
