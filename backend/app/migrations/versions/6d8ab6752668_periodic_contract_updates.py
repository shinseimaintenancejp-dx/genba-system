"""
periodic_contract_updates

Revision ID: 6d8ab6752668
Revises: 14_cleaning_areas_tasks
Create Date: 2026-07-06 07:47:08.593121+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op



# Revision identifiers used by Alembic
revision: str = '6d8ab6752668'
down_revision: str | Sequence[str] | None = '14_cleaning_areas_tasks'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    # 1. Create m_periodic_work_types table
    op.create_table(
        'm_periodic_work_types',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Insert default data
    op.execute("""
        INSERT INTO m_periodic_work_types (name, sort_order) VALUES
        ('床面機械洗浄', 1),
        ('床面洗浄ワックス', 2),
        ('床面剥離洗浄ワックス', 3),
        ('ガラス洗浄', 4),
        ('高圧洗浄', 5);
    """)

    # 2. Create contract_periodic_work_contents table
    op.create_table(
        'contract_periodic_work_contents',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('contract_id', sa.UUID(), nullable=False),
        sa.Column('floor', sa.String(length=50), nullable=False),
        sa.Column('area', sa.String(length=200), nullable=False),
        sa.Column('work_content', sa.String(length=200), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contract_periodic_work_contents_contract_id'), 'contract_periodic_work_contents', ['contract_id'], unique=False)


def downgrade() -> None:
    """Reverse this migration. MUST be implemented — see BE§7."""
    op.drop_index(op.f('ix_contract_periodic_work_contents_contract_id'), table_name='contract_periodic_work_contents')
    op.drop_table('contract_periodic_work_contents')
    op.drop_table('m_periodic_work_types')
