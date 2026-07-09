"""
Genba Management System — Redis Async Client.

Provides:
- Singleton Redis connection (aioredis)
- Namespaced key helpers per INFRA§3.1
- Rate limiting, session management utilities
"""

import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# =============================================================================
# Singleton Redis Client
# =============================================================================
_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """
    Return the singleton Redis client.

    Creates a new connection pool on first call, reuses on subsequent calls.
    Uses hiredis parser for better performance when available.
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
        # Verify connection
        try:
            await _redis_client.ping()
            logger.info("Redis connection established")
        except Exception:
            logger.exception("Failed to connect to Redis")
            _redis_client = None
            raise

    return _redis_client


async def close_redis() -> None:
    """Close the Redis connection pool (called on shutdown)."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection closed")


# =============================================================================
# Key Namespace Helpers (INFRA§3.1)
# Prevents key collisions across different features
# =============================================================================

def session_key(user_id: str) -> str:
    """Redis key for storing refresh tokens. TTL: 7 days."""
    return f"session:{user_id}"


def refresh_token_key(user_id: str, token_jti: str) -> str:
    """Redis key for a specific refresh token (for rotation)."""
    return f"session:{user_id}:{token_jti}"


def rate_limit_key(ip: str, endpoint: str) -> str:
    """Redis key for rate limiting by IP + endpoint. TTL: 1 minute."""
    return f"ratelimit:{ip}:{endpoint}"


def login_attempts_key(username: str) -> str:
    """Redis key for tracking failed login attempts. TTL: 15 minutes."""
    return f"login_attempts:{username}"


def account_lock_key(username: str) -> str:
    """Redis key for account lockout. TTL: 15 minutes."""
    return f"account_lock:{username}"


def genba_cache_key(filters_hash: str) -> str:
    """Redis key for genba list cache. TTL: 5 minutes."""
    return f"cache:genba:list:{filters_hash}"


def invoice_gen_lock_key(year: int, month: int) -> str:
    """Redis distributed lock for invoice auto-generation. TTL: 10 minutes."""
    return f"lock:invoice_gen:{year}_{month:02d}"


# =============================================================================
# Session Management (for Refresh Token Rotation — SEC§1.3)
# =============================================================================

async def store_refresh_token(
    user_id: str,
    token_jti: str,
    ttl_seconds: int = 7 * 24 * 3600,
) -> None:
    """
    Store a refresh token JTI in Redis.

    Args:
        user_id: The user's UUID
        token_jti: Unique token identifier (JTI claim)
        ttl_seconds: Token lifetime in seconds (default 7 days)
    """
    client = await get_redis()
    key = refresh_token_key(user_id, token_jti)
    await client.setex(key, ttl_seconds, "valid")


async def validate_refresh_token(user_id: str, token_jti: str) -> bool:
    """
    Verify that a refresh token JTI exists in Redis (not rotated/revoked).

    Args:
        user_id: The user's UUID
        token_jti: Unique token identifier from the JWT

    Returns:
        True if the token is valid, False if revoked or expired
    """
    client = await get_redis()
    key = refresh_token_key(user_id, token_jti)
    result = await client.get(key)
    return result == "valid"


async def revoke_refresh_token(user_id: str, token_jti: str) -> None:
    """
    Delete a refresh token from Redis (token rotation).

    Called immediately after issuing a new refresh token to prevent reuse.

    Args:
        user_id: The user's UUID
        token_jti: Unique token identifier to revoke
    """
    client = await get_redis()
    key = refresh_token_key(user_id, token_jti)
    await client.delete(key)


async def revoke_all_user_sessions(user_id: str) -> None:
    """
    Revoke all active sessions for a user (logout all devices).

    Args:
        user_id: The user's UUID
    """
    client = await get_redis()
    pattern = f"session:{user_id}:*"
    keys = await client.keys(pattern)
    if keys:
        await client.delete(*keys)


# =============================================================================
# Account Lockout (SEC§1.5)
# =============================================================================

LOCKOUT_THRESHOLD = 5       # Failed attempts before lockout
LOCKOUT_DURATION = 900       # 15 minutes in seconds
ATTEMPT_WINDOW = 900         # Track attempts for 15 minutes


async def record_failed_login(username: str) -> int:
    """
    Increment the failed login attempt counter for a username.

    Returns:
        The current number of failed attempts
    """
    client = await get_redis()
    key = login_attempts_key(username)
    attempts = await client.incr(key)
    if attempts == 1:
        # Set expiry on first attempt
        await client.expire(key, ATTEMPT_WINDOW)
    return int(attempts)


async def get_failed_login_attempts(username: str) -> int:
    """Get the current number of failed login attempts."""
    client = await get_redis()
    key = login_attempts_key(username)
    result = await client.get(key)
    return int(result) if result else 0


async def lock_account(username: str) -> None:
    """Lock an account for LOCKOUT_DURATION seconds."""
    client = await get_redis()
    key = account_lock_key(username)
    await client.setex(key, LOCKOUT_DURATION, "locked")
    logger.warning("Account locked due to too many failed attempts", extra={"username": username})


async def is_account_locked(username: str) -> bool:
    """Check if an account is currently locked."""
    client = await get_redis()
    key = account_lock_key(username)
    result = await client.get(key)
    return result == "locked"


async def get_lockout_remaining_seconds(username: str) -> int:
    """Get remaining lockout time in seconds."""
    client = await get_redis()
    key = account_lock_key(username)
    ttl = await client.ttl(key)
    return max(0, int(ttl))


async def clear_failed_login_attempts(username: str) -> None:
    """Clear failed login attempts on successful login."""
    client = await get_redis()
    await client.delete(login_attempts_key(username))
    await client.delete(account_lock_key(username))
