"""
Genba Management System — Customer Tests.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customer.models import CustomerModel, CustomerContactModel


class TestCustomerCRUD:
    """Test suite for Customer and Contact CRUD API endpoints."""

    async def test_create_customer_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can create a new customer."""
        payload = {
            "full_name": "テスト株式会社",
            "short_name": "テスト社",
            "branch_name": "東京本社",
            "phone": "03-1234-5678",
            "fax": "03-1234-5679",
            "email": "test@example.com",
            "address": "東京都千代田区1-1-1",
            "notes": "テスト用の取引先です"
        }
        response = await client.post(
            "/api/v1/customers",
            json=payload,
            headers=staff_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["full_name"] == "テスト株式会社"
        assert body["data"]["short_name"] == "テスト社"
        assert "id" in body["data"]

    async def test_get_customer_detail(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can view detailed customer info."""
        # Create a customer first
        create_payload = {
            "full_name": "詳細株式会社",
            "short_name": "詳細社"
        }
        create_res = await client.post(
            "/api/v1/customers",
            json=create_payload,
            headers=staff_headers,
        )
        customer_id = create_res.json()["data"]["id"]

        # Get details
        response = await client.get(
            f"/api/v1/customers/{customer_id}",
            headers=staff_headers,
        )

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert body["data"]["id"] == customer_id
        assert body["data"]["full_name"] == "詳細株式会社"
        assert "contacts" in body["data"]

    async def test_create_contact_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can create contact person for a customer."""
        # Create customer
        c_payload = {"full_name": "担当者付株式会社", "short_name": "担当社"}
        c_res = await client.post("/api/v1/customers", json=c_payload, headers=staff_headers)
        customer_id = c_res.json()["data"]["id"]

        # Create contact
        contact_payload = {
            "full_name": "山田 太郎",
            "position": "部長",
            "phone": "090-1234-5678",
            "email": "yamada@example.com",
            "notes": "メイン担当",
            "is_primary": True
        }
        response = await client.post(
            f"/api/v1/customers/{customer_id}/contacts",
            json=contact_payload,
            headers=staff_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["full_name"] == "山田 太郎"
        assert body["data"]["is_primary"] is True
        assert body["data"]["customer_id"] == customer_id
