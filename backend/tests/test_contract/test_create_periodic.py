import pytest
from httpx import AsyncClient

class TestCreatePeriodicContract:
    """Test suite for Periodic contract creation."""

    async def test_create_periodic_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Create a PERIODIC contract with periodic_schedule."""
        # Create Customer
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "Periodic test", "short_name": "Periodic"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        # Create Genba
        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "Periodic Genba", "address": "Address", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        payload = {
            "contract_type": "RECEIVING",
            "service_type": "定期清掃",
            "service_category": "PERIODIC",
            "amount": 50000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            "periodic_schedule": {
                "frequency_per_year": 4,
                "work_months": [3, 6, 9, 12],
                "work_days": [15]
            }
        }

        response = await client.post(
            "/api/v1/contracts",
            json=payload,
            headers=staff_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]

        # Check periodic schedule
        assert "periodic_schedule" in data
        assert data["periodic_schedule"]["frequency_per_year"] == 4
        assert sorted(data["periodic_schedule"]["work_months"]) == [3, 6, 9, 12]
        assert data["periodic_schedule"]["work_days"] == [15]

    async def test_create_periodic_validation_missing_schedule(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """PERIODIC category requires periodic_schedule."""
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "Periodic Valid test", "short_name": "Valid"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "Periodic Genba Valid", "address": "Address", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        payload = {
            "contract_type": "RECEIVING",
            "service_type": "定期清掃",
            "service_category": "PERIODIC",
            "amount": 50000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            # Missing periodic_schedule
        }

        response = await client.post("/api/v1/contracts", json=payload, headers=staff_headers)
        assert response.status_code == 422
        assert "PERIODICカテゴリの場合、periodic_schedule は必須です" in response.json()["detail"][0]["msg"]

    async def test_create_periodic_validation_invalid_month(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """PERIODIC category rejects month > 12."""
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "Periodic Month test", "short_name": "Month"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "Periodic Genba Month", "address": "Address", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        payload = {
            "contract_type": "RECEIVING",
            "service_type": "定期清掃",
            "service_category": "PERIODIC",
            "amount": 50000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            "periodic_schedule": {
                "frequency_per_year": 1,
                "work_months": [13], # Invalid month
                "work_days": [1] # Valid work days
            }
        }

        response = await client.post("/api/v1/contracts", json=payload, headers=staff_headers)
        assert response.status_code == 422
        err_msg = str(response.json()["detail"])
        assert "less_than_equal" in err_msg or "Value error" in err_msg
