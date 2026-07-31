"""add display_order

Revision ID: 15_add_display_order
Revises: b0c17e0811cb
Create Date: 2026-07-28 14:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '15_add_display_order'
down_revision = '53315afd8522'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add display_order to customers
    op.add_column('customers', sa.Column('display_order', sa.Integer(), server_default='0', nullable=False))
    # Add display_order to partner_companies
    op.add_column('partner_companies', sa.Column('display_order', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    # Drop display_order from partner_companies
    op.drop_column('partner_companies', 'display_order')
    # Drop display_order from customers
    op.drop_column('customers', 'display_order')
