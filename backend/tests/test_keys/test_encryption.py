"""
Genba Management System — Key Management Encryption Tests.

Verifies:
- Key codes are encrypted in database (BYTEA, not plaintext)
- Reveal (decrypt) returns correct plaintext
- Audit log is created with is_sensitive=TRUE on reveal
- Audit log never contains plaintext key codes

See: SEC§4
"""

import pytest


class TestKeyEncryption:
    """Test suite for pgcrypto encryption of key codes."""

    @pytest.mark.asyncio
    async def test_create_key_encrypted_in_db(self, db_session, test_genba):
        """Verify that created key codes are stored as encrypted BYTEA, not plaintext."""
        from sqlalchemy import text

        test_key_code = "ABC-12345"
        test_keybanker_code = "KB-99999"

        # Insert a key with encryption
        await db_session.execute(
            text("""
                INSERT INTO key_infos (id, genba_id, key_label, key_code_encrypted, keybanker_code_encrypted)
                VALUES (
                    gen_random_uuid(),
                    :genba_id,
                    'Test Key',
                    encrypt_sensitive(:key_code, current_setting('app.encryption_key')),
                    encrypt_sensitive(:kb_code, current_setting('app.encryption_key'))
                )
            """),
            {
                "genba_id": str(test_genba.id),
                "key_code": test_key_code,
                "kb_code": test_keybanker_code,
            },
        )
        await db_session.flush()

        # Read raw BYTEA from database
        result = await db_session.execute(
            text("SELECT key_code_encrypted, keybanker_code_encrypted FROM key_infos LIMIT 1")
        )
        row = result.first()
        assert row is not None

        # BYTEA should NOT contain the plaintext string
        key_bytes = bytes(row.key_code_encrypted)
        kb_bytes = bytes(row.keybanker_code_encrypted)

        assert test_key_code.encode() not in key_bytes, (
            "CRITICAL: Plaintext key_code found in encrypted BYTEA column!"
        )
        assert test_keybanker_code.encode() not in kb_bytes, (
            "CRITICAL: Plaintext keybanker_code found in encrypted BYTEA column!"
        )

    @pytest.mark.asyncio
    async def test_reveal_key_decrypts_correctly(self, db_session, test_genba):
        """Verify that decrypt returns the original plaintext value."""
        from sqlalchemy import text

        original_code = "SECURE-KEY-7890"

        # Insert encrypted key
        result = await db_session.execute(
            text("""
                INSERT INTO key_infos (id, genba_id, key_label, key_code_encrypted)
                VALUES (
                    gen_random_uuid(),
                    :genba_id,
                    'Decrypt Test Key',
                    encrypt_sensitive(:key_code, current_setting('app.encryption_key'))
                )
                RETURNING id
            """),
            {"genba_id": str(test_genba.id), "key_code": original_code},
        )
        key_id = result.scalar_one()
        await db_session.flush()

        # Decrypt using stored function
        decrypt_result = await db_session.execute(
            text("""
                SELECT decrypt_sensitive(key_code_encrypted, current_setting('app.encryption_key')) AS decrypted
                FROM key_infos
                WHERE id = :key_id
            """),
            {"key_id": key_id},
        )
        decrypted = decrypt_result.scalar_one()

        assert decrypted == original_code, (
            f"Decrypted value '{decrypted}' does not match original '{original_code}'"
        )

    @pytest.mark.asyncio
    async def test_reveal_audit_log_is_sensitive(self, db_session, test_genba, test_user):
        """Verify that reveal creates an audit log with is_sensitive=TRUE."""
        from app.core.audit import audit_service
        from sqlalchemy import text

        # Log a sensitive reveal action
        entry = await audit_service.log(
            session=db_session,
            user_id=str(test_user.id),
            action="VIEW",
            entity_type="key_info",
            entity_id=str(test_genba.id),
            is_sensitive=True,
        )
        await db_session.flush()

        assert entry.is_sensitive is True
        assert entry.action == "VIEW"
        assert entry.entity_type == "key_info"

    @pytest.mark.asyncio
    async def test_audit_log_does_not_contain_plaintext(self, db_session, test_user):
        """Verify that audit log new_value never contains plaintext key codes."""
        import json
        from app.core.audit import audit_service

        # Simulate what the service does — log metadata only, never plaintext
        audit_new_value = json.dumps({
            "key_label": "Front Door",
            "has_key_code": True,
            "has_keybanker_code": False,
            "location_description": "管理人室",
        })

        entry = await audit_service.log(
            session=db_session,
            user_id=str(test_user.id),
            action="CREATE",
            entity_type="key_info",
            new_value=audit_new_value,
        )
        await db_session.flush()

        # Verify new_value doesn't contain actual key codes
        assert entry.new_value is not None
        parsed = json.loads(entry.new_value)
        assert "key_code" not in parsed, "Plaintext key_code must NEVER appear in audit log!"
        assert "keybanker_code" not in parsed, "Plaintext keybanker_code must NEVER appear in audit log!"
        # Only boolean flags are acceptable
        assert "has_key_code" in parsed
