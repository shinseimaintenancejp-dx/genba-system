import pytest
from httpx import AsyncClient

class TestCreateDailyContract:
    """Test suite for Daily contract creation with nested entities."""

    async def test_create_daily_success_and_get(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Create a DAILY contract with work_slots, worker_counts, holiday_rules."""
        # 1. Create Customer
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "Daily test", "short_name": "Daily"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        # 2. Create Genba
        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "Daily Genba", "address": "Address", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        # 3. Create Daily Contract
        payload = {
            "contract_type": "RECEIVING",
            "service_type": "日常清掃",
            "service_category": "DAILY",
            "amount": 200000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            "work_slots": [
                {"start_time": "08:00", "end_time": "12:00", "break_minutes": 0, "sort_order": 1},
                {"start_time": "13:00", "end_time": "17:00", "break_minutes": 60, "sort_order": 2}
            ],
            "worker_counts": [
                {"worker_count": 2, "work_duration_hours": 4.0, "total_hours": 8.0, "sort_order": 1}
            ],
            "holiday_rules": [
                {"rule_type": "祝日", "action": "休む"}
            ]
        }

        response = await client.post(
            "/api/v1/contracts",
            json=payload,
            headers=staff_headers,
        )
        
        assert response.status_code == 201, response.text
        contract_id = response.json()["data"]["id"]

        # 4. Get the contract to verify nested data
        get_res = await client.get(f"/api/v1/contracts/{contract_id}", headers=staff_headers)
        assert get_res.status_code == 200
        
        data = get_res.json()["data"]
        assert data["service_category"] == "DAILY"
        
        # Check backward compatibility (flat fields returned)
        assert data["amount"] == "200000.00"
        
        # Check nested fields
        assert "work_slots" in data
        assert len(data["work_slots"]) == 2
        assert data["work_slots"][0]["start_time"] == "08:00:00"

        assert "worker_counts" in data
        assert len(data["worker_counts"]) == 1
        assert data["worker_counts"][0]["worker_count"] == 2

        assert "holiday_rules" in data
        assert len(data["holiday_rules"]) == 1
        assert data["holiday_rules"][0]["action"] == "休む"

    async def test_create_daily_validation_missing_work_slots(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """DAILY category requires work_slots and worker_counts."""
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "Daily Valid test", "short_name": "Valid"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "Daily Genba Valid", "address": "Address", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        payload = {
            "contract_type": "RECEIVING",
            "service_type": "日常清掃",
            "service_category": "DAILY",
            "amount": 200000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            # Missing work_slots
            "worker_counts": [
                {"worker_count": 2, "work_duration_hours": 4.0, "total_hours": 8.0, "sort_order": 1}
            ]
        }

        response = await client.post("/api/v1/contracts", json=payload, headers=staff_headers)
        assert response.status_code == 422
        
        err_msg = response.json()["detail"][0]["msg"]
        assert "DAILYカテゴリの場合、work_slots と worker_counts は必須です" in err_msg
