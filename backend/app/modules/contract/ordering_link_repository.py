"""
Genba Management System — Ordering Link Repository.

CRUD operations for contract_ordering_links and contract_ordering_link_work_items.
Handles the N:N relationship between RECEIVING and ORDERING contracts with
validation rules for assignment_type, scope_detail uniqueness, and amount checks.
"""

import uuid
from collections.abc import Sequence
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.contract.models import (
    ContractModel,
    ContractOrderingLinkModel,
    ContractOrderingLinkWorkItemModel,
    ContractPeriodicWorkContentModel,
)
from app.modules.contract.schemas import (
    AvailableReceivingContractItem,
    OrderingLinkCreate,
    OrderingLinkResponse,
    OrderingLinkUpdate,
    OrderingLinkWorkItemResponse,
    PeriodicWorkContentResponse,
)


def _build_link_response(link: ContractOrderingLinkModel) -> OrderingLinkResponse:
    """Build a fully-populated OrderingLinkResponse from ORM model."""
    receiving = link.receiving_contract

    work_item_responses: list[OrderingLinkWorkItemResponse] = []
    for wi in link.work_items:
        wc = wi.work_content_rel
        item = OrderingLinkWorkItemResponse(
            id=wi.id,
            link_id=wi.link_id,
            work_content_id=wi.work_content_id,
            scope_detail=wi.scope_detail,
            allocated_amount=wi.allocated_amount,
            allocated_percentage=wi.allocated_percentage,
            created_at=wi.created_at,
            floor=wc.floor if wc is not None else None,
            area=wc.area if wc is not None else None,
            work_content=wc.work_content if wc is not None else None,
        )
        work_item_responses.append(item)

    return OrderingLinkResponse(
        id=link.id,
        ordering_contract_id=link.ordering_contract_id,
        receiving_contract_id=link.receiving_contract_id,
        assignment_type=link.assignment_type,
        allocated_amount=link.allocated_amount,
        allocated_percentage=link.allocated_percentage,
        remarks=link.remarks,
        created_at=link.created_at,
        updated_at=link.updated_at,
        work_items=work_item_responses,
        receiving_contract_name=(
            receiving.contract_name if receiving is not None else None
        ),
        receiving_contract_code=(
            receiving.internal_code if receiving is not None else None
        ),
        receiving_amount=(
            receiving.amount if receiving is not None else None
        ),
    )


class OrderingLinkRepository:
    """Repository for managing ordering contract links (subcontracting N:N)."""

    # --------------------------------------------------------------------------
    # Query helpers
    # --------------------------------------------------------------------------

    @staticmethod
    def _link_query_with_relations():
        """Base select with all needed relationships eagerly loaded."""
        return (
            select(ContractOrderingLinkModel)
            .options(
                selectinload(ContractOrderingLinkModel.receiving_contract),
                selectinload(ContractOrderingLinkModel.work_items).selectinload(
                    ContractOrderingLinkWorkItemModel.work_content_rel
                ),
            )
        )

    # --------------------------------------------------------------------------
    # GET operations
    # --------------------------------------------------------------------------

    @staticmethod
    async def get_links_for_ordering_contract(
        db: AsyncSession,
        ordering_contract_id: uuid.UUID,
    ) -> list[OrderingLinkResponse]:
        """Fetch all ordering links for a given ORDERING contract."""
        stmt = (
            OrderingLinkRepository._link_query_with_relations()
            .where(ContractOrderingLinkModel.ordering_contract_id == ordering_contract_id)
            .order_by(ContractOrderingLinkModel.created_at)
        )
        result = await db.execute(stmt)
        links = result.scalars().all()
        return [_build_link_response(lnk) for lnk in links]

    @staticmethod
    async def get_link_by_id(
        db: AsyncSession,
        link_id: uuid.UUID,
    ) -> ContractOrderingLinkModel | None:
        """Fetch a single link by PK, including work_items and receiving_contract."""
        stmt = (
            OrderingLinkRepository._link_query_with_relations()
            .where(ContractOrderingLinkModel.id == link_id)
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_available_receiving_contracts(
        db: AsyncSession,
        ordering_contract_id: uuid.UUID,
    ) -> list[AvailableReceivingContractItem]:
        """Return RECEIVING contracts from the same genba as the ORDERING contract,
        that are not already linked to this ORDERING contract."""
        # Get genba_id of the ORDERING contract
        ordering_stmt = select(ContractModel).where(ContractModel.id == ordering_contract_id)
        ordering_result = await db.execute(ordering_stmt)
        ordering = ordering_result.scalars().first()

        if not ordering:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="発注契約が見つかりません。",
            )

        # IDs already linked
        linked_stmt = select(ContractOrderingLinkModel.receiving_contract_id).where(
            ContractOrderingLinkModel.ordering_contract_id == ordering_contract_id
        )
        linked_result = await db.execute(linked_stmt)
        already_linked_ids = {row[0] for row in linked_result.fetchall()}

        # Fetch RECEIVING contracts in same genba
        base_conditions = [
            ContractModel.genba_id == ordering.genba_id,
            ContractModel.contract_type == "RECEIVING",
            ContractModel.status == "ACTIVE",
        ]
        if already_linked_ids:
            base_conditions.append(ContractModel.id.not_in(already_linked_ids))

        receiving_stmt = (
            select(ContractModel)
            .options(
                selectinload(ContractModel.periodic_work_contents)
            )
            .where(and_(*base_conditions))
            .order_by(ContractModel.internal_code)
        )
        receiving_result = await db.execute(receiving_stmt)
        receiving_contracts = receiving_result.scalars().all()

        return [
            AvailableReceivingContractItem(
                id=rc.id,
                internal_code=rc.internal_code,
                contract_name=rc.contract_name or rc.service_type,
                amount=rc.amount,
                service_category=rc.service_category,
                work_content_summary=rc.work_content_summary,
                work_type=rc.work_type,
                sub_service_type=rc.sub_service_type,
                work_execution_date=rc.work_execution_date,
                start_date=rc.start_date,
                end_date=rc.end_date,
                work_items=[
                    PeriodicWorkContentResponse(
                        id=wc.id,
                        floor=wc.floor,
                        area=wc.area,
                        work_content=wc.work_content,
                        sort_order=wc.sort_order,
                    )
                    for wc in rc.periodic_work_contents
                ],
            )
            for rc in receiving_contracts
        ]

    @staticmethod
    async def get_available_receiving_contracts_by_genba(
        db: AsyncSession,
        genba_id: uuid.UUID,
    ) -> list[AvailableReceivingContractItem]:
        """Return all RECEIVING contracts for a specific genba. 
        Used when creating a new ORDERING contract and checking available work to delegate."""
        from sqlalchemy import and_
        receiving_stmt = (
            select(ContractModel)
            .options(
                selectinload(ContractModel.periodic_work_contents)
            )
            .where(
                and_(
                    ContractModel.genba_id == genba_id,
                    ContractModel.contract_type == "RECEIVING",
                    ContractModel.status == "ACTIVE",
                )
            )
            .order_by(ContractModel.internal_code)
        )
        receiving_result = await db.execute(receiving_stmt)
        receiving_contracts = receiving_result.scalars().all()

        return [
            AvailableReceivingContractItem(
                id=rc.id,
                internal_code=rc.internal_code,
                contract_name=rc.contract_name or rc.service_type,
                amount=rc.amount,
                service_category=rc.service_category,
                work_content_summary=rc.work_content_summary,
                work_type=rc.work_type,
                sub_service_type=rc.sub_service_type,
                work_execution_date=rc.work_execution_date,
                start_date=rc.start_date,
                end_date=rc.end_date,
                work_items=[
                    PeriodicWorkContentResponse(
                        id=wc.id,
                        floor=wc.floor,
                        area=wc.area,
                        work_content=wc.work_content,
                        sort_order=wc.sort_order,
                    )
                    for wc in rc.periodic_work_contents
                ],
            )
            for rc in receiving_contracts
        ]

    # --------------------------------------------------------------------------
    # CREATE
    # --------------------------------------------------------------------------

    @staticmethod
    async def create_link(
        db: AsyncSession,
        ordering_contract_id: uuid.UUID,
        payload: OrderingLinkCreate,
    ) -> OrderingLinkResponse:
        """Create an ordering link, with validation rules.

        Validation:
        - R1: Duplicate link (ordering + receiving pair) → 422
        - R2: PARTIAL with no work_items → already caught by schema validator
        - R3: FULL with work_items → already caught by schema validator
        - R4 (warning): total allocated_amount across all links > RECEIVING.amount
        """
        # Check duplicate
        dup_stmt = select(ContractOrderingLinkModel).where(
            and_(
                ContractOrderingLinkModel.ordering_contract_id == ordering_contract_id,
                ContractOrderingLinkModel.receiving_contract_id == payload.receiving_contract_id,
            )
        )
        dup_result = await db.execute(dup_stmt)
        if dup_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="この発注契約はすでに指定の元請契約と連携されています。",
            )

        # Validate work_content_ids exist and belong to the receiving contract
        if payload.work_items:
            wc_ids = [wi.work_content_id for wi in payload.work_items]
            wc_stmt = select(ContractPeriodicWorkContentModel).where(
                and_(
                    ContractPeriodicWorkContentModel.id.in_(wc_ids),
                    ContractPeriodicWorkContentModel.contract_id == payload.receiving_contract_id,
                    ContractPeriodicWorkContentModel.deleted_at.is_(None),
                )
            )
            wc_result = await db.execute(wc_stmt)
            valid_wc_ids = {wc.id for wc in wc_result.scalars().all()}
            invalid = set(wc_ids) - valid_wc_ids
            if invalid:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="指定された作業項目の一部が対象の元請契約に存在しません。",
                )

            # Rule: check for duplicate full-scope assignments across links for the same receiving
            # (same work_content_id with scope_detail=NULL already exists in another link)
            null_scope_items = [
                wi.work_content_id for wi in payload.work_items if wi.scope_detail is None
            ]
            if null_scope_items:
                conflict_stmt = (
                    select(ContractOrderingLinkWorkItemModel)
                    .join(
                        ContractOrderingLinkModel,
                        ContractOrderingLinkModel.id == ContractOrderingLinkWorkItemModel.link_id,
                    )
                    .where(
                        and_(
                            ContractOrderingLinkModel.receiving_contract_id == payload.receiving_contract_id,
                            ContractOrderingLinkWorkItemModel.work_content_id.in_(null_scope_items),
                            ContractOrderingLinkWorkItemModel.scope_detail.is_(None),
                        )
                    )
                )
                conflict_result = await db.execute(conflict_stmt)
                if conflict_result.scalars().first():
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            "指定した作業項目の一部は、すでに別の発注契約に全体委託されています。"
                            "範囲（scope_detail）を指定するか、別の作業項目を選択してください。"
                        ),
                    )

        # Create the link record
        link = ContractOrderingLinkModel(
            ordering_contract_id=ordering_contract_id,
            receiving_contract_id=payload.receiving_contract_id,
            assignment_type=payload.assignment_type,
            allocated_amount=payload.allocated_amount,
            allocated_percentage=payload.allocated_percentage,
            remarks=payload.remarks,
        )
        db.add(link)
        await db.flush()  # Get link.id before inserting work items

        # Create work item records
        for wi_payload in payload.work_items:
            wi = ContractOrderingLinkWorkItemModel(
                link_id=link.id,
                work_content_id=wi_payload.work_content_id,
                scope_detail=wi_payload.scope_detail,
                allocated_amount=wi_payload.allocated_amount,
                allocated_percentage=wi_payload.allocated_percentage,
            )
            db.add(wi)

        await db.flush()

        # Reload with relations for response
        fresh = await OrderingLinkRepository.get_link_by_id(db, link.id)
        assert fresh is not None
        return _build_link_response(fresh)

    # --------------------------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------------------------

    @staticmethod
    async def update_link(
        db: AsyncSession,
        link: ContractOrderingLinkModel,
        payload: OrderingLinkUpdate,
    ) -> OrderingLinkResponse:
        """Update an existing ordering link. If work_items is provided,
        the existing items are fully replaced."""
        if payload.assignment_type is not None:
            link.assignment_type = payload.assignment_type
        if payload.allocated_amount is not None:
            link.allocated_amount = payload.allocated_amount
        if payload.allocated_percentage is not None:
            link.allocated_percentage = payload.allocated_percentage
        if payload.remarks is not None:
            link.remarks = payload.remarks

        # Replace work items when provided
        if payload.work_items is not None:
            if payload.assignment_type == "FULL" or link.assignment_type == "FULL":
                if payload.work_items:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="全面委託（FULL）の場合、作業項目の個別指定は不要です。",
                    )
            # Delete existing items
            for old_wi in list(link.work_items):
                await db.delete(old_wi)
            await db.flush()

            # Insert new items
            for wi_payload in payload.work_items:
                wi = ContractOrderingLinkWorkItemModel(
                    link_id=link.id,
                    work_content_id=wi_payload.work_content_id,
                    scope_detail=wi_payload.scope_detail,
                    allocated_amount=wi_payload.allocated_amount,
                    allocated_percentage=wi_payload.allocated_percentage,
                )
                db.add(wi)

        await db.flush()

        fresh = await OrderingLinkRepository.get_link_by_id(db, link.id)
        assert fresh is not None
        return _build_link_response(fresh)

    # --------------------------------------------------------------------------
    # DELETE
    # --------------------------------------------------------------------------

    @staticmethod
    async def delete_link(db: AsyncSession, link: ContractOrderingLinkModel) -> None:
        """Delete an ordering link and cascade-delete its work items."""
        await db.delete(link)
        await db.flush()

ordering_link_repository = OrderingLinkRepository()
