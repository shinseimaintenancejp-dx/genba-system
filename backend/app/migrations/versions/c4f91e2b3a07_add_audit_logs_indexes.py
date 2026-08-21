"""Add composite indexes to audit_logs for performance optimization.

Revision ID: c4f91e2b3a07
Revises: 81e106aef619
Create Date: 2026-08-21 10:37:00.000000

Performance rationale:
- Without indexes, every query `WHERE entity_id = :cid AND entity_type IN (...)`
  performs a full table scan on audit_logs.
- idx_audit_logs_entity: covers all history lookups by entity (entity_type, entity_id)
  with results ordered by created_at DESC — the primary access pattern.
- idx_audit_logs_user: covers user-activity reports ordered by time.
- Both indexes use BRIN-friendly DESC ordering on created_at to match ORDER BY.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "c4f91e2b3a07"
down_revision = "81e106aef619"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Primary index: covers all history queries by entity
    # Matches the query pattern: WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC
    op.create_index(
        "idx_audit_logs_entity",
        "audit_logs",
        ["entity_type", "entity_id", "created_at"],
        postgresql_ops={"created_at": "DESC"},
    )

    # Secondary index: covers user-activity report queries
    # Matches the query pattern: WHERE user_id = ? ORDER BY created_at DESC
    op.create_index(
        "idx_audit_logs_user",
        "audit_logs",
        ["user_id", "created_at"],
        postgresql_ops={"created_at": "DESC"},
    )


def downgrade() -> None:
    op.drop_index("idx_audit_logs_user", table_name="audit_logs")
    op.drop_index("idx_audit_logs_entity", table_name="audit_logs")
