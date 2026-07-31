"""Add short_name to partner_companies

Revision ID: 54_add_short_name_partner
Revises: 53315afd8522
Create Date: 2026-07-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '54_add_short_name_partner'
down_revision = '2ccdc6946876'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partner_companies', sa.Column('short_name', sa.String(length=100), nullable=True))


def downgrade():
    op.drop_column('partner_companies', 'short_name')
