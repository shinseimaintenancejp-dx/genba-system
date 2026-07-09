"""
Genba Management System — Key Management Repository.

Database operations for key_infos table using SQLAlchemy async.
Encryption/decryption happens at the PostgreSQL level via pgcrypto
stored functions (encrypt_sensitive / decrypt_sensitive).

The encryption key is read from the GUC variable `app.encryption_key`
which is set per-transaction via SET LOCAL in the database session.

See: SEC§4.1, SEC§4.2
"""

import logging
import uuid

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.key_management.models import KeyInfoModel

logger = logging.getLogger(__name__)


class KeyManagementRepository:
    """Repository for encrypted key info CRUD operations."""

    async def list_by_genba(
        self,
        db: AsyncSession,
        genba_id: uuid.UUID,
    ) -> list[KeyInfoModel]:
        """
        List all key infos for a genba (RLS-filtered).

        Returns KeyInfoModel instances with BYTEA columns.
        The service layer converts these to masked responses.
        """
        result = await db.execute(
            select(KeyInfoModel)
            .where(KeyInfoModel.genba_id == genba_id)
            .order_by(KeyInfoModel.sort_order, KeyInfoModel.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(
        self,
        db: AsyncSession,
        key_id: uuid.UUID,
    ) -> KeyInfoModel | None:
        """Get a single key info by ID."""
        result = await db.execute(
            select(KeyInfoModel).where(KeyInfoModel.id == key_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        genba_id: uuid.UUID,
        key_label: str,
        key_code: str | None = None,
        keybanker_code: str | None = None,
        location_description: str | None = None,
        notes: str | None = None,
        sort_order: int = 0,
    ) -> KeyInfoModel:
        """
        Create a new key info with encrypted key codes.

        Encrypts plaintext key codes at the database level using
        pgp_sym_encrypt with the key from app.encryption_key GUC variable.
        """
        new_id = uuid.uuid4()

        # Build the INSERT using raw SQL to leverage pgcrypto functions
        # This ensures encryption happens entirely in PostgreSQL
        await db.execute(
            text("""
                INSERT INTO key_infos (
                    id, genba_id, key_label,
                    key_code_encrypted, keybanker_code_encrypted,
                    location_description, notes, sort_order
                ) VALUES (
                    :id, :genba_id, :key_label,
                    CASE WHEN :key_code IS NOT NULL
                        THEN encrypt_sensitive(:key_code, current_setting('app.encryption_key'))
                        ELSE NULL
                    END,
                    CASE WHEN :keybanker_code IS NOT NULL
                        THEN encrypt_sensitive(:keybanker_code, current_setting('app.encryption_key'))
                        ELSE NULL
                    END,
                    :location_description, :notes, :sort_order
                )
            """),
            {
                "id": new_id,
                "genba_id": genba_id,
                "key_label": key_label,
                "key_code": key_code,
                "keybanker_code": keybanker_code,
                "location_description": location_description,
                "notes": notes,
                "sort_order": sort_order,
            },
        )
        await db.flush()

        # Fetch the created record
        return await self.get_by_id(db, new_id)  # type: ignore[return-value]

    async def update(
        self,
        db: AsyncSession,
        key_info: KeyInfoModel,
        key_label: str | None = None,
        key_code: str | None = None,
        keybanker_code: str | None = None,
        location_description: str | None = None,
        notes: str | None = None,
        sort_order: int | None = None,
    ) -> KeyInfoModel:
        """
        Update a key info record. Re-encrypts key codes if new values provided.
        """
        # Build dynamic SET clauses
        set_clauses: list[str] = []
        params: dict = {"key_id": key_info.id}

        if key_label is not None:
            set_clauses.append("key_label = :key_label")
            params["key_label"] = key_label

        if key_code is not None:
            set_clauses.append(
                "key_code_encrypted = encrypt_sensitive(:key_code, current_setting('app.encryption_key'))"
            )
            params["key_code"] = key_code

        if keybanker_code is not None:
            set_clauses.append(
                "keybanker_code_encrypted = encrypt_sensitive(:keybanker_code, current_setting('app.encryption_key'))"
            )
            params["keybanker_code"] = keybanker_code

        if location_description is not None:
            set_clauses.append("location_description = :location_description")
            params["location_description"] = location_description

        if notes is not None:
            set_clauses.append("notes = :notes")
            params["notes"] = notes

        if sort_order is not None:
            set_clauses.append("sort_order = :sort_order")
            params["sort_order"] = sort_order

        if not set_clauses:
            return key_info

        # Always update updated_at
        set_clauses.append("updated_at = NOW()")

        set_clause_str = ", ".join(set_clauses)
        await db.execute(
            text(f"UPDATE key_infos SET {set_clause_str} WHERE id = :key_id"),
            params,
        )
        await db.flush()

        # Refresh from DB
        await db.refresh(key_info)
        return key_info

    async def delete(
        self,
        db: AsyncSession,
        key_info: KeyInfoModel,
    ) -> None:
        """Delete a key info record."""
        await db.delete(key_info)
        await db.flush()

    async def decrypt_key(
        self,
        db: AsyncSession,
        key_id: uuid.UUID,
    ) -> dict[str, str | None]:
        """
        Decrypt key codes for a specific key info record.

        Returns plaintext key_code and keybanker_code.
        The encryption key is read from the app.encryption_key GUC variable.

        CRITICAL: The caller MUST log an audit entry with is_sensitive=TRUE
        before or after calling this method. Never log the returned values.
        """
        result = await db.execute(
            text("""
                SELECT
                    CASE WHEN key_code_encrypted IS NOT NULL
                        THEN decrypt_sensitive(key_code_encrypted, current_setting('app.encryption_key'))
                        ELSE NULL
                    END AS key_code,
                    CASE WHEN keybanker_code_encrypted IS NOT NULL
                        THEN decrypt_sensitive(keybanker_code_encrypted, current_setting('app.encryption_key'))
                        ELSE NULL
                    END AS keybanker_code
                FROM key_infos
                WHERE id = :key_id
            """),
            {"key_id": key_id},
        )
        row = result.mappings().first()
        if row is None:
            return {"key_code": None, "keybanker_code": None}

        return {
            "key_code": row["key_code"],
            "keybanker_code": row["keybanker_code"],
        }


# Global repository instance
key_management_repository = KeyManagementRepository()
