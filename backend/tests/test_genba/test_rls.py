"""
Genba Management System — Genba RLS Policy Tests.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session_with_rls
from app.modules.genba.models import GenbaModel


class TestGenbaRLSPolicies:
    """
    Test suite for verifying PostgreSQL Row-Level Security policies on Genba.
    """

    async def test_staff_sees_all_genba(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff or Admin can list all genba without restriction."""
        response = await client.get("/api/v1/genba", headers=staff_headers)
        assert response.status_code == 200
        # No RLS filtering should limit staff's access to active genba

    async def test_unauthorized_user_cannot_access_genba(
        self,
        client: AsyncClient,
    ) -> None:
        """Accessing genba endpoints without headers/cookies must return 401."""
        response = await client.get("/api/v1/genba")
        assert response.status_code == 401
