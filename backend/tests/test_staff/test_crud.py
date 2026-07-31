"""
Genba Management System — Staff Module: Integration Tests.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.staff.models import StaffModel
from app.modules.genba.models import GenbaModel
from app.modules.customer.models import CustomerModel


@pytest.mark.asyncio
class TestStaffCRUD:
    """Tests for staff REST API endpoints."""

    async def test_create_staff_success(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """Test successful staff creation by Admin."""
        response = await client.post(
            "/api/v1/staff",
            json={
                "last_name": "管理",
                "first_name": "太郎",
                "position": "マネージャー",
                "phone": "03-1234-5678",
                "email": "manager_test@example.com",
            },
            headers=admin_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["last_name"] == "管理"
        assert data["first_name"] == "太郎"
        assert "id" in data

    async def test_create_staff_duplicate_email(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """Test staff creation fails when email is duplicate."""
        # Create first staff
        await client.post(
            "/api/v1/staff",
            json={
                "last_name": "管理",
                "first_name": "一郎",
                "email": "duplicate@example.com",
            },
            headers=admin_headers,
        )

        # Attempt duplicate
        response = await client.post(
            "/api/v1/staff",
            json={
                "last_name": "管理",
                "first_name": "二郎",
                "email": "duplicate@example.com",
            },
            headers=admin_headers,
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "DUPLICATE_ERROR"

    async def test_assign_staff_to_genba(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """Test assigning staff to a Genba worksite."""
        # 1. Create Customer
        cust_resp = await client.post(
            "/api/v1/customers",
            json={"full_name": "取引先 A", "short_name": "A"},
            headers=admin_headers,
        )
        customer_id = cust_resp.json()["data"]["id"]

        # 2. Create Genba
        genba_resp = await client.post(
            "/api/v1/genba",
            json={
                "property_name": "新大阪ビル",
                "address": "大阪市淀川区",
                "management_start_date": "2026-06-11",
                "customer_id": customer_id,
            },
            headers=admin_headers,
        )
        genba_id = genba_resp.json()["data"]["id"]

        # 3. Create Staff
        staff_resp = await client.post(
            "/api/v1/staff",
            json={
                "last_name": "担当",
                "first_name": "三郎",
                "email": "saburo@example.com",
            },
            headers=admin_headers,
        )
        staff_id = staff_resp.json()["data"]["id"]

        # 4. Assign Staff
        assign_resp = await client.post(
            f"/api/v1/staff/genba/{genba_id}",
            json={
                "staff_id": staff_id,
                "role_type": "MAIN",
            },
            headers=admin_headers,
        )
        assert assign_resp.status_code == 201
        data = assign_resp.json()["data"]
        assert data["genba_id"] == genba_id
        assert data["staff_id"] == staff_id
        assert data["role_type"] == "MAIN"
