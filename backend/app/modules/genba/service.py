"""
Genba Management System — Genba Module: Service.

Business logic for Genba worksites management.
"""

import json
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import NotFoundError
from app.modules.genba.models import GenbaModel
from app.modules.genba.repository import GenbaRepository
from app.modules.genba.schemas import GenbaCreate, GenbaUpdate


class GenbaService:
    """Service class encapsulating business operations for Genba worksites."""

    @staticmethod
    async def get_genba(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> GenbaModel:
        """Get Genba by ID, raises NotFoundError if not found, logs view event."""
        genba = await GenbaRepository.get_by_id(db, genba_id)
        if not genba:
            raise NotFoundError("現場が見つかりません")

        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="genba",
            entity_id=str(genba.id),
            user_id=user_id,
        )
        return genba

    @staticmethod
    async def list_genbas(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_ids: list[uuid.UUID] | None = None,
        staff_id: str | None = None,
        search_query: str | None = None,
        has_periodic: bool | None = None,
        periodic_month: int | None = None,
    ) -> tuple[Sequence[GenbaModel], int]:
        """List Genbas with pagination and filters."""
        items = await GenbaRepository.list_all(
            db, skip=skip, limit=limit, status=status, customer_ids=customer_ids, staff_id=staff_id, search_query=search_query, has_periodic=has_periodic, periodic_month=periodic_month
        )
        total = await GenbaRepository.count_all(
            db, status=status, customer_ids=customer_ids, staff_id=staff_id, search_query=search_query, has_periodic=has_periodic, periodic_month=periodic_month
        )

        # Annotate with contract types
        if items:
            from sqlalchemy import select

            from app.modules.contract.models import ContractModel

            genba_ids = [item.id for item in items]
            contracts_query = select(ContractModel.genba_id, ContractModel.service_category).where(
                ContractModel.genba_id.in_(genba_ids)
            )
            res = await db.execute(contracts_query)
            contracts = res.all()

            contract_map = {}
            for g_id, category in contracts:
                if g_id not in contract_map:
                    contract_map[g_id] = set()
                contract_map[g_id].add(category)

            for item in items:
                cats = contract_map.get(item.id, set())
                item.has_daily_contract = "DAILY" in cats
                item.has_periodic_contract = "PERIODIC" in cats

        return items, total

    @staticmethod
    async def create_genba(
        db: AsyncSession, data: GenbaCreate, user_id: str
    ) -> tuple[GenbaModel | None, list[GenbaModel]]:
        """
        Create a new Genba worksite.
        
        If confirm_duplicate is False and a similar name is found, returns (None, similar_list).
        Otherwise creates the worksite and returns (created_model, []).
        Handles inline contact creation, contact assignment, and staff assignment.
        """
        if not data.confirm_duplicate:
            similar = await GenbaRepository.check_similar_name(db, data.property_name)
            if similar:
                return None, list(similar)

        genba = GenbaModel(
            property_name=data.property_name,
            address=data.address,
            transportation=data.transportation,
            phone=data.phone,
            external_partner_code=data.external_partner_code,
            customer_id=data.customer_id,
            special_notes=data.special_notes,
            management_start_date=data.management_start_date,
            genba_type=data.genba_type,
            genba_type_other=data.genba_type_other,
            floor_above_ground=data.floor_above_ground,
            floor_basement=data.floor_basement,
        )
        created_genba = await GenbaRepository.create(db, genba)

        # Sprint 5: Handle inline new contacts creation
        all_contact_ids = list(data.contact_ids)
        if data.new_contacts:
            from app.modules.customer.models import CustomerContactModel
            for new_contact in data.new_contacts:
                # Check for duplicate name (warn but allow with confirmation — Q1 decision B)
                is_dup = await GenbaRepository.check_duplicate_contact_name(
                    db, data.customer_id, new_contact.full_name
                )
                # For now, we create regardless (frontend handles the warning/confirmation)
                # If duplicate found, the frontend should have shown a warning dialog
                contact = CustomerContactModel(
                    customer_id=data.customer_id,
                    full_name=new_contact.full_name,
                    phone=new_contact.phone,
                    email=new_contact.email,
                    position=new_contact.position,
                )
                db.add(contact)
                await db.flush()
                all_contact_ids.append(contact.id)

        # Sprint 5: Assign contacts to genba
        if all_contact_ids:
            await GenbaRepository.assign_contacts(db, created_genba.id, all_contact_ids)

        # Sprint 5: Assign staff to genba
        if data.staff_assignments:
            await GenbaRepository.assign_staff(
                db,
                created_genba.id,
                [{"staff_id": sa.staff_id, "role_type": sa.role_type} for sa in data.staff_assignments],
            )

        # Log audit trail
        new_val = {
            "property_name": genba.property_name,
            "address": genba.address,
            "customer_id": str(genba.customer_id),
            "genba_type": genba.genba_type,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="genba",
            entity_id=str(created_genba.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        full_genba = await GenbaRepository.get_by_id(db, created_genba.id)
        return full_genba or created_genba, []

    @staticmethod
    async def update_genba(
        db: AsyncSession, genba_id: uuid.UUID, data: GenbaUpdate, user_id: str
    ) -> GenbaModel:
        """Update an existing Genba worksite."""
        genba = await GenbaRepository.get_by_id(db, genba_id)
        if not genba:
            raise NotFoundError("現場が見つかりません")

        old_val = {
            "property_name": genba.property_name,
            "address": genba.address,
            "status": genba.status,
        }

        # Apply scalar field updates (exclude relationship fields)
        scalar_fields = data.model_dump(
            exclude_unset=True,
            exclude={"contact_ids", "new_contacts", "staff_assignments"},
        )
        for field, value in scalar_fields.items():
            setattr(genba, field, value)

        await db.flush()

        # Sprint 5: Handle contact updates
        if data.contact_ids is not None:
            all_contact_ids = list(data.contact_ids)

            # Create inline new contacts if provided
            if data.new_contacts:
                from app.modules.customer.models import CustomerContactModel
                for new_contact in data.new_contacts:
                    contact = CustomerContactModel(
                        customer_id=genba.customer_id,
                        full_name=new_contact.full_name,
                        phone=new_contact.phone,
                        email=new_contact.email,
                        position=new_contact.position,
                    )
                    db.add(contact)
                    await db.flush()
                    all_contact_ids.append(contact.id)

            await GenbaRepository.replace_contacts(db, genba_id, all_contact_ids)

        # Sprint 5: Handle staff assignment updates
        if data.staff_assignments is not None:
            await GenbaRepository.replace_staff(
                db,
                genba_id,
                [{"staff_id": sa.staff_id, "role_type": sa.role_type} for sa in data.staff_assignments],
            )

        new_val = {
            "property_name": genba.property_name,
            "address": genba.address,
            "status": genba.status,
        }

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="genba",
            entity_id=str(genba.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return genba

    @staticmethod
    async def terminate_genba(db: AsyncSession, genba_id: uuid.UUID, user_id: str) -> GenbaModel:
        """Terminate a Genba worksite, setting status to TERMINATED."""
        genba = await GenbaRepository.get_by_id(db, genba_id)
        if not genba:
            raise NotFoundError("現場が見つかりません")

        old_val = {"status": genba.status, "terminated_at": str(genba.terminated_at) if genba.terminated_at else None}

        genba.status = "TERMINATED"
        genba.terminated_at = datetime.now(UTC)

        await db.flush()

        new_val = {"status": genba.status, "terminated_at": str(genba.terminated_at)}

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="genba",
            entity_id=str(genba.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return genba
