"""
Genba Management System — Schedule, Equipment, Standards, and Periodic Plan CRUD Tests.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.genba.models import GenbaModel
from app.modules.customer.models import CustomerModel
from app.modules.schedule.models import (
    PeriodicCleaningPlanModel,
    PeriodicCleaningDetailModel,
    WorkScheduleModel,
    GenbaCustomHolidayModel,
    GenbaEquipmentModel,
    CleaningWorkStandardModel,
)


@pytest.fixture
async def sample_genba(db_session: AsyncSession) -> GenbaModel:
    """Create a sample customer and genba for schedule testing."""
    customer = CustomerModel(
        full_name="テスト取引先株式会社",
        short_name="テスト取引先",
        phone="03-1234-5678",
        is_active=True,
    )
    db_session.add(customer)
    await db_session.commit()

    genba = GenbaModel(
        property_name="テスト現場A",
        address="東京都新宿区1-2-3",
        status="ACTIVE",
        customer_id=customer.id,
    )
    db_session.add(genba)
    await db_session.commit()
    return genba


class TestScheduleCRUD:
    """Test suite for Schedules, Holidays, Equipment, Standards, and Periodic Plans."""

    # ==========================================================================
    # Work Schedules
    # ==========================================================================
    async def test_work_schedule_crud(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create, read, update, and delete work schedules."""
        # 1. Create Work Schedule
        payload = {
            "shift_label": "日勤A",
            "work_days": "月火水木金",
            "start_time": "08:00:00",
            "end_time": "17:00:00",
            "break_minutes": 60,
            "holiday_rule": "SHIFT_AFTER",
            "notes": "日勤メイン",
        }
        response = await client.post(
            f"/api/v1/genba/{sample_genba.id}/work-schedules",
            json=payload,
            headers=staff_headers,
        )
        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["shift_label"] == "日勤A"
        assert body["data"]["holiday_rule"] == "SHIFT_AFTER"
        schedule_id = body["data"]["id"]

        # 2. List Work Schedules
        res_list = await client.get(
            f"/api/v1/genba/{sample_genba.id}/work-schedules",
            headers=staff_headers,
        )
        assert res_list.status_code == 200
        assert len(res_list.json()["data"]) == 1
        assert res_list.json()["data"][0]["shift_label"] == "日勤A"

        # 3. Update Work Schedule
        update_payload = {
            "shift_label": "夜勤A",
            "start_time": "20:00:00",
            "end_time": "05:00:00",
        }
        res_update = await client.put(
            f"/api/v1/genba/{sample_genba.id}/work-schedules/{schedule_id}",
            json=update_payload,
            headers=staff_headers,
        )
        assert res_update.status_code == 200
        assert res_update.json()["data"]["shift_label"] == "夜勤A"

        # 4. Delete Work Schedule
        res_del = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/work-schedules/{schedule_id}",
            headers=staff_headers,
        )
        assert res_del.status_code == 200

        # Verify list is empty
        res_list_empty = await client.get(
            f"/api/v1/genba/{sample_genba.id}/work-schedules",
            headers=staff_headers,
        )
        assert len(res_list_empty.json()["data"]) == 0

    # ==========================================================================
    # Genba Custom Holidays
    # ==========================================================================
    async def test_custom_holiday_crud(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create, read, update, and delete custom holidays."""
        # 1. Create Holiday
        payload = {
            "holiday_date": "2026-08-15",
            "description": "お盆休み",
            "is_makeup_workday": False,
        }
        response = await client.post(
            f"/api/v1/genba/{sample_genba.id}/custom-holidays",
            json=payload,
            headers=staff_headers,
        )
        assert response.status_code == 201
        body = response.json()
        assert body["data"]["description"] == "お盆休み"
        holiday_id = body["data"]["id"]

        # 2. List Holidays
        res_list = await client.get(
            f"/api/v1/genba/{sample_genba.id}/custom-holidays",
            headers=staff_headers,
        )
        assert res_list.status_code == 200
        assert len(res_list.json()["data"]) == 1

        # 3. Update Holiday
        update_payload = {
            "description": "特別夏期休暇",
        }
        res_update = await client.put(
            f"/api/v1/genba/{sample_genba.id}/custom-holidays/{holiday_id}",
            json=update_payload,
            headers=staff_headers,
        )
        assert res_update.status_code == 200
        assert res_update.json()["data"]["description"] == "特別夏期休暇"

        # 4. Delete Holiday
        res_del = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/custom-holidays/{holiday_id}",
            headers=staff_headers,
        )
        assert res_del.status_code == 200

        res_list_empty = await client.get(
            f"/api/v1/genba/{sample_genba.id}/custom-holidays",
            headers=staff_headers,
        )
        assert len(res_list_empty.json()["data"]) == 0

    # ==========================================================================
    # Genba Equipment
    # ==========================================================================
    async def test_equipment_crud(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create, read, update, and delete equipment."""
        payload = {
            "equipment_name": "モップ",
            "quantity": 5,
            "notes": "柄の長さ1.5m",
            "sort_order": 1,
        }
        # 1. Create Equipment
        res = await client.post(
            f"/api/v1/genba/{sample_genba.id}/equipment",
            json=payload,
            headers=staff_headers,
        )
        assert res.status_code == 201
        equipment_id = res.json()["data"]["id"]

        # 2. List Equipment
        res_list = await client.get(
            f"/api/v1/genba/{sample_genba.id}/equipment",
            headers=staff_headers,
        )
        assert res_list.status_code == 200
        assert len(res_list.json()["data"]) == 1
        assert res_list.json()["data"][0]["equipment_name"] == "モップ"

        # 3. Update Equipment
        res_update = await client.put(
            f"/api/v1/genba/{sample_genba.id}/equipment/{equipment_id}",
            json={"quantity": 10},
            headers=staff_headers,
        )
        assert res_update.status_code == 200
        assert res_update.json()["data"]["quantity"] == 10

        # 4. Delete Equipment
        res_del = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/equipment/{equipment_id}",
            headers=staff_headers,
        )
        assert res_del.status_code == 200

    # ==========================================================================
    # Cleaning Work Standards
    # ==========================================================================
    async def test_standards_crud(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create, read, update, and delete cleaning standards."""
        payload = {
            "floor_number": "3階",
            "area_name": "会議室",
            "floor_material": "タイルカーペット",
            "area_sqm": 45.5,
            "daily_tasks": {"vacuum": "daily", "trash": "daily"},
            "periodic_tasks": {"shampoo": "semi_annually"},
            "remarks": "机の配置戻し確認",
            "sort_order": 3,
        }
        # 1. Create Standard
        res = await client.post(
            f"/api/v1/genba/{sample_genba.id}/cleaning-standards",
            json=payload,
            headers=staff_headers,
        )
        assert res.status_code == 201
        std_id = res.json()["data"]["id"]
        assert res.json()["data"]["daily_tasks"]["vacuum"] == "daily"

        # 2. List Standards
        res_list = await client.get(
            f"/api/v1/genba/{sample_genba.id}/cleaning-standards",
            headers=staff_headers,
        )
        assert res_list.status_code == 200
        assert len(res_list.json()["data"]) == 1

        # 3. Update Standard
        res_update = await client.put(
            f"/api/v1/genba/{sample_genba.id}/cleaning-standards/{std_id}",
            json={"remarks": "新着備考"},
            headers=staff_headers,
        )
        assert res_update.status_code == 200
        assert res_update.json()["data"]["remarks"] == "新着備考"

        # 4. Delete Standard
        res_del = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/cleaning-standards/{std_id}",
            headers=staff_headers,
        )
        assert res_del.status_code == 200

    # ==========================================================================
    # Periodic Plans & Details
    # ==========================================================================
    async def test_periodic_plans_and_details_crud(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create, read, update, and delete periodic plans and nested details."""
        plan_payload = {
            "work_team_type": "SELF",
            "work_content": "床ワックス塗布",
            "month_apr": True,
            "month_may": False,
            "month_jun": False,
            "month_jul": False,
            "month_aug": False,
            "month_sep": False,
            "month_oct": True,
            "month_nov": False,
            "month_dec": False,
            "month_jan": False,
            "month_feb": False,
            "month_mar": False,
            "sort_order": 1,
        }
        # 1. Create Plan
        res = await client.post(
            f"/api/v1/genba/{sample_genba.id}/periodic-plans",
            json=plan_payload,
            headers=staff_headers,
        )
        assert res.status_code == 201
        plan_id = res.json()["data"]["id"]
        assert res.json()["data"]["month_apr"] is True

        # 2. Create Detail
        detail_payload = {
            "location": "A棟1F",
            "area_name": "食堂",
            "floor_material": "リノリウム",
            "work_content": "床ワックス剥離・塗布",
            "sort_order": 1,
        }
        res_det = await client.post(
            f"/api/v1/genba/{sample_genba.id}/periodic-plans/{plan_id}/details",
            json=detail_payload,
            headers=staff_headers,
        )
        assert res_det.status_code == 201
        detail_id = res_det.json()["data"]["id"]

        # 3. List plans (should load nested details)
        res_list = await client.get(
            f"/api/v1/genba/{sample_genba.id}/periodic-plans",
            headers=staff_headers,
        )
        assert res_list.status_code == 200
        plans = res_list.json()["data"]
        assert len(plans) == 1
        assert len(plans[0]["details"]) == 1
        assert plans[0]["details"][0]["area_name"] == "食堂"

        # 4. Update Detail
        res_det_upd = await client.put(
            f"/api/v1/genba/{sample_genba.id}/periodic-plans/{plan_id}/details/{detail_id}",
            json={"area_name": "ロビー"},
            headers=staff_headers,
        )
        assert res_det_upd.status_code == 200
        assert res_det_upd.json()["data"]["area_name"] == "ロビー"

        # 5. Delete Detail
        res_det_del = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/periodic-plans/{plan_id}/details/{detail_id}",
            headers=staff_headers,
        )
        assert res_det_del.status_code == 200

        # 6. Delete Plan
        res_plan_del = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/periodic-plans/{plan_id}",
            headers=staff_headers,
        )
        assert res_plan_del.status_code == 200

    # ==========================================================================
    # Role-Based Authorization Tests
    # ==========================================================================
    async def test_partner_schedules_forbidden(
        self,
        client: AsyncClient,
        partner_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Partners are forbidden from accessing work-schedules and custom holidays."""
        res_list_schedules = await client.get(
            f"/api/v1/genba/{sample_genba.id}/work-schedules",
            headers=partner_headers,
        )
        assert res_list_schedules.status_code == 403

        res_list_holidays = await client.get(
            f"/api/v1/genba/{sample_genba.id}/custom-holidays",
            headers=partner_headers,
        )
        assert res_list_holidays.status_code == 403

        payload = {
            "shift_label": "不正",
            "work_days": "月",
            "start_time": "09:00:00",
            "end_time": "18:00:00",
        }
        res_post = await client.post(
            f"/api/v1/genba/{sample_genba.id}/work-schedules",
            json=payload,
            headers=partner_headers,
        )
        assert res_post.status_code == 403

    async def test_worker_write_forbidden(
        self,
        client: AsyncClient,
        worker_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Workers are read-only and cannot write to any schedule endpoints."""
        payload = {
            "equipment_name": "不正用具",
            "quantity": 100,
        }
        res_post = await client.post(
            f"/api/v1/genba/{sample_genba.id}/equipment",
            json=payload,
            headers=worker_headers,
        )
        assert res_post.status_code == 403
