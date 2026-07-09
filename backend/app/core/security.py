"""
Genba Management System — JWT Security & Password Hashing.

Implements:
- JWT access/refresh token creation and validation (SEC§1.1)
- Bcrypt password hashing with cost factor 12 (SEC§1.5)
- Token JTI (JWT ID) for refresh token rotation tracking
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import TokenExpiredError, UnauthorizedError

logger = logging.getLogger(__name__)

# =============================================================================
# Password Hashing — Bcrypt cost factor 12 (SEC§1.5)
# =============================================================================
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,  # Cost factor 12 as specified in SEC§1.5
)


def hash_password(plain_password: str) -> str:
    """
    Hash a plain text password using bcrypt with cost factor 12.

    NEVER log the plain password. Only log that hashing occurred.

    Args:
        plain_password: The raw password string from the user

    Returns:
        Bcrypt hashed password string
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a stored bcrypt hash.

    Args:
        plain_password: The raw password to verify
        hashed_password: The stored bcrypt hash

    Returns:
        True if the password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


# =============================================================================
# JWT Token Creation (SEC§1.2)
# =============================================================================

def create_access_token(
    user_id: str,
    role: str,
    related_entity_id: str | None = None,
) -> str:
    """
    Create a short-lived JWT access token.

    Payload per SEC§1.2:
    {
        "sub": "user-uuid",
        "role": "INTERNAL_STAFF",
        "related_entity_id": "staff-uuid",
        "iat": timestamp,
        "exp": timestamp
    }

    Args:
        user_id: The user's UUID
        role: The user's role string
        related_entity_id: UUID of associated entity (staff/worker/partner)

    Returns:
        Encoded JWT access token string
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict = {
        "sub": user_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }

    if related_entity_id:
        payload["related_entity_id"] = related_entity_id

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: str) -> tuple[str, str]:
    """
    Create a long-lived JWT refresh token with a unique JTI.

    The JTI (JWT ID) is stored in Redis for rotation tracking.
    When a new refresh token is issued, the old JTI is deleted from Redis.

    Args:
        user_id: The user's UUID

    Returns:
        Tuple of (encoded_token, jti) — the JTI is used for Redis storage
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())  # Unique token identifier for rotation tracking

    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
        "jti": jti,
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti


# =============================================================================
# JWT Token Validation
# =============================================================================

def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Raises:
        TokenExpiredError: If the token has expired
        UnauthorizedError: If the token is invalid or malformed

    Args:
        token: The JWT access token string

    Returns:
        Decoded payload dictionary
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        if payload.get("type") != "access":
            raise UnauthorizedError()

        return payload

    except JWTError as e:
        error_msg = str(e).lower()
        if "expired" in error_msg:
            raise TokenExpiredError() from e
        logger.warning("Invalid access token", extra={"error": str(e)})
        raise UnauthorizedError() from e


def decode_refresh_token(token: str) -> dict:
    """
    Decode and validate a JWT refresh token.

    Raises:
        TokenExpiredError: If the token has expired
        UnauthorizedError: If the token is invalid or malformed

    Args:
        token: The JWT refresh token string

    Returns:
        Decoded payload dictionary containing 'sub' (user_id) and 'jti'
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        if payload.get("type") != "refresh":
            raise UnauthorizedError()

        return payload

    except JWTError as e:
        error_msg = str(e).lower()
        if "expired" in error_msg:
            raise TokenExpiredError() from e
        logger.warning("Invalid refresh token", extra={"error": str(e)})
        raise UnauthorizedError() from e


# =============================================================================
# Cookie Configuration Helpers (SEC§1.4)
# =============================================================================

def get_access_token_cookie_params(is_production: bool = True) -> dict:
    """
    Return the cookie parameters for setting the access token cookie.

    Per SEC§1.4:
    - httponly=True: JavaScript cannot read
    - secure=True: HTTPS only (False for localhost dev)
    - samesite="lax": CSRF protection

    Args:
        is_production: If False, sets secure=False for localhost development

    Returns:
        Dictionary of cookie parameters for response.set_cookie()
    """
    return {
        "key": "access_token",
        "httponly": True,
        "secure": is_production,
        "samesite": "lax",
        "max_age": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "path": "/",
    }


def get_refresh_token_cookie_params(is_production: bool = True) -> dict:
    """
    Return the cookie parameters for setting the refresh token cookie.

    The refresh token cookie is scoped to /api/v1/auth so it is only
    sent to authentication endpoints, not every API request.

    Args:
        is_production: If False, sets secure=False for localhost development

    Returns:
        Dictionary of cookie parameters for response.set_cookie()
    """
    return {
        "key": "refresh_token",
        "httponly": True,
        "secure": is_production,
        "samesite": "lax",
        "max_age": settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        "path": "/api/v1/auth",  # Only sent to auth endpoints
    }
