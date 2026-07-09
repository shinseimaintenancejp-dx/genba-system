"""
Genba Management System — Auth Module: Repository.

Database query layer for user operations.
Follows the 5-file pattern (BE§3) — no business logic here.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import UserModel

logger = logging.getLogger(__name__)


class UserRepository:
    """
    Handles all database operations for UserModel.

    ONLY imports from models.py and core/database.py.
    NO business logic — that belongs in service.py.
    """

    async def get_by_id(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> UserModel | None:
        """Fetch a user by their UUID."""
        result = await session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_username(
        self,
        session: AsyncSession,
        username: str,
    ) -> UserModel | None:
        """Fetch a user by their username (case-sensitive)."""
        result = await session.execute(
            select(UserModel).where(UserModel.username == username)
        )
        return result.scalar_one_or_none()

    async def get_by_email(
        self,
        session: AsyncSession,
        email: str,
    ) -> UserModel | None:
        """Fetch a user by their email address."""
        result = await session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        session: AsyncSession,
        username: str,
        full_name: str,
        hashed_password: str,
        role: str,
        email: str | None = None,
        related_entity_id: uuid.UUID | None = None,
    ) -> UserModel:
        """
        Create a new user record.

        Args:
            session: Active async database session
            username: Unique username
            full_name: Display name
            hashed_password: Bcrypt-hashed password (NEVER plaintext)
            role: One of the 6 valid roles
            email: Optional email address
            related_entity_id: Optional UUID linking to staff/worker/partner

        Returns:
            The newly created UserModel instance
        """
        user = UserModel(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role=role,
            related_entity_id=related_entity_id,
            is_active=True,
        )
        session.add(user)
        await session.flush()  # Get the generated ID without committing
        await session.refresh(user)
        logger.info("User created", extra={"user_id": str(user.id), "role": role})
        return user

    async def update_last_login(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> None:
        """Update the last_login_at timestamp for a user."""
        await session.execute(
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(last_login_at=datetime.now(timezone.utc))
        )

    async def update_password(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        new_hashed_password: str,
    ) -> None:
        """Update a user's hashed password."""
        await session.execute(
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(
                hashed_password=new_hashed_password,
                updated_at=datetime.now(timezone.utc),
            )
        )

    async def deactivate(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> None:
        """Deactivate a user account (soft delete)."""
        await session.execute(
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )


# Module-level singleton
user_repository = UserRepository()
