"""Add contract_ordering_links and contract_ordering_link_work_items tables.

Revision ID: 55_add_ordering_contract_links
Revises: 54_add_short_name_partner
Create Date: 2026-08-03

Implements Many-to-Many relationship between Receiving and Ordering contracts.
Supports partial/full scope delegation with per-work-item scope detail tracking.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "55_add_ordering_contract_links"
down_revision: str | Sequence[str] | None = "54_add_short_name_partner"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create contract_ordering_links and contract_ordering_link_work_items tables."""

    # ==========================================================================
    # 1. contract_ordering_links — N:N bridge between RECEIVING and ORDERING
    # ==========================================================================
    op.create_table(
        "contract_ordering_links",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        # FK to ORDERING contract
        sa.Column(
            "ordering_contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # FK to RECEIVING contract
        sa.Column(
            "receiving_contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        # FULL = delegate all work contents of this RECEIVING contract
        # PARTIAL = delegate only specific work items (see link_work_items)
        sa.Column(
            "assignment_type",
            sa.String(10),
            nullable=False,
            server_default="PARTIAL",
        ),
        # Optional: allocated monetary amount for this link
        sa.Column("allocated_amount", sa.Numeric(12, 2), nullable=True),
        # Optional: allocated percentage of RECEIVING.amount
        sa.Column("allocated_percentage", sa.Numeric(5, 2), nullable=True),
        # Internal notes
        sa.Column("remarks", sa.Text, nullable=True),
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
        # Prevent duplicate link for same pair
        sa.UniqueConstraint(
            "ordering_contract_id",
            "receiving_contract_id",
            name="uq_ordering_receiving_link",
        ),
    )

    # Indexes for fast lookups
    op.create_index(
        "ix_col_ordering_contract_id",
        "contract_ordering_links",
        ["ordering_contract_id"],
    )
    op.create_index(
        "ix_col_receiving_contract_id",
        "contract_ordering_links",
        ["receiving_contract_id"],
    )

    # ==========================================================================
    # 2. contract_ordering_link_work_items — specific work items per link
    # ==========================================================================
    op.create_table(
        "contract_ordering_link_work_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        # FK to the link record
        sa.Column(
            "link_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contract_ordering_links.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # FK to the work content item from RECEIVING contract
        sa.Column(
            "work_content_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contract_periodic_work_contents.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        # Allows multiple companies sharing the same work content but different sub-scope
        # e.g. "1F~8F" vs "9F~15F" for 床面清掃
        # NULL means entire work content is delegated
        sa.Column("scope_detail", sa.Text, nullable=True),
        # Optional per-item allocated amount
        sa.Column("allocated_amount", sa.Numeric(12, 2), nullable=True),
        # Optional per-item allocated percentage
        sa.Column("allocated_percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        # NOTE: No UNIQUE constraint on (link_id, work_content_id) intentionally.
        # Same work_content_id may appear across different links with different
        # scope_detail (e.g., Company A: 1F-8F, Company B: 9F-15F).
    )

    # Index for fast lookup by link
    op.create_index(
        "ix_colwi_link_id",
        "contract_ordering_link_work_items",
        ["link_id"],
    )
    # Index for lookup by work content (to find who handles which work item)
    op.create_index(
        "ix_colwi_work_content_id",
        "contract_ordering_link_work_items",
        ["work_content_id"],
    )


def downgrade() -> None:
    """Drop contract_ordering_link_work_items and contract_ordering_links tables."""
    op.drop_index("ix_colwi_work_content_id", table_name="contract_ordering_link_work_items")
    op.drop_index("ix_colwi_link_id", table_name="contract_ordering_link_work_items")
    op.drop_table("contract_ordering_link_work_items")

    op.drop_index("ix_col_receiving_contract_id", table_name="contract_ordering_links")
    op.drop_index("ix_col_ordering_contract_id", table_name="contract_ordering_links")
    op.drop_table("contract_ordering_links")
