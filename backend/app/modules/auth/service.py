"""
Genba Management System — Auth Module: Service (Business Logic).

Handles:
- Login with account lockout (SEC§1.5)
- Refresh token rotation (SEC§1.3) — always queries DB for fresh role/entity_id
- Logout (single device and all devices)
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    NotFoundError,
    TokenExpiredError,
    UnauthorizedError,
)
from app.core.redis import (
    LOCKOUT_THRESHOLD,
    clear_failed_login_attempts,
    get_lockout_remaining_seconds,
    is_account_locked,
    lock_account,
    record_failed_login,
    revoke_all_user_sessions,
    revoke_refresh_token,
    store_refresh_token,
    validate_refresh_token,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.modules.auth.models import UserModel
from app.modules.auth.repository import user_repository
from app.modules.auth.schemas import CreateUserRequest, UserResponse

logger = logging.getLogger(__name__)


class AuthService:
    """
    Authentication business logic.

    Coordinates between security utilities, Redis session management,
    database operations, and audit logging.
    """

    async def login(
        self,
        session: AsyncSession,
        username: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[UserModel, str, str]:
        """
        Authenticate a user and issue JWT tokens.

        Flow (SEC§1.3):
        1. Check account lockout via Redis
        2. Fetch user from DB
        3. Verify password with bcrypt
        4. On failure: increment counter → lock if threshold reached
        5. On success: clear counter, update last_login, issue tokens

        Args:
            session: Database session (with RLS context bypassed for auth)
            username: The username to authenticate
            password: The plain text password to verify
            ip_address: Client IP for audit logging
            user_agent: Client user agent for audit logging

        Returns:
            Tuple of (user, access_token, refresh_token)

        Raises:
            AccountLockedError: If account is locked
            InvalidCredentialsError: If credentials are wrong
        """
        # Step 1: Check account lockout
        if await is_account_locked(username):
            remaining = await get_lockout_remaining_seconds(username)
            remaining_minutes = max(1, remaining // 60)
            raise AccountLockedError(remaining_minutes=remaining_minutes)

        # Step 2: Fetch user from database
        user = await user_repository.get_by_username(session, username)

        # Step 3 & 4: Verify credentials
        if not user or not user.is_active:
            # Still record failed attempt to prevent username enumeration
            await self._handle_failed_login(username)
            raise InvalidCredentialsError()

        if not verify_password(password, user.hashed_password):
            attempts = await self._handle_failed_login(username)
            logger.warning(
                "Failed login attempt",
                extra={
                    "username": username,
                    "attempts": attempts,
                    "ip": ip_address,
                },
            )
            raise InvalidCredentialsError()

        # Step 5: Successful login
        await clear_failed_login_attempts(username)
        await user_repository.update_last_login(session, user.id)

        # Create tokens
        related_entity_id = str(user.related_entity_id) if user.related_entity_id else None
        access_token = create_access_token(
            user_id=str(user.id),
            role=user.role,
            related_entity_id=related_entity_id,
        )
        refresh_token, jti = create_refresh_token(user_id=str(user.id))

        # Store refresh token in Redis (for rotation validation)
        await store_refresh_token(
            user_id=str(user.id),
            token_jti=jti,
            ttl_seconds=7 * 24 * 3600,
        )

        # Audit log
        await audit_service.log_login(
            session=session,
            user_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(
            "User logged in",
            extra={"user_id": str(user.id), "role": user.role, "ip": ip_address},
        )

        return user, access_token, refresh_token

    async def refresh_tokens(
        self,
        session: AsyncSession,
        refresh_token: str,
    ) -> tuple[str, str]:
        """
        Rotate refresh tokens (SEC§1.3).

        Flow:
        1. Decode and validate the refresh token JWT
        2. Verify the JTI exists in Redis (not already rotated)
        3. Query DB for fresh user data (role, entity_id, is_active)
        4. Delete the old JTI from Redis
        5. Issue new access + refresh tokens with up-to-date role
        6. Store new JTI in Redis

        NOTE: The refresh token payload intentionally does NOT carry role or
        related_entity_id (only sub, jti, type, iat, exp). Fresh values MUST
        come from the database on every rotation to prevent stale-role attacks
        (e.g. demoted user retaining elevated access until token expiry).

        Args:
            session: Database session (bypass-RLS, for system-level lookup)
            refresh_token: The current refresh token from the cookie

        Returns:
            Tuple of (new_access_token, new_refresh_token)

        Raises:
            UnauthorizedError: If token is invalid, already rotated, or user
                               is inactive/deleted
            TokenExpiredError: If token has expired
        """
        import uuid as _uuid

        # Step 1: Decode and validate the refresh token JWT
        payload = decode_refresh_token(refresh_token)
        user_id = payload.get("sub")
        old_jti = payload.get("jti")

        if not user_id or not old_jti:
            raise UnauthorizedError()

        # Step 2: Verify JTI exists in Redis (prevents reuse of rotated tokens)
        is_valid = await validate_refresh_token(user_id=user_id, token_jti=old_jti)
        if not is_valid:
            # Token has already been rotated — possible replay attack
            # Revoke ALL sessions for this user as a security measure
            logger.warning(
                "Refresh token replay detected — revoking all sessions",
                extra={"user_id": user_id},
            )
            await revoke_all_user_sessions(user_id)
            raise UnauthorizedError()

        # Step 3: Query DB for fresh user state
        # This ensures role changes and account deactivation take effect
        # immediately on the next token rotation, not after 7 days.
        user = await user_repository.get_by_id(session, _uuid.UUID(user_id))
        if not user or not user.is_active:
            # Account deactivated after the refresh token was issued — deny.
            logger.warning(
                "Token refresh denied — user inactive or not found",
                extra={"user_id": user_id},
            )
            # Also revoke the (now-invalid) token from Redis
            await revoke_refresh_token(user_id=user_id, token_jti=old_jti)
            raise UnauthorizedError()

        # Step 4: Rotate — delete old JTI atomically before issuing new one
        await revoke_refresh_token(user_id=user_id, token_jti=old_jti)

        # Step 5: Issue new tokens using FRESH data from DB (not stale payload)
        related_entity_id = str(user.related_entity_id) if user.related_entity_id else None
        new_access_token = create_access_token(
            user_id=str(user.id),
            role=user.role,
            related_entity_id=related_entity_id,
        )
        new_refresh_token, new_jti = create_refresh_token(user_id=str(user.id))

        # Step 6: Store new JTI
        await store_refresh_token(
            user_id=str(user.id),
            token_jti=new_jti,
            ttl_seconds=7 * 24 * 3600,
        )

        logger.info(
            "Refresh token rotated",
            extra={"user_id": str(user.id), "role": user.role},
        )

        return new_access_token, new_refresh_token

    async def logout(
        self,
        session: AsyncSession,
        user_id: str,
        refresh_token: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        """
        Logout a user by revoking their refresh token.

        Args:
            session: Database session
            user_id: The user's UUID string
            refresh_token: The refresh token to revoke (None = revoke all)
            ip_address: Client IP for audit logging
        """
        if refresh_token:
            try:
                payload = decode_refresh_token(refresh_token)
                jti = payload.get("jti")
                if jti:
                    await revoke_refresh_token(user_id=user_id, token_jti=jti)
            except (UnauthorizedError, TokenExpiredError):
                # Token is already invalid — proceed with logout anyway
                pass
        else:
            # Logout all devices
            await revoke_all_user_sessions(user_id)

        await audit_service.log_logout(
            session=session,
            user_id=user_id,
            ip_address=ip_address,
        )

    async def get_current_user_model(
        self,
        session: AsyncSession,
        user_id: str,
    ) -> UserModel:
        """
        Fetch the full UserModel for the authenticated user.

        Args:
            session: Database session
            user_id: UUID string from JWT payload

        Returns:
            UserModel instance

        Raises:
            NotFoundError: If user no longer exists
        """
        import uuid
        user = await user_repository.get_by_id(session, uuid.UUID(user_id))
        if not user or not user.is_active:
            raise NotFoundError("ユーザー")
        return user

    async def create_user(
        self,
        session: AsyncSession,
        data: CreateUserRequest,
    ) -> UserModel:
        """
        Create a new user account (ADMIN only).

        Args:
            session: Database session
            data: Validated CreateUserRequest schema

        Returns:
            The created UserModel instance
        """
        hashed = hash_password(data.password)
        return await user_repository.create(
            session=session,
            username=data.username,
            full_name=data.full_name,
            hashed_password=hashed,
            role=data.role,
            email=str(data.email) if data.email else None,
            related_entity_id=data.related_entity_id,
        )

    # -------------------------------------------------------------------------
    # Private helpers
    # -------------------------------------------------------------------------

    async def _handle_failed_login(self, username: str) -> int:
        """
        Record a failed login attempt and lock the account if threshold reached.

        Returns:
            Current number of failed attempts
        """
        attempts = await record_failed_login(username)
        if attempts >= LOCKOUT_THRESHOLD:
            await lock_account(username)
        return attempts


# Module-level singleton
auth_service = AuthService()
