"""
Genba Management System — Customer Module: Service.

Business logic for customer and customer contacts.
"""

import json
import uuid
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import NotFoundError
from app.modules.customer.models import CustomerContactModel, CustomerModel
from app.modules.customer.repository import CustomerRepository
from app.modules.customer.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerContactCreate,
    CustomerContactUpdate,
    ReorderRequest,
)


class CustomerService:
    """Service class encapsulating business operations for customers and contacts."""

    @staticmethod
    async def get_customer(db: AsyncSession, customer_id: uuid.UUID, user_id: str) -> CustomerModel:
        """Get customer by ID, raises NotFoundError if not found, logs view event."""
        customer = await CustomerRepository.get_by_id(db, customer_id)
        if not customer:
            raise NotFoundError("取引先が見つかりません")

        await audit_service.log(
            session=db,
            action="VIEW",
            entity_type="customer",
            entity_id=str(customer.id),
            user_id=user_id,
        )
        return customer

    @staticmethod
    async def list_customers(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> tuple[Sequence[CustomerModel], int]:
        """List customers with sorting and filtering, returns (items, total_count)."""
        items = await CustomerRepository.list_all(
            db, skip=skip, limit=limit, is_active=is_active, search_query=search_query
        )
        total = await CustomerRepository.count_all(
            db, is_active=is_active, search_query=search_query
        )
        return items, total

    @staticmethod
    async def create_customer(db: AsyncSession, data: CustomerCreate, user_id: str) -> CustomerModel:
        """Create a new customer and log create audit log."""
        customer = CustomerModel(
            full_name=data.full_name,
            short_name=data.short_name,
            branch_name=data.branch_name,
            phone=data.phone,
            fax=data.fax,
            email=data.email,
            address=data.address,
            notes=data.notes,
        )
        created_customer = await CustomerRepository.create(db, customer)

        # Log audit log
        new_val = {
            "full_name": customer.full_name,
            "short_name": customer.short_name,
            "branch_name": customer.branch_name,
        }
        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="customer",
            entity_id=str(created_customer.id),
            user_id=user_id,
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return created_customer

    @staticmethod
    async def update_customer(
        db: AsyncSession, customer_id: uuid.UUID, data: CustomerUpdate, user_id: str
    ) -> CustomerModel:
        """Update an existing customer and log update audit log."""
        customer = await CustomerRepository.get_by_id(db, customer_id)
        if not customer:
            raise NotFoundError("取引先が見つかりません")

        old_val = {
            "full_name": customer.full_name,
            "short_name": customer.short_name,
            "is_active": customer.is_active,
        }

        # Apply updates
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)

        await db.flush()

        new_val = {
            "full_name": customer.full_name,
            "short_name": customer.short_name,
            "is_active": customer.is_active,
        }

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="customer",
            entity_id=str(customer.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return customer

    @staticmethod
    async def reorder_customers(db: AsyncSession, data: "ReorderRequest", user_id: str) -> None:
        """Bulk update display orders for customers."""
        from sqlalchemy import update
        
        for item in data.items:
            await db.execute(
                update(CustomerModel)
                .where(CustomerModel.id == item.id)
                .values(display_order=item.display_order)
            )
            
        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="customer",
            user_id=user_id,
        )

    # =============================================================================
    # Customer Contact Operations
    # =============================================================================

    @staticmethod
    async def list_contacts(db: AsyncSession, customer_id: uuid.UUID) -> Sequence[CustomerContactModel]:
        """List contacts for a specific customer."""
        customer = await CustomerRepository.get_by_id(db, customer_id)
        if not customer:
            raise NotFoundError("取引先が見つかりません")
        return await CustomerRepository.list_contacts(db, customer_id)

    @staticmethod
    async def create_contact(
        db: AsyncSession, customer_id: uuid.UUID, data: CustomerContactCreate, user_id: str
    ) -> CustomerContactModel:
        """Create a new contact person for a customer."""
        customer = await CustomerRepository.get_by_id(db, customer_id)
        if not customer:
            raise NotFoundError("取引先が見つかりません")

        contact = CustomerContactModel(
            customer_id=customer_id,
            full_name=data.full_name,
            position=data.position,
            phone=data.phone,
            email=data.email,
            notes=data.notes,
            is_primary=data.is_primary,
        )
        created_contact = await CustomerRepository.create_contact(db, contact)

        await audit_service.log(
            session=db,
            action="CREATE",
            entity_type="customer_contact",
            entity_id=str(created_contact.id),
            user_id=user_id,
            new_value=json.dumps({"full_name": contact.full_name, "is_primary": contact.is_primary}, ensure_ascii=False),
        )
        return created_contact

    @staticmethod
    async def update_contact(
        db: AsyncSession,
        customer_id: uuid.UUID,
        contact_id: uuid.UUID,
        data: CustomerContactUpdate,
        user_id: str,
    ) -> CustomerContactModel:
        """Update a customer contact."""
        contact = await CustomerRepository.get_contact_by_id(db, customer_id, contact_id)
        if not contact:
            raise NotFoundError("担当者が見つかりません")

        old_val = {
            "full_name": contact.full_name,
            "is_primary": contact.is_primary,
            "is_active": contact.is_active,
        }

        # Apply updates
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contact, field, value)

        if data.is_primary:
            # Unset all other contacts as primary
            await CustomerRepository.update_contact_primary_status(db, customer_id, contact_id)

        await db.flush()

        new_val = {
            "full_name": contact.full_name,
            "is_primary": contact.is_primary,
            "is_active": contact.is_active,
        }

        await audit_service.log(
            session=db,
            action="UPDATE",
            entity_type="customer_contact",
            entity_id=str(contact.id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
            new_value=json.dumps(new_val, ensure_ascii=False),
        )
        return contact

    @staticmethod
    async def delete_contact(
        db: AsyncSession, customer_id: uuid.UUID, contact_id: uuid.UUID, user_id: str
    ) -> None:
        """Hard delete a customer contact."""
        contact = await CustomerRepository.get_contact_by_id(db, customer_id, contact_id)
        if not contact:
            raise NotFoundError("担当者が見つかりません")

        old_val = {"full_name": contact.full_name}

        await CustomerRepository.delete_contact(db, contact)

        await audit_service.log(
            session=db,
            action="DELETE",
            entity_type="customer_contact",
            entity_id=str(contact_id),
            user_id=user_id,
            old_value=json.dumps(old_val, ensure_ascii=False),
        )
