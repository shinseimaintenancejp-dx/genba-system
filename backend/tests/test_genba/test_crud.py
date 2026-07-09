"""
Genba Management System — Genba Tests.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.genba.models import GenbaModel


class TestGenbaCRUD:
    """Test suite for Genba CRUD and duplication checks."""

    async def test_create_genba_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can create a new Genba worksite."""
        # Create customer first
        c_payload = {"full_name": "現場親会社", "short_name": "親会社"}
        c_res = await client.post("/api/v1/customers", json=c_payload, headers=staff_headers)
        customer_id = c_res.json()["data"]["id"]

        payload = {
            "property_name": "BRAVI 新大阪",
            "address": "大阪市淀川区宮原1-1-1",
            "transportation": "新大阪駅 徒歩3分",
            "phone": "06-1234-5678",
            "external_partner_code": "MCD001",
            "special_notes": "特記事項なし",
            "management_start_date": "2026-06-01",
            "customer_id": customer_id
        }

        response = await client.post(
            "/api/v1/genba",
            json=payload,
            headers=staff_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["property_name"] == "BRAVI 新大阪"
        assert body["data"]["status"] == "ACTIVE"

    async def test_create_genba_duplicate_warning(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Create duplicate property name yields warning response."""
        # Create customer
        c_payload = {"full_name": "現場会社", "short_name": "子会社"}
        c_res = await client.post("/api/v1/customers", json=c_payload, headers=staff_headers)
        customer_id = c_res.json()["data"]["id"]

        # First creation
        payload = {
            "property_name": "梅田ビル",
            "address": "大阪市北区梅田",
            "customer_id": customer_id
        }
        await client.post("/api/v1/genba", json=payload, headers=staff_headers)

        # Second creation (same name, confirm_duplicate=False)
        response = await client.post(
            "/api/v1/genba",
            json=payload,
            headers=staff_headers,
        )

        assert response.status_code == 200
        body = response.json()
        assert "warning" in body
        assert "duplicates" in body
        assert len(body["duplicates"]) == 1
        assert body["duplicates"][0]["property_name"] == "梅田ビル"

    async def test_create_genba_duplicate_confirm(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Create duplicate property name is forced if confirm_duplicate is True."""
        # Create customer
        c_payload = {"full_name": "現場会社2", "short_name": "子会社2"}
        c_res = await client.post("/api/v1/customers", json=c_payload, headers=staff_headers)
        customer_id = c_res.json()["data"]["id"]

        # First creation
        payload = {
            "property_name": "心斎橋タワー",
            "address": "大阪市中央区心斎橋",
            "customer_id": customer_id
        }
        await client.post("/api/v1/genba", json=payload, headers=staff_headers)

        # Second creation with confirm_duplicate=True
        payload["confirm_duplicate"] = True
        response = await client.post(
            "/api/v1/genba",
            json=payload,
            headers=staff_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["property_name"] == "心斎橋タワー"

    async def test_terminate_genba(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can terminate a Genba worksite."""
        # Create customer & genba
        c_payload = {"full_name": "終了会社", "short_name": "終社"}
        c_res = await client.post("/api/v1/customers", json=c_payload, headers=staff_headers)
        customer_id = c_res.json()["data"]["id"]
        
        g_payload = {"property_name": "なんばビル", "address": "大阪市難波", "customer_id": customer_id}
        g_res = await client.post("/api/v1/genba", json=g_payload, headers=staff_headers)
        genba_id = g_res.json()["data"]["id"]

        # Terminate
        response = await client.patch(
            f"/api/v1/genba/{genba_id}/terminate",
            headers=staff_headers,
        )

        assert response.status_code == 200
        body = response.json()
        assert body["data"]["status"] == "TERMINATED"
        assert body["data"]["terminated_at"] is not None
