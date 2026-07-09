"""
Genba Management System — Alembic Migration: 10_finance_rls_and_encryption_fix

Fixes:
- HIGH-03: Add RLS policies to invoices, quotations, quotation_items, approval_requests
- MED-01: Change encrypt_sensitive/decrypt_sensitive from IMMUTABLE to VOLATILE

Sprint 10 — Security Hardening
"""

from collections.abc import Sequence

from alembic import op

# Revision identifiers used by Alembic
revision: str = "10_finance_rls_encrypt_fix"
down_revision: str | Sequence[str] | None = "6fb5a7a9692c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Enable RLS on finance tables and fix encryption function volatility."""

    # ==========================================================================
    # MED-01: Fix encrypt_sensitive / decrypt_sensitive — IMMUTABLE → VOLATILE
    # IMMUTABLE allows PostgreSQL to cache results, which is semantically wrong
    # for encryption functions that should produce unique output each call.
    # ==========================================================================
    op.execute("""
        CREATE OR REPLACE FUNCTION encrypt_sensitive(plaintext TEXT, key TEXT)
        RETURNS BYTEA AS $$
        BEGIN
            RETURN pgp_sym_encrypt(plaintext, key, 'cipher-algo=aes256');
        END;
        $$ LANGUAGE plpgsql VOLATILE STRICT;
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION decrypt_sensitive(ciphertext BYTEA, key TEXT)
        RETURNS TEXT AS $$
        BEGIN
            RETURN pgp_sym_decrypt(ciphertext, key, 'cipher-algo=aes256');
        EXCEPTION
            WHEN OTHERS THEN
                RAISE EXCEPTION '復号化に失敗しました。暗号キーが正しくない可能性があります。';
        END;
        $$ LANGUAGE plpgsql VOLATILE STRICT;
    """)

    # ==========================================================================
    # HIGH-03: Enable RLS on approval_requests
    # Staff (ALL roles with write) can manage approvals.
    # ==========================================================================
    op.execute("ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY")

    # Admin + Senior Staff: full access (approve/reject)
    op.execute("""
        CREATE POLICY approval_admin_policy ON approval_requests
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF'))
    """)

    # Internal Staff: SELECT + INSERT (submit requests), no UPDATE/DELETE
    op.execute("""
        CREATE POLICY approval_staff_select_policy ON approval_requests
        FOR SELECT
        USING (current_setting('app.user_role', TRUE) = 'INTERNAL_STAFF')
    """)

    op.execute("""
        CREATE POLICY approval_staff_insert_policy ON approval_requests
        FOR INSERT
        WITH CHECK (
            current_setting('app.user_role', TRUE) = 'INTERNAL_STAFF'
            AND requested_by::text = current_setting('app.user_id', TRUE)
        )
    """)

    # ==========================================================================
    # HIGH-03: Enable RLS on invoices
    # Staff sees all; Partner sees only OUTGOING invoices for their contracts
    # ==========================================================================
    op.execute("ALTER TABLE invoices ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE invoices FORCE ROW LEVEL SECURITY")

    # Staff/Admin: full access
    op.execute("""
        CREATE POLICY invoice_staff_policy ON invoices
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Partner: SELECT only invoices linked to their contracts (ORDERING type)
    op.execute("""
        CREATE POLICY invoice_partner_select_policy ON invoices
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND invoice_type = 'OUTGOING'
            AND contract_id IN (
                SELECT id FROM contracts
                WHERE partner_id::text = current_setting('app.related_entity_id', TRUE)
                  AND contract_type = 'ORDERING'
                  AND status = 'ACTIVE'
            )
        )
    """)

    # Workers and Customers: NO policy = NO access

    # ==========================================================================
    # HIGH-03: Enable RLS on quotations
    # Staff sees all; no partner/worker access to quotations
    # ==========================================================================
    op.execute("ALTER TABLE quotations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE quotations FORCE ROW LEVEL SECURITY")

    # Staff/Admin: full access
    op.execute("""
        CREATE POLICY quotation_staff_policy ON quotations
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # ==========================================================================
    # HIGH-03: Enable RLS on quotation_items (child table, inherits from quotations)
    # ==========================================================================
    op.execute("ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE quotation_items FORCE ROW LEVEL SECURITY")

    # Staff/Admin: full access via quotation ownership
    op.execute("""
        CREATE POLICY quotation_items_staff_policy ON quotation_items
        FOR ALL
        USING (
            current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF')
        )
    """)


def downgrade() -> None:
    """Reverse RLS policies and restore original function volatility."""

    # Drop quotation_items policies
    op.execute("DROP POLICY IF EXISTS quotation_items_staff_policy ON quotation_items")
    op.execute("ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY")

    # Drop quotation policies
    op.execute("DROP POLICY IF EXISTS quotation_staff_policy ON quotations")
    op.execute("ALTER TABLE quotations DISABLE ROW LEVEL SECURITY")

    # Drop invoice policies
    op.execute("DROP POLICY IF EXISTS invoice_staff_policy ON invoices")
    op.execute("DROP POLICY IF EXISTS invoice_partner_select_policy ON invoices")
    op.execute("ALTER TABLE invoices DISABLE ROW LEVEL SECURITY")

    # Drop approval_requests policies
    op.execute("DROP POLICY IF EXISTS approval_admin_policy ON approval_requests")
    op.execute("DROP POLICY IF EXISTS approval_staff_select_policy ON approval_requests")
    op.execute("DROP POLICY IF EXISTS approval_staff_insert_policy ON approval_requests")
    op.execute("ALTER TABLE approval_requests DISABLE ROW LEVEL SECURITY")

    # Restore IMMUTABLE (original — not recommended, but reversible)
    op.execute("""
        CREATE OR REPLACE FUNCTION encrypt_sensitive(plaintext TEXT, key TEXT)
        RETURNS BYTEA AS $$
        BEGIN
            RETURN pgp_sym_encrypt(plaintext, key, 'cipher-algo=aes256');
        END;
        $$ LANGUAGE plpgsql IMMUTABLE STRICT;
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION decrypt_sensitive(ciphertext BYTEA, key TEXT)
        RETURNS TEXT AS $$
        BEGIN
            RETURN pgp_sym_decrypt(ciphertext, key, 'cipher-algo=aes256');
        EXCEPTION
            WHEN OTHERS THEN
                RAISE EXCEPTION '復号化に失敗しました。暗号キーが正しくない可能性があります。';
        END;
        $$ LANGUAGE plpgsql IMMUTABLE STRICT;
    """)
