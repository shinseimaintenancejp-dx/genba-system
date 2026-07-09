"""
Genba Management System — Contract CRUD & RLS Tests.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import UserModel
from app.core.security import hash_password


class TestContractCRUD:
    """Test suite for Contract CRUD and security/validation logic."""

    async def test_create_receiving_contract_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can create a元請 (RECEIVING) contract with customer_id."""
        # Create Customer
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "元請テスト顧客", "short_name": "元請客"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        # Create Genba
        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "元請テスト現場", "address": "テスト住所", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        payload = {
            "contract_type": "RECEIVING",
            "service_type": "定期清掃",
            "service_area": "共用部",
            "cleaning_type": "床面清掃",
            "work_description": "月2回の定期床清掃",
            "amount": 150000,
            "tax_type": "EXCLUSIVE",
            "start_date": "2026-06-01",
            "auto_renew": True,
            "invoice_required": True,
            "genba_id": genba_id,
            "customer_id": customer_id,
            "partner_id": None,
            "service_category": "OTHER",
            "work_type": "test_type",
            "sub_service_type": "test_sub",
        }

        response = await client.post(
            "/api/v1/contracts",
            json=payload,
            headers=staff_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["contract_type"] == "RECEIVING"
        assert float(body["data"]["amount"]) == 150000
        assert body["data"]["internal_code"].startswith("CTR-")

    async def test_create_ordering_contract_success(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff can create a下請 (ORDERING) contract with partner_id."""
        # Create Customer
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "下請テスト顧客", "short_name": "下請客"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        # Create Genba
        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "下請テスト現場", "address": "テスト住所", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        # Create Partner
        p_res = await client.post(
            "/api/v1/partners",
            json={"company_name": "下請テスト協力会社"},
            headers=staff_headers
        )
        partner_id = p_res.json()["data"]["id"]

        payload = {
            "contract_type": "ORDERING",
            "service_type": "日常清掃",
            "service_area": "ゴミ改修",
            "amount": 80000,
            "tax_type": "INCLUSIVE",
            "start_date": "2026-06-01",
            "auto_renew": False,
            "invoice_required": True,
            "genba_id": genba_id,
            "customer_id": None,
            "partner_id": partner_id,
            "service_category": "OTHER",
            "work_type": "test_type",
            "sub_service_type": "test_sub",
        }

        response = await client.post(
            "/api/v1/contracts",
            json=payload,
            headers=staff_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert "data" in body
        assert body["data"]["contract_type"] == "ORDERING"
        assert float(body["data"]["amount"]) == 80000
        assert body["data"]["partner_id"] == partner_id

    async def test_create_contract_validation_error(
        self,
        client: AsyncClient,
        staff_headers: dict,
    ) -> None:
        """Staff gets validation error when database constraints are violated."""
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "エラーテスト顧客", "short_name": "エラー客"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "エラーテスト現場", "address": "テスト住所", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        p_res = await client.post(
            "/api/v1/partners",
            json={"company_name": "エラーテスト協力会社"},
            headers=staff_headers
        )
        partner_id = p_res.json()["data"]["id"]

        # Test Case 1: RECEIVING with partner_id (forbidden)
        payload1 = {
            "contract_type": "RECEIVING",
            "service_type": "定期清掃",
            "amount": 100000,
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": customer_id,
            "partner_id": partner_id
        }
        res1 = await client.post("/api/v1/contracts", json=payload1, headers=staff_headers)
        assert res1.status_code == 422

        # Test Case 2: ORDERING without partner_id (required)
        payload2 = {
            "contract_type": "ORDERING",
            "service_type": "日常清掃",
            "amount": 80000,
            "start_date": "2026-06-01",
            "genba_id": genba_id,
            "customer_id": None,
            "partner_id": None
        }
        res2 = await client.post("/api/v1/contracts", json=payload2, headers=staff_headers)
        assert res2.status_code == 422

    async def test_contract_rls_partner_isolation(
        self,
        client: AsyncClient,
        staff_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        """Partners can only see ORDERING contracts scoped to their related_entity_id via RLS."""
        # 1. Create Customer
        c_res = await client.post(
            "/api/v1/customers",
            json={"full_name": "RLSテスト顧客", "short_name": "RLS客"},
            headers=staff_headers
        )
        customer_id = c_res.json()["data"]["id"]

        # 2. Create Genba
        g_res = await client.post(
            "/api/v1/genba",
            json={"property_name": "RLSテスト現場", "address": "テスト住所", "customer_id": customer_id},
            headers=staff_headers
        )
        genba_id = g_res.json()["data"]["id"]

        # 3. Create 2 Partners
        p1_res = await client.post("/api/v1/partners", json={"company_name": "協力会社P1"}, headers=staff_headers)
        p1_id = p1_res.json()["data"]["id"]

        p2_res = await client.post("/api/v1/partners", json={"company_name": "協力会社P2"}, headers=staff_headers)
        p2_id = p2_res.json()["data"]["id"]

        # 4. Create contracts:
        # CTR1: Meta contract for P1 (ORDERING)
        await client.post(
            "/api/v1/contracts",
            json={
                "contract_type": "ORDERING",
                "service_type": "日常清掃",
                "amount": 50000,
                "start_date": "2026-06-01",
                "genba_id": genba_id,
                "partner_id": p1_id,
                "service_category": "OTHER",
                "work_type": "test_type",
                "sub_service_type": "test_sub",
            },
            headers=staff_headers
        )

        # CTR2: Meta contract for P2 (ORDERING)
        await client.post(
            "/api/v1/contracts",
            json={
                "contract_type": "ORDERING",
                "service_type": "日常清掃",
                "amount": 70000,
                "start_date": "2026-06-01",
                "genba_id": genba_id,
                "partner_id": p2_id,
                "service_category": "OTHER",
                "work_type": "test_type",
                "sub_service_type": "test_sub",
            },
            headers=staff_headers
        )

        # 5. Create partner user scoped to P1
        p1_user = UserModel(
            id=uuid.uuid4(),
            username="p1_user_scoped",
            full_name="P1担当者",
            hashed_password=hash_password("TestPassword@2026"),
            role="PARTNER",
            related_entity_id=uuid.UUID(p1_id),
            is_active=True,
        )
        db_session.add(p1_user)
        await db_session.commit()

        # 6. Test RLS directly in SQL Session using the non-superuser role
        from sqlalchemy import select, text
        from sqlalchemy.ext.asyncio import async_sessionmaker
        from app.core.database import set_rls_context
        from app.modules.contract.models import ContractModel

        # Create session from same engine but run under genba_test_role (non-superuser)
        session_factory = async_sessionmaker(bind=db_session.bind, expire_on_commit=False)
        async with session_factory() as rls_session:
            # Set role to non-superuser role
            await rls_session.execute(text("SET ROLE genba_test_role"))
            
            # Inject RLS context for Partner P1
            await set_rls_context(rls_session, str(p1_user.id), "PARTNER", p1_id)
            
            # Select contracts
            result = await rls_session.execute(select(ContractModel))
            contracts = result.scalars().all()
            
            # Verify RLS isolation: should ONLY see contract for P1
            assert len(contracts) == 1
            assert str(contracts[0].partner_id) == p1_id
            assert contracts[0].amount == 50000
            
            # Reset role back to avoid session pollution
            await rls_session.execute(text("RESET ROLE"))
