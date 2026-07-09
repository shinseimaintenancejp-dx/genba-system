"""
Genba Management System — Key Management Router.

API endpoints for key info CRUD and encrypted key reveal.
Permissions: KEY_READ, KEY_WRITE, KEY_DECRYPT (SEC§2.2).

CRITICAL: The /reveal endpoint returns decrypted plaintext key codes.
Every call is audited with is_sensitive=TRUE (SEC§4.3).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import DbSessionEncrypted, get_current_user, get_db, require_permission
from app.core.permissions import Permission
from app.modules.key_management.schemas import (
    KeyInfoCreate,
    KeyInfoDecryptedResponse,
    KeyInfoResponse,
    KeyInfoUpdate,
)
from app.modules.key_management.service import key_management_service

router = APIRouter()


# =============================================================================
# List Keys (masked)
# =============================================================================
@router.get(
    "/{genba_id}/keys",
    response_model=dict,
    dependencies=[Depends(require_permission(Permission.KEY_READ))],
)
async def list_keys(
    genba_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    List all key infos for a genba.
    Returns masked key codes (●●●●●●) — never plaintext.
    """
    keys = await key_management_service.list_keys(db, genba_id, current_user)
    return {"data": [k.model_dump() for k in keys]}


# =============================================================================
# Create Key
# =============================================================================
@router.post(
    "/{genba_id}/keys",
    response_model=dict,
    status_code=201,
    dependencies=[Depends(require_permission(Permission.KEY_WRITE))],
)
async def create_key(
    genba_id: str,
    data: KeyInfoCreate,
    db: DbSessionEncrypted,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Create a new key info entry with encrypted key codes."""
    key = await key_management_service.create_key(db, genba_id, data, current_user)
    return {"data": key.model_dump()}


# =============================================================================
# Update Key
# =============================================================================
@router.put(
    "/{genba_id}/keys/{key_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(Permission.KEY_WRITE))],
)
async def update_key(
    genba_id: str,
    key_id: str,
    data: KeyInfoUpdate,
    db: DbSessionEncrypted,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Update a key info entry. Re-encrypts key codes if new values provided."""
    key = await key_management_service.update_key(
        db, genba_id, key_id, data, current_user
    )
    return {"data": key.model_dump()}


# =============================================================================
# Delete Key
# =============================================================================
@router.delete(
    "/{genba_id}/keys/{key_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(Permission.KEY_WRITE))],
)
async def delete_key(
    genba_id: str,
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Delete a key info entry."""
    await key_management_service.delete_key(db, genba_id, key_id, current_user)
    return {"data": {"message": "鍵情報を削除しました"}}


# =============================================================================
# Reveal Key (Decrypt) — SENSITIVE ENDPOINT
# =============================================================================
@router.get(
    "/{genba_id}/keys/{key_id}/reveal",
    response_model=dict,
    dependencies=[Depends(require_permission(Permission.KEY_DECRYPT))],
)
async def reveal_key(
    genba_id: str,
    key_id: str,
    # MED-02 Fix: Use DbSessionEncrypted — only this endpoint needs decrypt_sensitive()
    db: DbSessionEncrypted,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Decrypt and return plaintext key codes.

    SECURITY: Every call is audited with is_sensitive=TRUE.
    The frontend MUST auto-hide the displayed values after 30 seconds.
    """
    decrypted = await key_management_service.reveal_key(
        db, genba_id, key_id, current_user
    )
    return {"data": decrypted.model_dump()}
