"""
Genba Management System — Customer Module: Repository.

Data access object for customers and customer contacts.
"""

import uuid
from typing import Sequence
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customer.models import CustomerContactModel, CustomerModel


class CustomerRepository:
    """Repository class for handling DB operations for Customers and Customer Contacts."""

    @staticmethod
    async def get_by_id(db: AsyncSession, customer_id: uuid.UUID) -> CustomerModel | None:
        """Retrieve a customer by ID."""
        result = await db.execute(
            select(CustomerModel).where(CustomerModel.id == customer_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> Sequence[CustomerModel]:
        """List all customers with filters."""
        query = select(CustomerModel)
        if is_active is not None:
            query = query.where(CustomerModel.is_active == is_active)
        if search_query:
            query = query.where(
                (CustomerModel.full_name.ilike(f"%{search_query}%"))
                | (CustomerModel.short_name.ilike(f"%{search_query}%"))
            )
        query = query.order_by(CustomerModel.full_name).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def count_all(
        db: AsyncSession,
        is_active: bool | None = None,
        search_query: str | None = None,
    ) -> int:
        """Count total customers matching criteria."""
        query = select(func.count()).select_from(CustomerModel)
        if is_active is not None:
            query = query.where(CustomerModel.is_active == is_active)
        if search_query:
            query = query.where(
                (CustomerModel.full_name.ilike(f"%{search_query}%"))
                | (CustomerModel.short_name.ilike(f"%{search_query}%"))
            )
        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def create(db: AsyncSession, model: CustomerModel) -> CustomerModel:
        """Create a new customer."""
        db.add(model)
        await db.flush()
        return model

    @staticmethod
    async def get_contact_by_id(
        db: AsyncSession, customer_id: uuid.UUID, contact_id: uuid.UUID
    ) -> CustomerContactModel | None:
        """Retrieve a specific customer contact."""
        result = await db.execute(
            select(CustomerContactModel).where(
                CustomerContactModel.id == contact_id,
                CustomerContactModel.customer_id == customer_id,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_contacts(db: AsyncSession, customer_id: uuid.UUID) -> Sequence[CustomerContactModel]:
        """List all contacts for a customer."""
        result = await db.execute(
            select(CustomerContactModel)
            .where(CustomerContactModel.customer_id == customer_id)
            .order_by(CustomerContactModel.full_name)
        )
        return result.scalars().all()

    @staticmethod
    async def create_contact(db: AsyncSession, model: CustomerContactModel) -> CustomerContactModel:
        """Create a new customer contact."""
        if model.is_primary:
            # Unset other primary contacts for this customer
            await db.execute(
                update(CustomerContactModel)
                .where(CustomerContactModel.customer_id == model.customer_id)
                .values(is_primary=False)
            )
        db.add(model)
        await db.flush()
        return model

    @staticmethod
    async def update_contact_primary_status(db: AsyncSession, customer_id: uuid.UUID, except_contact_id: uuid.UUID) -> None:
        """Unset primary status for all contacts of a customer except the specified one."""
        await db.execute(
            update(CustomerContactModel)
            .where(
                CustomerContactModel.customer_id == customer_id,
                CustomerContactModel.id != except_contact_id
            )
            .values(is_primary=False)
        )

    @staticmethod
    async def delete_contact(db: AsyncSession, model: CustomerContactModel) -> None:
        """Delete a customer contact."""
        await db.delete(model)
        await db.flush()
