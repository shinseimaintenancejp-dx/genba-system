"""
Genba Management System — Partner CRUD Tests.
"""

import pytest
from httpx import AsyncClient


class TestPartnerCRUD:
    """Test suite for Partner CRUD API endpoints."""

    async def test_create_partner_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can create a new partner company."""
        payload = {
            "company_name": "テスト協力会社",
            "phone": "03-9999-8888",
            "fax": "03-9999-8889",
            "email": "partner@example.com",
            "address": "東京都新宿区1-1-1",
            "contact_person": "佐藤 健二",
            "notes": "テスト用の協力会社です"
        }
        response = await client.post(
            "/api/v1/partners",
            json=payload,
            headers=staff_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["company_name"] == "テスト協力会社"
        assert body["data"]["contact_person"] == "佐藤 健二"
        assert "id" in body["data"]

    async def test_get_partner_detail(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can view detailed partner info."""
        create_payload = {
            "company_name": "詳細協力会社",
            "phone": "03-1111-2222"
        }
        create_res = await client.post(
            "/api/v1/partners",
            json=create_payload,
            headers=staff_headers,
        )
        partner_id = create_res.json()["data"]["id"]

        response = await client.get(
            f"/api/v1/partners/{partner_id}",
            headers=staff_headers,
        )

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert body["data"]["id"] == partner_id
        assert body["data"]["company_name"] == "詳細協力会社"

    async def test_update_partner(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can update an existing partner company."""
        create_payload = {
            "company_name": "更新前協力会社",
            "phone": "03-1111-2222"
        }
        create_res = await client.post(
            "/api/v1/partners",
            json=create_payload,
            headers=staff_headers,
        )
        partner_id = create_res.json()["data"]["id"]

        update_payload = {
            "company_name": "更新後協力会社",
            "phone": "03-3333-4444",
            "is_active": False
        }
        response = await client.put(
            f"/api/v1/partners/{partner_id}",
            json=update_payload,
            headers=staff_headers,
        )

        assert response.status_code == 200
        body = response.json()
        assert body["data"]["company_name"] == "更新後協力会社"
        assert body["data"]["phone"] == "03-3333-4444"
        assert body["data"]["is_active"] is False

    async def test_create_partner_forbidden(
        self,
        client: AsyncClient,
        worker_headers: dict,
    ) -> None:
        """Workers are not allowed to create a partner."""
        payload = {
            "company_name": "一般ワーカー作成協力会社",
        }
        response = await client.post(
            "/api/v1/partners",
            json=payload,
            headers=worker_headers,
        )
        assert response.status_code == 403
