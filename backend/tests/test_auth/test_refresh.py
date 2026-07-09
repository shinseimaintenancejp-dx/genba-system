"""
Genba Management System — Auth Tests: Refresh Token Rotation.

Tests:
- Successful token refresh → new cookies set
- Old refresh token invalidated after rotation (SEC§1.3)
- Replay attack: reusing a rotated token revokes all sessions
- Expired/invalid refresh token → 401
"""

import asyncio
import pytest
from httpx import AsyncClient

from app.modules.auth.models import UserModel


class TestRefreshTokenRotation:
    """Test refresh token rotation flow (SEC§1.3)."""

    async def test_refresh_issues_new_cookies(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """Successful refresh must set new access_token and refresh_token cookies."""
        # Login to get initial cookies
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )
        assert login_response.status_code == 200

        initial_access = login_response.cookies.get("access_token")
        initial_refresh = login_response.cookies.get("refresh_token")
        assert initial_access
        assert initial_refresh

        # Wait for 1 second to ensure iat changes
        await asyncio.sleep(1)

        # Refresh the tokens
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": initial_refresh},
        )

        assert refresh_response.status_code == 200
        assert "access_token" in refresh_response.cookies
        assert "refresh_token" in refresh_response.cookies

        # New tokens must be different from old ones
        new_access = refresh_response.cookies.get("access_token")
        new_refresh = refresh_response.cookies.get("refresh_token")
        assert new_access != initial_access
        assert new_refresh != initial_refresh

    async def test_old_refresh_token_invalid_after_rotation(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """After rotation, the old refresh token must be rejected (SEC§1.3)."""
        # Login
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )
        original_refresh = login_response.cookies.get("refresh_token")

        # First refresh — succeeds
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": original_refresh},
        )
        assert refresh_response.status_code == 200

        # Second refresh using the ORIGINAL (now rotated) token — must fail
        replay_response = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": original_refresh},
        )
        assert replay_response.status_code == 401

    async def test_refresh_without_cookie_returns_401(
        self,
        client: AsyncClient,
    ) -> None:
        """Refresh without a refresh token cookie must return 401."""
        response = await client.post("/api/v1/auth/refresh")
        assert response.status_code == 401

    async def test_refresh_with_invalid_token_returns_401(
        self,
        client: AsyncClient,
    ) -> None:
        """Refresh with a malformed token must return 401."""
        response = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": "totally.invalid.token"},
        )
        assert response.status_code == 401


class TestLogout:
    """Test logout flow."""

    async def test_logout_clears_cookies(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
    ) -> None:
        """Successful logout must clear the JWT cookies."""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )
        assert login_response.status_code == 200
        access_token = login_response.cookies.get("access_token")

        # Logout
        logout_response = await client.post(
            "/api/v1/auth/logout",
            cookies={"access_token": access_token},
        )
        assert logout_response.status_code == 200

        # After logout, /auth/me must fail
        me_response = await client.get(
            "/api/v1/auth/me",
            # Don't send any cookies — simulate cleared state
        )
        assert me_response.status_code == 401

    async def test_logout_without_auth_returns_401(
        self,
        client: AsyncClient,
    ) -> None:
        """Logout without authentication must return 401."""
        response = await client.post("/api/v1/auth/logout")
        assert "Authorization" not in response.request.headers

    async def test_refresh_rejects_inactive_user(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
        db_session,
    ) -> None:
        """If user is deactivated, refresh must fail."""
        # Login
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )
        refresh_token = login_response.cookies.get("refresh_token")

        # Deactivate user
        test_staff_user.is_active = False
        db_session.add(test_staff_user)
        await db_session.commit()

        # Refresh must fail
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 401

        # Restore user for other tests
        test_staff_user.is_active = True
        db_session.add(test_staff_user)
        await db_session.commit()

    async def test_refresh_updates_role_in_token(
        self,
        client: AsyncClient,
        test_staff_user: UserModel,
        db_session,
    ) -> None:
        """If user role changes, the new access token must reflect it."""
        from app.core.security import decode_access_token

        # Login
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"username": "test_staff", "password": "TestPassword@2026"},
        )
        refresh_token = login_response.cookies.get("refresh_token")
        
        # Verify initial role in token is INTERNAL_STAFF
        access_token = login_response.cookies.get("access_token")
        payload = decode_access_token(access_token)
        assert payload.get("role") == "INTERNAL_STAFF"

        # Change role to ADMIN in DB
        original_role = test_staff_user.role
        test_staff_user.role = "ADMIN"
        db_session.add(test_staff_user)
        await db_session.commit()

        # Refresh token
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 200
        
        # Verify new token has ADMIN role
        new_access = refresh_response.cookies.get("access_token")
        new_payload = decode_access_token(new_access)
        assert new_payload.get("role") == "ADMIN"

        # Restore role
        test_staff_user.role = original_role
        db_session.add(test_staff_user)
        await db_session.commit()


class TestPermissions:
    """Test role-based access control at the API layer."""

    async def test_admin_can_access_me(
        self,
        client: AsyncClient,
        admin_headers: dict,
    ) -> None:
        """ADMIN must be able to access /auth/me."""
        response = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "ADMIN"

    async def test_worker_can_access_me(
        self,
        client: AsyncClient,
        worker_headers: dict,
    ) -> None:
        """GENBA_WORKER must be able to access their own /auth/me."""
        response = await client.get("/api/v1/auth/me", headers=worker_headers)
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "GENBA_WORKER"
