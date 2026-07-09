"""
Genba Management System — Key Management Service.

Business logic for key info CRUD and encrypted key reveal.
All sensitive access is logged via AuditService with is_sensitive=True.

CRITICAL: Plaintext key codes MUST NEVER be logged (SEC§4.2).
"""

import json
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.key_management.repository import key_management_repository
from app.modules.key_management.schemas import (
    KeyInfoCreate,
    KeyInfoDecryptedResponse,
    KeyInfoResponse,
    KeyInfoUpdate,
)

logger = logging.getLogger(__name__)


class KeyManagementService:
    """Service layer for key management operations."""

    def _to_masked_response(self, key_info) -> KeyInfoResponse:
        """Convert a KeyInfoModel to a masked response (no plaintext)."""
        return KeyInfoResponse(
            id=key_info.id,
            genba_id=key_info.genba_id,
            key_label=key_info.key_label,
            has_key_code=key_info.key_code_encrypted is not None,
            has_keybanker_code=key_info.keybanker_code_encrypted is not None,
            key_code_masked="●●●●●●" if key_info.key_code_encrypted else "—",
            keybanker_code_masked="●●●●●●" if key_info.keybanker_code_encrypted else "—",
            location_description=key_info.location_description,
            notes=key_info.notes,
            sort_order=key_info.sort_order,
            created_at=key_info.created_at,
            updated_at=key_info.updated_at,
        )

    async def list_keys(
        self,
        db: AsyncSession,
        genba_id: str,
        current_user: dict,
    ) -> list[KeyInfoResponse]:
        """
        List all keys for a genba (masked response).
        RLS filters data based on user role.
        """
        genba_uuid = uuid.UUID(genba_id)
        keys = await key_management_repository.list_by_genba(db, genba_uuid)

        # Log VIEW action
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="VIEW",
            entity_type="key_info",
            entity_id=genba_id,
            is_sensitive=False,  # Listing masked keys is not sensitive
        )

        return [self._to_masked_response(k) for k in keys]

    async def create_key(
        self,
        db: AsyncSession,
        genba_id: str,
        data: KeyInfoCreate,
        current_user: dict,
    ) -> KeyInfoResponse:
        """
        Create a new key info entry with encrypted key codes.
        """
        genba_uuid = uuid.UUID(genba_id)

        key_info = await key_management_repository.create(
            db=db,
            genba_id=genba_uuid,
            key_label=data.key_label,
            key_code=data.key_code,
            keybanker_code=data.keybanker_code,
            location_description=data.location_description,
            notes=data.notes,
            sort_order=data.sort_order,
        )

        # Audit log — NEVER include plaintext key codes
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="CREATE",
            entity_type="key_info",
            entity_id=str(key_info.id),
            new_value=json.dumps({
                "key_label": key_info.key_label,
                "has_key_code": data.key_code is not None,
                "has_keybanker_code": data.keybanker_code is not None,
                "location_description": key_info.location_description,
            }),
        )

        logger.info(
            "Key info created",
            extra={"key_id": str(key_info.id), "genba_id": genba_id},
        )

        return self._to_masked_response(key_info)

    async def update_key(
        self,
        db: AsyncSession,
        genba_id: str,
        key_id: str,
        data: KeyInfoUpdate,
        current_user: dict,
    ) -> KeyInfoResponse:
        """Update a key info entry. Re-encrypts key codes if new values provided."""
        key_uuid = uuid.UUID(key_id)
        key_info = await key_management_repository.get_by_id(db, key_uuid)

        if not key_info:
            raise NotFoundError("鍵情報")

        if str(key_info.genba_id) != genba_id:
            raise NotFoundError("鍵情報")

        # Capture old state for audit (no plaintext)
        old_value = json.dumps({
            "key_label": key_info.key_label,
            "location_description": key_info.location_description,
        })

        updated = await key_management_repository.update(
            db=db,
            key_info=key_info,
            key_label=data.key_label,
            key_code=data.key_code,
            keybanker_code=data.keybanker_code,
            location_description=data.location_description,
            notes=data.notes,
            sort_order=data.sort_order,
        )

        # Audit log — NEVER include plaintext key codes
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="UPDATE",
            entity_type="key_info",
            entity_id=key_id,
            old_value=old_value,
            new_value=json.dumps({
                "key_label": updated.key_label,
                "key_code_changed": data.key_code is not None,
                "keybanker_code_changed": data.keybanker_code is not None,
                "location_description": updated.location_description,
            }),
        )

        return self._to_masked_response(updated)

    async def delete_key(
        self,
        db: AsyncSession,
        genba_id: str,
        key_id: str,
        current_user: dict,
    ) -> None:
        """Delete a key info entry."""
        key_uuid = uuid.UUID(key_id)
        key_info = await key_management_repository.get_by_id(db, key_uuid)

        if not key_info:
            raise NotFoundError("鍵情報")

        if str(key_info.genba_id) != genba_id:
            raise NotFoundError("鍵情報")

        await key_management_repository.delete(db, key_info)

        # Audit log
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="DELETE",
            entity_type="key_info",
            entity_id=key_id,
            old_value=json.dumps({"key_label": key_info.key_label}),
        )

        logger.info(
            "Key info deleted",
            extra={"key_id": key_id, "genba_id": genba_id},
        )

    async def reveal_key(
        self,
        db: AsyncSession,
        genba_id: str,
        key_id: str,
        current_user: dict,
    ) -> KeyInfoDecryptedResponse:
        """
        Decrypt and return plaintext key codes.

        CRITICAL SECURITY RULES (SEC§4.2, SEC§4.3):
        1. ALWAYS log an audit entry with is_sensitive=TRUE
        2. NEVER log the decrypted plaintext values
        3. NEVER include plaintext in audit new_value
        """
        key_uuid = uuid.UUID(key_id)
        key_info = await key_management_repository.get_by_id(db, key_uuid)

        if not key_info:
            raise NotFoundError("鍵情報")

        if str(key_info.genba_id) != genba_id:
            raise NotFoundError("鍵情報")

        # Decrypt key codes at database level
        decrypted = await key_management_repository.decrypt_key(db, key_uuid)

        # MANDATORY audit log for sensitive access (SEC§4.3)
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="VIEW",
            entity_type="key_info",
            entity_id=key_id,
            is_sensitive=True,  # CRITICAL: Flag for security review
            # new_value intentionally omitted — NEVER log decrypted content
        )

        logger.info(
            "Sensitive key data revealed",
            extra={
                "key_id": key_id,
                "genba_id": genba_id,
                "user_id": str(current_user["id"]),
                # NEVER log the actual key code values
            },
        )

        return KeyInfoDecryptedResponse(
            id=key_info.id,
            genba_id=key_info.genba_id,
            key_label=key_info.key_label,
            key_code=decrypted["key_code"],
            keybanker_code=decrypted["keybanker_code"],
            location_description=key_info.location_description,
            notes=key_info.notes,
        )


# Global service instance
key_management_service = KeyManagementService()
