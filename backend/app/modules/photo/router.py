"""
Genba Management System — Photo Router.

API endpoints for photo upload (presigned URL flow), listing, and deletion.
Permissions: PHOTO_READ for viewing, PHOTO_UPLOAD for uploading (SEC§2.2).

Upload Flow:
1. Client → POST /photos/presigned-url → get presigned PUT URL
2. Client → PUT directly to S3 URL → upload file
3. Client → POST /photos/confirm → save metadata to DB
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_permission
from app.core.permissions import Permission
from app.modules.photo.schemas import (
    PhotoConfirmRequest,
    PhotoPresignedUrlRequest,
)
from app.modules.photo.service import photo_service

router = APIRouter()


# =============================================================================
# List Photos
# =============================================================================
@router.get(
    "/{genba_id}/photos",
    response_model=dict,
    dependencies=[Depends(require_permission(Permission.PHOTO_READ))],
)
async def list_photos(
    genba_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """List all photos for a genba with presigned download URLs."""
    photos = await photo_service.list_photos(db, genba_id, current_user)
    return {"data": [p.model_dump() for p in photos]}


# =============================================================================
# Request Presigned Upload URL
# =============================================================================
@router.post(
    "/{genba_id}/photos/presigned-url",
    response_model=dict,
    dependencies=[Depends(require_permission(Permission.PHOTO_UPLOAD))],
)
async def request_upload_url(
    genba_id: str,
    data: PhotoPresignedUrlRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Generate a presigned PUT URL for direct S3 upload.
    Partner users are restricted to WORK_REPORT photo type only.
    """
    result = await photo_service.request_upload_url(
        db, genba_id, data, current_user
    )
    return {"data": result.model_dump()}


# =============================================================================
# Confirm Upload
# =============================================================================
@router.post(
    "/{genba_id}/photos/confirm",
    response_model=dict,
    status_code=201,
    dependencies=[Depends(require_permission(Permission.PHOTO_UPLOAD))],
)
async def confirm_upload(
    genba_id: str,
    data: PhotoConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Confirm a successful upload — save metadata to database.
    Called after the client has uploaded the file directly to S3.
    """
    photo = await photo_service.confirm_upload(db, genba_id, data, current_user)
    return {"data": photo.model_dump()}


# =============================================================================
# Delete Photo
# =============================================================================
@router.delete(
    "/{genba_id}/photos/{photo_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(Permission.PHOTO_UPLOAD))],
)
async def delete_photo(
    genba_id: str,
    photo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Delete a photo (S3 object + DB record). Staff/Admin only."""
    await photo_service.delete_photo(db, genba_id, photo_id, current_user)
    return {"data": {"message": "写真を削除しました"}}
