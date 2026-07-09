"""
Genba Management System — S3-Compatible Storage Service.

Cloud-agnostic file storage using boto3 with presigned URLs.
Supports: Cloudflare R2, Wasabi, MinIO, or any S3-compatible provider.

See: INFRA§4, SEC§5.1
"""

import logging
import os
import uuid
from datetime import datetime, timezone

import boto3
from fastapi.concurrency import run_in_threadpool
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Allowed MIME types for photo uploads
ALLOWED_PHOTO_MIME_TYPES: set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

# Allowed file extensions (matched against file_name)
ALLOWED_PHOTO_EXTENSIONS: set[str] = {
    ".jpg", ".jpeg", ".png", ".webp", ".gif",
}

# Maximum file size in bytes (10 MB)
MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024

# Presigned URL expiry durations in seconds
PRESIGNED_PUT_EXPIRY: int = 600      # 10 minutes (INFRA§4.3)
PRESIGNED_GET_EXPIRY: int = 3600     # 1 hour (INFRA§4.3)


class StorageService:
    """
    S3-Compatible storage service for file uploads and downloads.

    Uses presigned URLs to allow direct client uploads without passing
    files through the backend server. Cloud-agnostic — works with any
    S3-compatible provider (INFRA§4.4).
    """

    def __init__(self) -> None:
        """Initialize the S3 client with environment-based configuration."""
        self._client = None

    @property
    def client(self) -> boto3.client:
        """Lazily initialize and return the S3 client."""
        if self._client is None:
            if not settings.STORAGE_ENDPOINT:
                logger.warning(
                    "STORAGE_ENDPOINT not configured — storage operations will fail"
                )
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.STORAGE_ENDPOINT or None,
                aws_access_key_id=settings.STORAGE_ACCESS_KEY or None,
                aws_secret_access_key=settings.STORAGE_SECRET_KEY or None,
                region_name=settings.STORAGE_REGION,
                config=Config(signature_version="s3v4"),
            )
        return self._client

    def validate_upload_params(
        self,
        file_name: str,
        content_type: str,
        file_size: int,
    ) -> list[str]:
        """
        Validate file upload parameters before generating a presigned URL.

        Args:
            file_name: Original file name
            content_type: MIME type
            file_size: File size in bytes

        Returns:
            List of validation error messages (empty if valid)
        """
        errors: list[str] = []

        # Check MIME type
        if content_type not in ALLOWED_PHOTO_MIME_TYPES:
            errors.append(
                f"許可されていないファイル形式です: {content_type}。"
                f"使用可能: {', '.join(sorted(ALLOWED_PHOTO_MIME_TYPES))}"
            )

        # Check file extension
        ext = ""
        if "." in file_name:
            ext = "." + file_name.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_PHOTO_EXTENSIONS:
            errors.append(
                f"許可されていないファイル拡張子です: {ext}。"
                f"使用可能: {', '.join(sorted(ALLOWED_PHOTO_EXTENSIONS))}"
            )

        # Check file size
        if file_size > MAX_FILE_SIZE_BYTES:
            max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
            errors.append(
                f"ファイルサイズが上限を超えています: {file_size / (1024 * 1024):.1f}MB。"
                f"最大: {max_mb:.0f}MB"
            )

        if file_size <= 0:
            errors.append("ファイルサイズが無効です。")

        return errors

    def generate_object_key(
        self,
        genba_id: str,
        photo_type: str,
        file_name: str,
    ) -> str:
        """
        Generate a unique S3 object key following the bucket path structure.

        Path format: genba/{genba_id}/photos/{photo_type}/{uuid}_{filename}
        See: INFRA§4.2

        Args:
            genba_id: UUID of the genba
            photo_type: 'site' or 'work_report'
            file_name: Original file name

        Returns:
            S3 object key string
        """
        unique_id = uuid.uuid4().hex[:12]
        # FIX: Path traversal and safe naming
        safe_base = os.path.basename(file_name)
        ext = os.path.splitext(safe_base)[1].lower()
        folder = photo_type.lower()
        return f"genba/{genba_id}/photos/{folder}/{unique_id}{ext}"

    async def generate_upload_url(
        self,
        object_key: str,
        content_type: str,
    ) -> str:
        """
        Generate a presigned PUT URL for direct client upload.

        Args:
            object_key: S3 object key
            content_type: MIME type of the file

        Returns:
            Presigned PUT URL (valid for 10 minutes)
        """
        try:
            url = await run_in_threadpool(
                self.client.generate_presigned_url,
                ClientMethod="put_object",
                Params={
                    "Bucket": settings.STORAGE_BUCKET_NAME,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=PRESIGNED_PUT_EXPIRY,
            )
            logger.debug(
                "Presigned PUT URL generated",
                extra={"object_key": object_key},
            )
            return url
        except ClientError:
            logger.exception("Failed to generate presigned PUT URL")
            raise

    async def generate_download_url(self, object_key: str) -> str:
        """
        Generate a presigned GET URL for viewing/downloading a file.

        Args:
            object_key: S3 object key

        Returns:
            Presigned GET URL (valid for 1 hour)
        """
        try:
            url = await run_in_threadpool(
                self.client.generate_presigned_url,
                ClientMethod="get_object",
                Params={
                    "Bucket": settings.STORAGE_BUCKET_NAME,
                    "Key": object_key,
                },
                ExpiresIn=PRESIGNED_GET_EXPIRY,
            )
            return url
        except ClientError:
            logger.exception("Failed to generate presigned GET URL")
            raise

    async def delete_object(self, object_key: str) -> bool:
        """
        Delete an object from S3 storage.

        Args:
            object_key: S3 object key to delete

        Returns:
            True if deletion was successful
        """
        try:
            await run_in_threadpool(
                self.client.delete_object,
                Bucket=settings.STORAGE_BUCKET_NAME,
                Key=object_key,
            )
            logger.info(
                "S3 object deleted",
                extra={"object_key": object_key},
            )
            return True
        except ClientError:
            logger.exception("Failed to delete S3 object")
            raise

    async def verify_object_exists(self, object_key: str, expected_size: int) -> bool:
        """
        Verify that an object exists in S3 and matches expected size.
        Uses head_object to fetch metadata quickly without downloading the file.

        Args:
            object_key: S3 object key to verify
            expected_size: Expected file size in bytes
        """
        try:
            response = await run_in_threadpool(
                self.client.head_object,
                Bucket=settings.STORAGE_BUCKET_NAME,
                Key=object_key,
            )
            if response.get("ContentLength") != expected_size:
                logger.warning(
                    "S3 object size mismatch",
                    extra={"object_key": object_key, "expected": expected_size, "actual": response.get("ContentLength")}
                )
                return False
            return True
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "404":
                return False
            logger.exception("Failed to verify S3 object")
            raise


# Global storage service instance
storage_service = StorageService()
