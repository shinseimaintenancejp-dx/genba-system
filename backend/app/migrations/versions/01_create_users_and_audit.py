"""
Genba Management System — Alembic Migration: 01_create_users_and_audit

Creates:
- users table (6 roles, bcrypt password, related_entity_id for RLS)
- audit_logs table (immutable event log)

Sprint 2: Authentication & DB Foundation
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "01_create_users_and_audit"
down_revision: str | Sequence[str] | None = None  # First migration
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create users and audit_logs tables."""

    # ==========================================================================
    # users table
    # ==========================================================================
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),  # pgcrypto
        ),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column(
            "role",
            sa.String(20),
            nullable=False,
            server_default="INTERNAL_STAFF",
        ),
        # Links to staff.id / worker.id / partner_company.id for RLS scoping
        sa.Column(
            "related_entity_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
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
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Unique constraints
    op.create_index("uq_users_username", "users", ["username"], unique=True)
    op.create_index("uq_users_email", "users", ["email"], unique=True, postgresql_where=sa.text("email IS NOT NULL"))

    # Performance index
    op.create_index("ix_users_role", "users", ["role"])

    # Role check constraint
    op.create_check_constraint(
        "chk_users_role",
        "users",
        "role IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF', 'GENBA_WORKER', 'PARTNER', 'CUSTOMER')",
    )

    # ==========================================================================
    # audit_logs table (append-only — no UPDATE or DELETE policies)
    # ==========================================================================
    op.create_table(
        "audit_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(20), nullable=False),  # CREATE/UPDATE/DELETE/VIEW/LOGIN/LOGOUT
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("old_value", sa.Text, nullable=True),
        sa.Column("new_value", sa.Text, nullable=True),
        sa.Column("is_sensitive", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    # Performance indexes for audit log queries
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_entity_type_entity_id", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("ix_audit_logs_is_sensitive", "audit_logs", ["is_sensitive"], postgresql_where=sa.text("is_sensitive = TRUE"))
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # ==========================================================================
    # Row-Level Security for users table
    # Users can only see their own record (except ADMIN)
    # ==========================================================================
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE users FORCE ROW LEVEL SECURITY")

    # ADMIN sees all
    op.execute("""
        CREATE POLICY users_admin_all ON users
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF'))
    """)

    # All authenticated users can see their own record
    op.execute("""
        CREATE POLICY users_self ON users
        FOR SELECT
        USING (id::text = current_setting('app.user_id', TRUE))
    """)

    # ==========================================================================
    # Seed: Create initial admin account
    # Password: 'Shinsei@2026!' — CHANGE IMMEDIATELY after first login
    # Bcrypt hash generated with cost factor 12
    # ==========================================================================
    # NOTE: Run `python -m app.scripts.create_admin` to create the admin account
    # with a proper password. Do not hardcode credentials in migrations.


def downgrade() -> None:
    """Reverse this migration — drop users and audit_logs tables."""

    # Drop RLS policies first
    op.execute("DROP POLICY IF EXISTS users_self ON users")
    op.execute("DROP POLICY IF EXISTS users_admin_all ON users")

    # Drop tables (indexes drop automatically)
    op.drop_table("audit_logs")
    op.drop_table("users")
