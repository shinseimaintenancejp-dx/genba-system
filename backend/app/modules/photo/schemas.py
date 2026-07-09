"""
Genba Management System — Photo Pydantic Schemas.

Request/response DTOs for photo upload (presigned URL flow) and listing.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    """Base schema with standard configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
    )


class PhotoType(StrEnum):
    """Valid photo types."""

    SITE = "SITE"
    WORK_REPORT = "WORK_REPORT"


# =============================================================================
# Request Schemas
# =============================================================================


class PhotoPresignedUrlRequest(BaseSchema):
    """Request a presigned URL for uploading a photo."""

    file_name: str = Field(..., max_length=255, description="Original file name")
    content_type: str = Field(..., max_length=100, description="MIME type")
    file_size: int = Field(..., gt=0, description="File size in bytes")
    photo_type: PhotoType = Field(..., description="Photo type: SITE or WORK_REPORT")


class PhotoConfirmRequest(BaseSchema):
    """Confirm a successful upload — save metadata to DB."""

    file_key: str = Field(..., max_length=500, description="S3 object key")
    file_name: str = Field(..., max_length=255, description="Original file name")
    file_size: int = Field(..., gt=0, description="File size in bytes")
    content_type: str = Field(..., max_length=100, description="MIME type")
    photo_type: PhotoType = Field(..., description="Photo type: SITE or WORK_REPORT")
    caption: str | None = Field(None, max_length=500, description="Photo caption")


# =============================================================================
# Response Schemas
# =============================================================================


class PhotoPresignedUrlResponse(BaseSchema):
    """Response containing the presigned upload URL and object key."""

    upload_url: str = Field(description="Presigned PUT URL for direct upload")
    object_key: str = Field(description="S3 object key to use in confirm step")


class PhotoResponse(BaseSchema):
    """Photo metadata response with presigned download URL."""

    id: UUID
    genba_id: UUID
    photo_type: str
    file_name: str
    file_size: int
    content_type: str
    caption: str | None
    download_url: str = Field(description="Presigned GET URL for viewing")
    uploaded_by: UUID | None
    created_at: datetime
