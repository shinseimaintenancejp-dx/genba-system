"""
Genba Management System — Manual & Memo CRUD Tests.
"""

import io
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.genba.models import GenbaModel
from app.modules.customer.models import CustomerModel
from app.modules.manual.models import (
    EntryExitInstructionModel,
    DailyCleaningTaskModel,
    MemoModel,
    MemoAttachmentModel,
)


@pytest.fixture
async def sample_genba(db_session: AsyncSession) -> GenbaModel:
    """Create a sample customer and genba for manual testing."""
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
        address="東京都渋谷区1-2-3",
        status="ACTIVE",
        customer_id=customer.id,
    )
    db_session.add(genba)
    await db_session.commit()
    return genba


class TestManualCRUD:
    """Test suite for Entry/Exit instructions, Daily Cleaning Tasks, and Memos."""

    # ==========================================================================
    # Entry/Exit Instructions
    # ==========================================================================
    async def test_get_entry_exit_empty_default(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Endpoint should return empty initialized entry/exit model if none exists."""
        response = await client.get(
            f"/api/v1/genba/{sample_genba.id}/entry-exit",
            headers=staff_headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert body["data"]["entry_method"] == ""
        assert body["data"]["exit_method"] == ""

    async def test_upsert_entry_exit_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create or update entry/exit instruction."""
        payload = {
            "entry_method": "<p>入館用暗証番号 1234</p>",
            "exit_method": "<p>自動ドアのロック確認</p>",
            "safety_notes": "ヘルメット着用",
        }
        # First upsert (Create)
        response = await client.put(
            f"/api/v1/genba/{sample_genba.id}/entry-exit",
            json=payload,
            headers=staff_headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["data"]["entry_method"] == "<p>入館用暗証番号 1234</p>"
        assert body["data"]["safety_notes"] == "ヘルメット着用"

        # Second upsert (Update)
        payload["entry_method"] = "<p>鍵ボックス番号 5678</p>"
        response2 = await client.put(
            f"/api/v1/genba/{sample_genba.id}/entry-exit",
            json=payload,
            headers=staff_headers,
        )
        assert response2.status_code == 200
        body2 = response2.json()
        assert body2["data"]["entry_method"] == "<p>鍵ボックス番号 5678</p>"

    # ==========================================================================
    # Daily Cleaning Tasks
    # ==========================================================================
    async def test_daily_cleaning_task_crud(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create, read, update, and delete daily tasks."""
        # 1. Create Task
        payload = {
            "day_of_week": "月",
            "start_time": "08:30:00",
            "floor": "1階",
            "special_notes": "植木に水やり",
            "contents": [
                {
                    "area_name": "エントランス",
                    "work_content": "床掃除とゴミ回収",
                    "sort_order": 10,
                }
            ],
        }
        res_create = await client.post(
            f"/api/v1/genba/{sample_genba.id}/daily-tasks",
            json=payload,
            headers=staff_headers,
        )
        assert res_create.status_code == 201
        task_id = res_create.json()["data"]["id"]

        # 2. Get list (should show task)
        res_list = await client.get(
            f"/api/v1/genba/{sample_genba.id}/daily-tasks",
            headers=staff_headers,
        )
        assert res_list.status_code == 200
        tasks = res_list.json()["data"]
        assert len(tasks) == 1
        assert tasks[0]["contents"][0]["area_name"] == "エントランス"

        # 3. Update Task
        update_payload = {
            "contents": [
                {
                    "area_name": "ロビー",
                    "work_content": "床掃除とゴミ回収",
                    "sort_order": 5,
                }
            ]
        }
        res_update = await client.put(
            f"/api/v1/genba/{sample_genba.id}/daily-tasks/{task_id}",
            json=update_payload,
            headers=staff_headers,
        )
        assert res_update.status_code == 200
        assert res_update.json()["data"]["contents"][0]["area_name"] == "ロビー"
        assert res_update.json()["data"]["contents"][0]["sort_order"] == 5

        # 4. Delete Task
        res_delete = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/daily-tasks/{task_id}",
            headers=staff_headers,
        )
        assert res_delete.status_code == 200

        # List should be empty now
        res_list_empty = await client.get(
            f"/api/v1/genba/{sample_genba.id}/daily-tasks",
            headers=staff_headers,
        )
        assert len(res_list_empty.json()["data"]) == 0

    # ==========================================================================
    # Memos & Attachments
    # ==========================================================================
    async def test_memos_with_attachments(
        self,
        client: AsyncClient,
        staff_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Staff can create memos, update them, and upload/delete attachments."""
        # 1. Create Memo
        payload = {
            "memo_date": "2026-06-11T12:00:00Z",
            "content": "定期清掃の報告連絡用メモ",
        }
        res_create = await client.post(
            f"/api/v1/genba/{sample_genba.id}/memos",
            json=payload,
            headers=staff_headers,
        )
        assert res_create.status_code == 201
        memo_id = res_create.json()["data"]["id"]

        # 2. Upload Attachment
        file_content = b"fake file content"
        files = {"file": ("report.pdf", io.BytesIO(file_content), "application/pdf")}
        res_upload = await client.post(
            f"/api/v1/genba/{sample_genba.id}/memos/{memo_id}/attachments",
            files=files,
            headers=staff_headers,
        )
        assert res_upload.status_code == 201
        att_body = res_upload.json()["data"]
        assert att_body["file_name"] == "report.pdf"
        assert att_body["file_url"].startswith("/uploads/")
        attachment_id = att_body["id"]

        # 3. List memos (should return the nested attachment)
        res_list = await client.get(
            f"/api/v1/genba/{sample_genba.id}/memos",
            headers=staff_headers,
        )
        assert res_list.status_code == 200
        memos = res_list.json()["data"]
        assert len(memos) == 1
        assert len(memos[0]["attachments"]) == 1
        assert memos[0]["attachments"][0]["file_name"] == "report.pdf"

        # 4. Delete attachment
        res_del_att = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/memos/{memo_id}/attachments/{attachment_id}",
            headers=staff_headers,
        )
        assert res_del_att.status_code == 200

        # List should now show 0 attachments
        res_list_2 = await client.get(
            f"/api/v1/genba/{sample_genba.id}/memos",
            headers=staff_headers,
        )
        assert len(res_list_2.json()["data"][0]["attachments"]) == 0

        # 5. Delete Memo
        res_del_memo = await client.delete(
            f"/api/v1/genba/{sample_genba.id}/memos/{memo_id}",
            headers=staff_headers,
        )
        assert res_del_memo.status_code == 200

    # ==========================================================================
    # Permissions and RLS Check
    # ==========================================================================
    async def test_partner_memo_access_forbidden(
        self,
        client: AsyncClient,
        partner_headers: dict,
        sample_genba: GenbaModel,
    ) -> None:
        """Partners cannot view or manage memos at all (returns 403 Forbidden)."""
        res_get = await client.get(
            f"/api/v1/genba/{sample_genba.id}/memos",
            headers=partner_headers,
        )
        assert res_get.status_code == 403

        payload = {
            "memo_date": "2026-06-11T12:00:00Z",
            "content": "テスト",
        }
        res_post = await client.post(
            f"/api/v1/genba/{sample_genba.id}/memos",
            json=payload,
            headers=partner_headers,
        )
        assert res_post.status_code == 403
