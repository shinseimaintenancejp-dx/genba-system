"""
Genba Management System — Alembic Migration: 07_setup_pgcrypto_and_keys

Creates:
- encrypt_sensitive() / decrypt_sensitive() stored functions (pgcrypto AES-256-CBC)
- key_infos table (encrypted BYTEA columns for key codes)
- genba_photos table (S3 object references)
- RLS policies on both tables

Sprint 8: Security (pgcrypto) & S3 Storage
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "07_setup_pgcrypto_and_keys"
down_revision: str | Sequence[str] | None = "06_create_manuals_part2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create pgcrypto functions, key_infos, genba_photos tables and configure RLS."""

    # ==========================================================================
    # Verify pgcrypto extension is available (created in init-db.sql)
    # ==========================================================================
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # ==========================================================================
    # Stored functions for encryption/decryption (SEC§4.1)
    # Uses pgp_sym_encrypt/decrypt with AES-256-CBC via pgcrypto
    # ==========================================================================
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

    # ==========================================================================
    # key_infos table — encrypted key management (SEC§4)
    # ==========================================================================
    op.create_table(
        "key_infos",
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
        sa.Column("key_label", sa.String(100), nullable=False),
        sa.Column(
            "key_code_encrypted",
            sa.LargeBinary(),  # BYTEA — stores pgp_sym_encrypt() output
            nullable=True,
        ),
        sa.Column(
            "keybanker_code_encrypted",
            sa.LargeBinary(),  # BYTEA — stores pgp_sym_encrypt() output
            nullable=True,
        ),
        sa.Column("location_description", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
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
    op.create_index("ix_key_infos_genba_id", "key_infos", ["genba_id"])

    # ==========================================================================
    # genba_photos table — S3 object references
    # ==========================================================================
    op.create_table(
        "genba_photos",
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
        sa.Column("photo_type", sa.String(20), nullable=False),
        sa.Column("file_key", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column(
            "uploaded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "photo_type IN ('SITE', 'WORK_REPORT')",
            name="chk_photo_type",
        ),
    )
    op.create_index("ix_genba_photos_genba_id", "genba_photos", ["genba_id"])
    op.create_index(
        "ix_genba_photos_type",
        "genba_photos",
        ["genba_id", "photo_type"],
    )

    # ==========================================================================
    # Row-Level Security — key_infos (SEC§3.3)
    # Staff → ALL, Worker → SELECT (assigned genba), Partner/Customer → NO POLICY
    # ==========================================================================
    op.execute("ALTER TABLE key_infos ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE key_infos FORCE ROW LEVEL SECURITY")

    # Staff/Admin: full access
    op.execute("""
        CREATE POLICY staff_key_infos_policy ON key_infos
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Worker: SELECT only for assigned genba
    op.execute("""
        CREATE POLICY worker_key_infos_policy ON key_infos
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND genba_id IN (
                SELECT gw.genba_id FROM genba_workers gw
                WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                  AND gw.is_active = TRUE
            )
        )
    """)

    # Partner & Customer: NO POLICY = NO ACCESS (SEC§3.3)

    # ==========================================================================
    # Row-Level Security — genba_photos (SEC§3.3)
    # Staff → ALL, Worker → SELECT (assigned), Partner → SELECT + INSERT WORK_REPORT
    # ==========================================================================
    op.execute("ALTER TABLE genba_photos ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE genba_photos FORCE ROW LEVEL SECURITY")

    # Staff/Admin: full access
    op.execute("""
        CREATE POLICY staff_genba_photos_policy ON genba_photos
        FOR ALL
        USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
    """)

    # Worker: SELECT only for assigned genba
    op.execute("""
        CREATE POLICY worker_genba_photos_policy ON genba_photos
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
            AND genba_id IN (
                SELECT gw.genba_id FROM genba_workers gw
                WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                  AND gw.is_active = TRUE
            )
        )
    """)

    # Partner: SELECT for contracted genba
    op.execute("""
        CREATE POLICY partner_genba_photos_select_policy ON genba_photos
        FOR SELECT
        USING (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND genba_id IN (
                SELECT c.genba_id FROM contracts c
                WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
                  AND c.contract_type = 'ORDERING'
                  AND c.status = 'ACTIVE'
            )
        )
    """)

    # Partner: INSERT only WORK_REPORT type for contracted genba
    op.execute("""
        CREATE POLICY partner_genba_photos_insert_policy ON genba_photos
        FOR INSERT
        WITH CHECK (
            current_setting('app.user_role', TRUE) = 'PARTNER'
            AND photo_type = 'WORK_REPORT'
            AND genba_id IN (
                SELECT c.genba_id FROM contracts c
                WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
                  AND c.contract_type = 'ORDERING'
                  AND c.status = 'ACTIVE'
            )
        )
    """)


def downgrade() -> None:
    """Drop tables, policies, and functions."""

    # Drop RLS policies
    for policy in [
        "staff_key_infos_policy",
        "worker_key_infos_policy",
    ]:
        table = "key_infos"
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")

    for policy in [
        "staff_genba_photos_policy",
        "worker_genba_photos_policy",
        "partner_genba_photos_select_policy",
        "partner_genba_photos_insert_policy",
    ]:
        table = "genba_photos"
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table}")

    # Drop tables
    op.drop_table("genba_photos")
    op.drop_table("key_infos")

    # Drop stored functions
    op.execute("DROP FUNCTION IF EXISTS decrypt_sensitive(BYTEA, TEXT)")
    op.execute("DROP FUNCTION IF EXISTS encrypt_sensitive(TEXT, TEXT)")
