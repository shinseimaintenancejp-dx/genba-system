"""
Genba Management System — Photo Service.

Business logic for photo upload (presigned URL flow), listing, and deletion.
Enforces Partner restriction: WORK_REPORT type only (SEC§2.2).
"""

import json
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import audit_service
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.permissions import Role
from app.core.storage import storage_service
from app.modules.photo.repository import photo_repository
from app.modules.photo.schemas import (
    PhotoConfirmRequest,
    PhotoPresignedUrlRequest,
    PhotoPresignedUrlResponse,
    PhotoResponse,
)

logger = logging.getLogger(__name__)


class PhotoService:
    """Service layer for photo management operations."""

    async def request_upload_url(
        self,
        db: AsyncSession,
        genba_id: str,
        data: PhotoPresignedUrlRequest,
        current_user: dict,
    ) -> PhotoPresignedUrlResponse:
        """
        Validate upload parameters and generate a presigned PUT URL.

        Partner restriction: Only WORK_REPORT type allowed (SEC§2.2).
        """
        # Enforce Partner restriction
        if current_user["role"] == Role.PARTNER:
            if data.photo_type != "WORK_REPORT":
                raise ForbiddenError()

        # Validate file parameters (MIME type, extension, size)
        errors = storage_service.validate_upload_params(
            file_name=data.file_name,
            content_type=data.content_type,
            file_size=data.file_size,
        )
        if errors:
            raise ValidationError(field="file", issue="; ".join(errors))

        # Generate S3 object key
        object_key = storage_service.generate_object_key(
            genba_id=genba_id,
            photo_type=data.photo_type,
            file_name=data.file_name,
        )

        # Generate presigned PUT URL
        upload_url = await storage_service.generate_upload_url(
            object_key=object_key,
            content_type=data.content_type,
        )

        logger.info(
            "Presigned upload URL generated",
            extra={
                "genba_id": genba_id,
                "photo_type": data.photo_type,
                "file_name": data.file_name,
            },
        )

        return PhotoPresignedUrlResponse(
            upload_url=upload_url,
            object_key=object_key,
        )

    async def confirm_upload(
        self,
        db: AsyncSession,
        genba_id: str,
        data: PhotoConfirmRequest,
        current_user: dict,
    ) -> PhotoResponse:
        """
        Confirm a successful upload by saving metadata to the database.
        Called after the client has uploaded directly to S3.
        """
        # Enforce Partner restriction
        if current_user["role"] == Role.PARTNER:
            if data.photo_type != "WORK_REPORT":
                raise ForbiddenError()

        # FIX: Verify that object actually exists in S3 before inserting DB record
        exists = await storage_service.verify_object_exists(data.file_key, data.file_size)
        if not exists:
            raise ValidationError(
                field="file", 
                issue="Tệp tin chưa được tải lên thành công hoặc bị sai kích thước."
            )

        genba_uuid = uuid.UUID(genba_id)
        user_uuid = uuid.UUID(str(current_user["id"]))

        photo = await photo_repository.create(
            db=db,
            genba_id=genba_uuid,
            photo_type=data.photo_type,
            file_key=data.file_key,
            file_name=data.file_name,
            file_size=data.file_size,
            content_type=data.content_type,
            uploaded_by=user_uuid,
            caption=data.caption,
        )

        # Audit log
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="CREATE",
            entity_type="genba_photo",
            entity_id=str(photo.id),
            new_value=json.dumps({
                "photo_type": data.photo_type,
                "file_name": data.file_name,
                "file_size": data.file_size,
            }),
        )

        # Generate download URL for the response
        download_url = await storage_service.generate_download_url(photo.file_key)

        return PhotoResponse(
            id=photo.id,
            genba_id=photo.genba_id,
            photo_type=photo.photo_type,
            file_name=photo.file_name,
            file_size=photo.file_size,
            content_type=photo.content_type,
            caption=photo.caption,
            download_url=download_url,
            uploaded_by=photo.uploaded_by,
            created_at=photo.created_at,
        )

    async def list_photos(
        self,
        db: AsyncSession,
        genba_id: str,
        current_user: dict,
    ) -> list[PhotoResponse]:
        """
        List all photos for a genba with presigned download URLs.
        RLS filters data based on user role.
        """
        genba_uuid = uuid.UUID(genba_id)
        photos = await photo_repository.list_by_genba(db, genba_uuid)

        results: list[PhotoResponse] = []
        for photo in photos:
            download_url = await storage_service.generate_download_url(photo.file_key)
            results.append(
                PhotoResponse(
                    id=photo.id,
                    genba_id=photo.genba_id,
                    photo_type=photo.photo_type,
                    file_name=photo.file_name,
                    file_size=photo.file_size,
                    content_type=photo.content_type,
                    caption=photo.caption,
                    download_url=download_url,
                    uploaded_by=photo.uploaded_by,
                    created_at=photo.created_at,
                )
            )

        return results

    async def delete_photo(
        self,
        db: AsyncSession,
        genba_id: str,
        photo_id: str,
        current_user: dict,
    ) -> None:
        """
        Delete a photo (S3 object + DB record).
        Only Staff/Admin can delete photos.
        """
        # Only Staff/Admin can delete
        if current_user["role"] not in (
            Role.ADMIN,
            Role.SENIOR_STAFF,
            Role.INTERNAL_STAFF,
        ):
            raise ForbiddenError()

        photo_uuid = uuid.UUID(photo_id)
        photo = await photo_repository.get_by_id(db, photo_uuid)

        if not photo:
            raise NotFoundError("写真")

        if str(photo.genba_id) != genba_id:
            raise NotFoundError("写真")

        # Delete from S3 storage
        try:
            await storage_service.delete_object(photo.file_key)
        except Exception:
            logger.warning(
                "Failed to delete S3 object, proceeding with DB deletion",
                extra={"file_key": photo.file_key},
            )

        # Delete from database
        await photo_repository.delete(db, photo)

        # Audit log
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="DELETE",
            entity_type="genba_photo",
            entity_id=photo_id,
            old_value=json.dumps({
                "photo_type": photo.photo_type,
                "file_name": photo.file_name,
            }),
        )

        logger.info(
            "Photo deleted",
            extra={"photo_id": photo_id, "genba_id": genba_id},
        )


# Global service instance
photo_service = PhotoService()
