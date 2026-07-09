"""
Genba Management System — Alembic Migration: 02_create_customers_and_genba

Creates:
- customers, customer_contacts, customer_contact_genba tables
- partner_companies, staff, workers tables
- genba table (property_name, address, etc.)
- genba_staff_assignments, genba_workers tables
- contracts table
- RLS policies on genba table and contracts table

Sprint 3: Customer & Genba Core
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "02_create_customers_and_genba"
down_revision: str | Sequence[str] | None = "01_create_users_and_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create customer and genba-related tables, configure RLS."""

    # ==========================================================================
    # partner_companies table (skeletal schema for RLS reference)
    # ==========================================================================
    op.create_table(
        "partner_companies",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("company_name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("fax", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    # ==========================================================================
    # staff table (skeletal schema for RLS reference)
    # ==========================================================================
    op.create_table(
        "staff",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("position", sa.String(50), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    # ==========================================================================
    # workers table (skeletal schema for RLS reference)
    # ==========================================================================
    op.create_table(
        "workers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("birth_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    # ==========================================================================
    # customers table
    # ==========================================================================
    op.create_table(
        "customers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("short_name", sa.String(100), nullable=False),
        sa.Column("branch_name", sa.String(100), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("fax", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    # ==========================================================================
    # customer_contacts table
    # ==========================================================================
    op.create_table(
        "customer_contacts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("position", sa.String(100), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_primary", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_customer_contacts_customer_id", "customer_contacts", ["customer_id"])

    # ==========================================================================
    # genba table
    # ==========================================================================
    op.create_table(
        "genba",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("property_name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("transportation", sa.Text, nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("external_partner_code", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("site_confirmed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("manual_created", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("special_notes", sa.Text, nullable=True),
        sa.Column("management_start_date", sa.Date, nullable=True),
        sa.Column("terminated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_genba_customer_id", "genba", ["customer_id"])
    op.create_index("ix_genba_status", "genba", ["status"])

    # Status check constraint
    op.create_check_constraint(
        "chk_genba_status",
        "genba",
        "status IN ('ACTIVE', 'TERMINATED')",
    )

    # ==========================================================================
    # customer_contact_genba table (N:N)
    # ==========================================================================
    op.create_table(
        "customer_contact_genba",
        sa.Column(
            "customer_contact_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customer_contacts.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    # ==========================================================================
    # genba_staff_assignments table
    # ==========================================================================
    op.create_table(
        "genba_staff_assignments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "staff_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role_type", sa.String(20), nullable=False, server_default="MAIN"),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_unique_constraint(
        "uq_genba_staff_assignments",
        "genba_staff_assignments",
        ["genba_id", "staff_id"],
    )
    op.create_check_constraint(
        "chk_genba_staff_assignments_role_type",
        "genba_staff_assignments",
        "role_type IN ('MAIN', 'SUB')",
    )

    # ==========================================================================
    # genba_workers table
    # ==========================================================================
    op.create_table(
        "genba_workers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "worker_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_genba_workers",
        "genba_workers",
        ["genba_id", "worker_id"],
    )

    # ==========================================================================
    # contracts table
    # ==========================================================================
    op.create_table(
        "contracts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("internal_code", sa.String(50), nullable=False),
        sa.Column("external_code", sa.String(50), nullable=True),
        sa.Column("contract_type", sa.String(20), nullable=False),  # RECEIVING / ORDERING
        sa.Column("service_type", sa.String(50), nullable=False),
        sa.Column("service_area", sa.String(100), nullable=True),
        sa.Column("cleaning_type", sa.String(100), nullable=True),
        sa.Column("work_description", sa.Text, nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("tax_type", sa.String(10), nullable=False, server_default="EXCLUSIVE"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("auto_renew", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("invoice_required", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column(
            "genba_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("genba.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("partner_companies.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_unique_constraint("uq_contracts_internal_code", "contracts", ["internal_code"])
    op.create_index("ix_contracts_genba_id", "contracts", ["genba_id"])
    op.create_index("ix_contracts_status", "contracts", ["status"])
    op.create_check_constraint(
        "chk_contracts_contract_type",
        "contracts",
        "contract_type IN ('RECEIVING', 'ORDERING')",
    )
    op.create_check_constraint(
        "chk_contracts_status",
        "contracts",
        "status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'CANCELLED')",
    )
    op.create_check_constraint(
        "chk_contract_party",
        "contracts",
        "(contract_type = 'RECEIVING' AND customer_id IS NOT NULL) OR (contract_type = 'ORDERING' AND partner_id IS NOT NULL)",
    )

    # Add foreign keys on users table to link to these skeletons (for UserModel relation integrity)
    op.create_foreign_key("fk_users_related_staff", "users", "staff", ["related_entity_id"], ["id"])

    # ==========================================================================
    # Row-Level Security for genba table
    # ==========================================================================
    op.execute("ALTER TABLE genba ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE genba FORCE ROW LEVEL SECURITY")

    # Staff sees all genba
    op.execute("""
        CREATE POLICY staff_genba_policy ON genba
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Partner sees contracted active genba
    op.execute("""
        CREATE POLICY partner_genba_policy ON genba
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND id IN (
                SELECT c.genba_id FROM contracts c
                WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
                  AND c.contract_type = 'ORDERING'
                  AND c.status = 'ACTIVE'
            )
        )
    """)

    # Worker sees assigned active genba
    op.execute("""
        CREATE POLICY worker_genba_policy ON genba
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND id IN (
                SELECT gw.genba_id FROM genba_workers gw
                WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                  AND gw.is_active = TRUE
            )
        )
    """)

    # ==========================================================================
    # Row-Level Security for contracts table
    # ==========================================================================
    op.execute("ALTER TABLE contracts ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE contracts FORCE ROW LEVEL SECURITY")

    # Staff sees all contracts
    op.execute("""
        CREATE POLICY staff_contracts ON contracts
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Partner sees their own ordering contracts
    op.execute("""
        CREATE POLICY partner_contracts ON contracts
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND contract_type = 'ORDERING'
            AND partner_id::text = current_setting('app.related_entity_id', TRUE)
        )
    """)


def downgrade() -> None:
    """Drop customer and genba-related tables, clean up RLS."""

    # Remove foreign keys on users table
    op.drop_constraint("fk_users_related_staff", "users", type_="foreignkey")

    # Drop RLS policies
    op.execute("DROP POLICY IF EXISTS staff_contracts ON contracts")
    op.execute("DROP POLICY IF EXISTS partner_contracts ON contracts")
    op.execute("DROP POLICY IF EXISTS staff_genba_policy ON genba")
    op.execute("DROP POLICY IF EXISTS partner_genba_policy ON genba")
    op.execute("DROP POLICY IF EXISTS worker_genba_policy ON genba")

    # Drop tables
    op.drop_table("contracts")
    op.drop_table("genba_workers")
    op.drop_table("genba_staff_assignments")
    op.drop_table("customer_contact_genba")
    op.drop_table("genba")
    op.drop_table("customer_contacts")
    op.drop_table("customers")
    op.drop_table("workers")
    op.drop_table("staff")
    op.drop_table("partner_companies")
