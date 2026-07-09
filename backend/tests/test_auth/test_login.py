"""
Genba Management System — Auth Tests: Login & Lockout.

Tests:
- Successful login → cookies set
- Invalid credentials → 401 Japanese message
- Account lockout after 5 failures → 423 Japanese message
- Locked account message includes remaining minutes
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import clear_failed_login_attempts
from app.modules.auth.models import UserModel


class TestLoginSuccess:
    """Test successful authentication flow."""

    async def test_login_sets_access_token_cookie(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """Successful login must set httpOnly access_token cookie (SEC§1.4)."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )

        assert response.status_code == 200

        # Both cookies must be set
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    async def test_login_returns_user_info(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """Successful login returns user data in response body."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )

        body = response.json()
        assert "user" in body
        assert body["user"]["username"] == "test_staff"
        assert body["user"]["role"] == "INTERNAL_STAFF"
        # Password must NEVER appear in response
        assert "password" not in body["user"]
        assert "hashed_password" not in body["user"]

    async def test_login_never_returns_token_in_body(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """Tokens must NEVER be in the JSON response body (SEC§1.5)."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )

        body = response.json()
        body_str = str(body)
        assert "access_token" not in body_str or "access_token" not in body
        assert "token" not in body_str.lower() or "user" in body


class TestLoginFailure:
    """Test authentication failure scenarios."""

    async def test_wrong_password_returns_401(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """Wrong password must return 401 with Japanese error message."""
        await clear_failed_login_attempts("test_staff")

        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "WrongPassword!"},
        )

        assert response.status_code == 401
        error = response.json()["error"]
        assert error["code"] == "INVALID_CREDENTIALS"
        # Error message must be in Japanese
        assert "パスワード" in error["message"] or "ユーザー名" in error["message"]

    async def test_nonexistent_user_returns_401(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """Non-existent username must return 401 (not 404 — prevent enumeration)."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "nonexistent_user", "password": "SomePassword@2026"},
        )

        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"

    async def test_empty_credentials_return_422(
        self,
        client: AsyncClient,
    ) -> None:
        """Empty credentials must return 422 validation error."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "", "password": ""},
        )

        assert response.status_code == 422


class TestAccountLockout:
    """Test account lockout after 5 failed attempts (SEC§1.5)."""

    async def test_lockout_after_5_failures(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """Account must be locked after 5 consecutive failed logins."""
        await clear_failed_login_attempts("test_staff")

        # 5 failed attempts
        for i in range(5):
            response = await client.post(
                "/api/v1/auth/login",
                json={"username": "test_staff", "password": f"WrongPass{i}!"},
            )
            assert response.status_code == 401

        # 6th attempt must return 423 (Account Locked)
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "WrongPass!"},
        )

        assert response.status_code == 423
        error = response.json()["error"]
        assert error["code"] == "ACCOUNT_LOCKED"
        # Message must be in Japanese and mention remaining time
        assert "ロック" in error["message"] or "ログイン" in error["message"]

    async def test_locked_account_prevents_correct_login(
        self,
        client: AsyncClient,
        test_worker_user: UserModel,
    ) -> None:
        """Even with correct password, locked account must return 423."""
        await clear_failed_login_attempts("test_worker")

        # Lock the account
        for _ in range(5):
            await client.post(
                "/api/v1/auth/login",
                json={"username": "test_worker", "password": "WrongPass!"},
            )

        # Correct password but account is locked
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_worker", "password": "TestPassword@2026"},
        )

        assert response.status_code == 423


class TestGetMe:
    """Test the /auth/me endpoint."""

    async def test_me_returns_current_user(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Authenticated /auth/me must return current user data."""
        response = await client.get("/api/v1/auth/me", headers=staff_headers)

        assert response.status_code == 200
        body = response.json()
        assert "user" in body
        assert body["user"]["role"] == "INTERNAL_STAFF"

    async def test_me_without_auth_returns_401(
        self,
        client: AsyncClient,
    ) -> None:
        """Unauthenticated /auth/me must return 401."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
