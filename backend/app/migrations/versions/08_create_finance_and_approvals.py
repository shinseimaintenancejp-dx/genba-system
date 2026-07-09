"""create_finance_and_approvals

Revision ID: 08
Revises: 07
Create Date: 2026-06-11 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08_create_finance_and_approvals'
down_revision: Union[str, None] = '07_setup_pgcrypto_and_keys'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Approval Requests
    op.create_table('approval_requests',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=False),
        sa.Column('requested_by', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
        sa.Column('approved_by', sa.UUID(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Quotations
    op.create_table('quotations',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('quotation_number', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('total_amount', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('tax_amount', sa.DECIMAL(precision=12, scale=2), server_default='0', nullable=False),
        sa.Column('work_cycle', sa.Text(), nullable=True),
        sa.Column('work_hours', sa.String(length=200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('special_conditions', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='DRAFT', nullable=False),
        sa.Column('genba_id', sa.UUID(), nullable=False),
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('contract_id', sa.UUID(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.ForeignKeyConstraint(['genba_id'], ['genba.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('quotation_number')
    )

    # 3. Quotation Items
    op.create_table('quotation_items',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('quotation_id', sa.UUID(), nullable=False),
        sa.Column('item_name', sa.String(length=200), nullable=False),
        sa.Column('quantity', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('unit_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('subtotal', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Invoices
    op.create_table('invoices',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('invoice_type', sa.String(length=20), nullable=False),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('billing_period_year', sa.Integer(), nullable=False),
        sa.Column('billing_period_month', sa.Integer(), nullable=False),
        sa.Column('amount', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('tax_amount', sa.DECIMAL(precision=12, scale=2), server_default='0', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='DRAFT', nullable=False),
        sa.Column('is_auto_generated', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('attachment_url', sa.Text(), nullable=True),
        sa.Column('contract_id', sa.UUID(), nullable=False),
        sa.Column('confirmed_by', sa.UUID(), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['confirmed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_number'),
        sa.UniqueConstraint('contract_id', 'billing_period_year', 'billing_period_month', 'invoice_type', name='uq_invoice_contract_period')
    )
    op.create_index('idx_invoices_contract', 'invoices', ['contract_id'], unique=False)
    op.create_index('idx_invoices_period', 'invoices', ['billing_period_year', 'billing_period_month'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_invoices_period', table_name='invoices')
    op.drop_index('idx_invoices_contract', table_name='invoices')
    op.drop_table('invoices')
    op.drop_table('quotation_items')
    op.drop_table('quotations')
    op.drop_table('approval_requests')
