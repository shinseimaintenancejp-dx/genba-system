import pytest
from httpx import AsyncClient

class TestCreateOtherContract:
    """Test suite for Other contract creation."""

    async def test_create_other_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Create an OTHER contract with work_type and sub_service_type."""
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "Other test", "short_name": "Other"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "Other Genba", "address": "Address", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        payload = {
            "contract_type": "RECEIVING",
            "service_type": "特別清掃",
            "service_category": "OTHER",
            "amount": 100000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            "work_type": "SPOT",
            "sub_service_type": "REPAIR"
        }

        response = await client.post(
            "/api/v1/contracts",
            json=payload,
            headers=staff_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]

        # Check fields
        assert data["service_category"] == "OTHER"
        assert data["work_type"] == "SPOT"
        assert data["sub_service_type"] == "REPAIR"

    async def test_create_other_validation_missing_fields(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """OTHER category requires work_type and sub_service_type."""
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "Other Valid test", "short_name": "Valid"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "Other Genba Valid", "address": "Address", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        payload = {
            "contract_type": "RECEIVING",
            "service_type": "特別清掃",
            "service_category": "OTHER",
            "amount": 100000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            # Missing work_type and sub_service_type
        }

        response = await client.post("/api/v1/contracts", json=payload, headers=staff_headers)
        assert response.status_code == 422
        assert "OTHERカテゴリの場合、work_type と sub_service_type は必須です" in response.json()["detail"][0]["msg"]
