"""
Genba Management System — Worker Module: Integration Tests.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
class TestWorkerCRUD:
    """Tests for worker REST API endpoints."""

    async def test_create_worker_success(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """Test successful worker creation by Admin."""
        response = await client.post(
            "/api/v1/workers",
            json={
                "full_name": "清掃 太郎",
                "phone": "090-1111-2222",
                "email": "worker_test@example.com",
                "birth_date": "1995-05-15",
                "notes": "夜間作業可能",
            },
            headers=admin_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["full_name"] == "清掃 太郎"
        assert data["notes"] == "夜間作業可能"
        assert "id" in data

    async def test_create_worker_duplicate_email(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """Test worker creation fails when email is duplicate."""
        # Create first worker
        await client.post(
            "/api/v1/workers",
            json={
                "full_name": "清掃 一郎",
                "email": "dup_worker@example.com",
            },
            headers=admin_headers,
        )

        # Attempt duplicate
        response = await client.post(
            "/api/v1/workers",
            json={
                "full_name": "清掃 二郎",
                "email": "dup_worker@example.com",
            },
            headers=admin_headers,
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "DUPLICATE_ERROR"

    async def test_assign_worker_to_genba(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """Test assigning worker to a Genba worksite."""
        # 1. Create Customer
        cust_resp = await client.post(
            "/api/v1/customers",
            json={"full_name": "取引先 B", "short_name": "B"},
            headers=admin_headers,
        )
        customer_id = cust_resp.json()["data"]["id"]

        # 2. Create Genba
        genba_resp = await client.post(
            "/api/v1/genba",
            json={
                "property_name": "天王寺アパート",
                "address": "大阪市天王寺区",
                "management_start_date": "2026-06-11",
                "customer_id": customer_id,
            },
            headers=admin_headers,
        )
        genba_id = genba_resp.json()["data"]["id"]

        # 3. Create Worker
        worker_resp = await client.post(
            "/api/v1/workers",
            json={
                "full_name": "清掃 三郎",
                "email": "saburo_w@example.com",
            },
            headers=admin_headers,
        )
        worker_id = worker_resp.json()["data"]["id"]

        # 4. Assign Worker
        assign_resp = await client.post(
            f"/api/v1/workers/genba/{genba_id}",
            json={
                "worker_id": worker_id,
            },
            headers=admin_headers,
        )
        assert assign_resp.status_code == 201
        data = assign_resp.json()["data"]
        assert data["genba_id"] == genba_id
        assert data["worker_id"] == worker_id
        assert data["is_active"] is True
