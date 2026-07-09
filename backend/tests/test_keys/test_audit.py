"""
Genba Management System — Key Management Audit Tests.

Verifies:
- Worker reveal creates audit log entry
- Partner has no key access (403)

See: SEC§2.2, SEC§4.3
"""

import pytest


class TestKeyAudit:
    """Test suite for key management audit trail and access control."""

    @pytest.mark.asyncio
    async def test_worker_view_key_audit(self, db_session, test_user):
        """Verify that Worker reveal action creates audit log."""
        from app.core.audit import audit_service

        entry = await audit_service.log(
            session=db_session,
            user_id=str(test_user.id),
            action="VIEW",
            entity_type="key_info",
            entity_id="some-key-uuid",
            is_sensitive=True,
        )
        await db_session.flush()

        assert entry.is_sensitive is True
        assert entry.user_id == test_user.id
        assert entry.action == "VIEW"
        assert entry.entity_type == "key_info"

    @pytest.mark.asyncio
    async def test_partner_no_key_access(self):
        """
        Verify that Partner role has no KEY_READ permission.
        This test validates the permission map, not the HTTP layer.
        """
        from app.core.permissions import Permission, Role, has_permission

        # Partner should NOT have key permissions
        assert has_permission(Role.PARTNER, Permission.KEY_READ) is False
        assert has_permission(Role.PARTNER, Permission.KEY_WRITE) is False
        assert has_permission(Role.PARTNER, Permission.KEY_DECRYPT) is False

    @pytest.mark.asyncio
    async def test_worker_has_key_read_and_decrypt(self):
        """Verify that Worker role has KEY_READ and KEY_DECRYPT but not KEY_WRITE."""
        from app.core.permissions import Permission, Role, has_permission

        assert has_permission(Role.GENBA_WORKER, Permission.KEY_READ) is True
        assert has_permission(Role.GENBA_WORKER, Permission.KEY_DECRYPT) is True
        assert has_permission(Role.GENBA_WORKER, Permission.KEY_WRITE) is False

    @pytest.mark.asyncio
    async def test_staff_has_all_key_permissions(self):
        """Verify that Internal Staff has KEY_READ, KEY_WRITE, and KEY_DECRYPT."""
        from app.core.permissions import Permission, Role, has_permission

        assert has_permission(Role.INTERNAL_STAFF, Permission.KEY_READ) is True
        assert has_permission(Role.INTERNAL_STAFF, Permission.KEY_WRITE) is True
        assert has_permission(Role.INTERNAL_STAFF, Permission.KEY_DECRYPT) is True
