"""
Genba Management System — FastAPI Dependency Injection Container.

Provides reusable Depends() functions for:
- Extracting and validating the current user from JWT cookies (SEC§1)
- Database session with RLS context (SEC§3.2)
- Permission checking (SEC§2.3)
"""

import logging
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session_with_rls
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.permissions import Permission, Role, has_permission
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)


# =============================================================================
# Current User Extraction from JWT Cookie (SEC§1)
# =============================================================================

async def get_current_user_payload(
    access_token: str | None = Cookie(default=None),
) -> dict:
    """
    Extract and validate the JWT access token from the httpOnly cookie.

    Raises:
        UnauthorizedError: If no token is present or token is invalid

    Returns:
        Decoded JWT payload containing user_id, role, related_entity_id
    """
    if not access_token:
        raise UnauthorizedError()

    # decode_access_token raises TokenExpiredError or UnauthorizedError if invalid
    return decode_access_token(access_token)


async def get_current_user(
    payload: Annotated[dict, Depends(get_current_user_payload)],
) -> dict:
    """
    Get the current authenticated user's information.

    Returns:
        Dictionary with user_id, role, and related_entity_id
    """
    user_id = payload.get("sub")
    role = payload.get("role")

    if not user_id or not role:
        raise UnauthorizedError()

    return {
        "id": user_id,
        "role": role,
        "related_entity_id": payload.get("related_entity_id"),
    }


# Type alias for dependency injection
CurrentUser = Annotated[dict, Depends(get_current_user)]


# =============================================================================
# Database Session with RLS Context (SEC§3.2)
# =============================================================================

async def get_db(
    current_user: CurrentUser,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a database session with RLS context set for the current user.

    This is the standard database dependency for all authenticated endpoints.
    The RLS variables (app.user_role, app.related_entity_id) are set via
    SET LOCAL before any queries are executed.

    MED-02 Fix: Does NOT inject the encryption key. The encryption key is
    only available via get_db_with_encryption for key management endpoints.
    Minimizes the attack surface by not exposing the key in every transaction.

    Usage:
        async def endpoint(db: DbSession):
            # RLS is already configured — queries auto-filtered by policy
    """
    async for session in get_db_session_with_rls(
        user_id=current_user["id"],
        user_role=current_user["role"],
        related_entity_id=current_user.get("related_entity_id"),
        encryption_key="",  # MED-02: Do not expose encryption key in standard sessions
    ):
        yield session


async def get_db_with_encryption(
    current_user: CurrentUser,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a database session with RLS context AND the encryption key injected.

    MED-02 Fix: ONLY use this dependency for endpoints that need to
    call encrypt_sensitive() or decrypt_sensitive() (i.e., key management).
    Do NOT use this as the default — it exposes the encryption key in the
    PostgreSQL session's GUC variables.

    Usage:
        # Only in key_management/router.py reveal endpoint:
        async def reveal_key(db: DbSessionEncrypted):
            ...
    """
    async for session in get_db_session_with_rls(
        user_id=current_user["id"],
        user_role=current_user["role"],
        related_entity_id=current_user.get("related_entity_id"),
        encryption_key=settings.ENCRYPTION_KEY,
    ):
        yield session


# Type aliases for dependency injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
DbSessionEncrypted = Annotated[AsyncSession, Depends(get_db_with_encryption)]


# =============================================================================
# Permission Checking (SEC§2.3)
# =============================================================================

def require_permission(permission: Permission):
    """
    Factory function that creates a FastAPI dependency for permission checking.

    Usage:
        @router.post("/genba")
        async def create_genba(
            _: Annotated[None, Depends(require_permission(Permission.GENBA_WRITE))],
            current_user: CurrentUser,
        ):
            ...

    Args:
        permission: The required permission

    Returns:
        A FastAPI dependency function that raises ForbiddenError if unauthorized
    """
    async def check_permission(current_user: CurrentUser) -> None:
        role = Role(current_user["role"])
        if not has_permission(role, permission):
            logger.warning(
                "Permission denied",
                extra={
                    "user_id": current_user["id"],
                    "role": current_user["role"],
                    "required_permission": permission,
                },
            )
            raise ForbiddenError()

    return check_permission


def require_roles(*roles: Role):
    """
    Factory function that creates a FastAPI dependency for role checking.

    Usage:
        @router.post("/approvals/{id}/approve")
        async def approve(
            _: Annotated[None, Depends(require_roles(Role.ADMIN, Role.SENIOR_STAFF))],
        ):
            ...

    Args:
        roles: One or more roles that are allowed

    Returns:
        A FastAPI dependency function that raises ForbiddenError if unauthorized
    """
    allowed_roles = set(roles)

    async def check_role(current_user: CurrentUser) -> None:
        user_role = Role(current_user["role"])
        if user_role not in allowed_roles:
            logger.warning(
                "Role check failed",
                extra={
                    "user_id": current_user["id"],
                    "role": current_user["role"],
                    "required_roles": [r.value for r in allowed_roles],
                },
            )
            raise ForbiddenError()

    return check_role
