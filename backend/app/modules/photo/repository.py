"""
Genba Management System — Photo Repository.

Database operations for genba_photos table using SQLAlchemy async.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.photo.models import GenbaPhotoModel

logger = logging.getLogger(__name__)


class PhotoRepository:
    """Repository for photo metadata CRUD operations."""

    async def list_by_genba(
        self,
        db: AsyncSession,
        genba_id: uuid.UUID,
    ) -> list[GenbaPhotoModel]:
        """List all photos for a genba (RLS-filtered), ordered by creation date."""
        result = await db.execute(
            select(GenbaPhotoModel)
            .where(GenbaPhotoModel.genba_id == genba_id)
            .order_by(GenbaPhotoModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(
        self,
        db: AsyncSession,
        photo_id: uuid.UUID,
    ) -> GenbaPhotoModel | None:
        """Get a single photo by ID."""
        result = await db.execute(
            select(GenbaPhotoModel).where(GenbaPhotoModel.id == photo_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        genba_id: uuid.UUID,
        photo_type: str,
        file_key: str,
        file_name: str,
        file_size: int,
        content_type: str,
        uploaded_by: uuid.UUID | None = None,
        caption: str | None = None,
    ) -> GenbaPhotoModel:
        """Create a new photo metadata record."""
        photo = GenbaPhotoModel(
            genba_id=genba_id,
            photo_type=photo_type,
            file_key=file_key,
            file_name=file_name,
            file_size=file_size,
            content_type=content_type,
            uploaded_by=uploaded_by,
            caption=caption,
        )
        db.add(photo)
        await db.flush()
        return photo

    async def delete(
        self,
        db: AsyncSession,
        photo: GenbaPhotoModel,
    ) -> None:
        """Delete a photo metadata record."""
        await db.delete(photo)
        await db.flush()


# Global repository instance
photo_repository = PhotoRepository()
