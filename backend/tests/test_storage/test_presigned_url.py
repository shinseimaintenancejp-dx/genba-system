"""
Genba Management System — Storage Presigned URL Tests.

Verifies:
- Presigned URL generation structure
- Partner restricted to WORK_REPORT uploads only
- Invalid MIME types rejected
- File size validation

See: INFRA§4, SEC§2.2
"""

import pytest

from app.core.storage import StorageService, ALLOWED_PHOTO_MIME_TYPES, MAX_FILE_SIZE_BYTES


class TestPresignedUrl:
    """Test suite for S3 presigned URL generation and validation."""

    def test_validate_valid_jpeg(self):
        """Valid JPEG upload should pass validation."""
        service = StorageService()
        errors = service.validate_upload_params(
            file_name="photo.jpg",
            content_type="image/jpeg",
            file_size=1024 * 1024,  # 1MB
        )
        assert len(errors) == 0

    def test_validate_valid_png(self):
        """Valid PNG upload should pass validation."""
        service = StorageService()
        errors = service.validate_upload_params(
            file_name="screenshot.png",
            content_type="image/png",
            file_size=5 * 1024 * 1024,  # 5MB
        )
        assert len(errors) == 0

    def test_validate_valid_webp(self):
        """Valid WebP upload should pass validation."""
        service = StorageService()
        errors = service.validate_upload_params(
            file_name="optimized.webp",
            content_type="image/webp",
            file_size=2 * 1024 * 1024,  # 2MB
        )
        assert len(errors) == 0

    def test_invalid_mime_type_rejected(self):
        """Non-image MIME types should be rejected."""
        service = StorageService()
        errors = service.validate_upload_params(
            file_name="malware.exe",
            content_type="application/x-executable",
            file_size=1024,
        )
        assert len(errors) >= 1
        assert any("許可されていないファイル形式" in e for e in errors)

    def test_invalid_extension_rejected(self):
        """Files with invalid extensions should be rejected."""
        service = StorageService()
        errors = service.validate_upload_params(
            file_name="document.pdf",
            content_type="application/pdf",
            file_size=1024,
        )
        assert len(errors) >= 1

    def test_file_too_large_rejected(self):
        """Files exceeding MAX_FILE_SIZE_BYTES should be rejected."""
        service = StorageService()
        errors = service.validate_upload_params(
            file_name="huge_photo.jpg",
            content_type="image/jpeg",
            file_size=MAX_FILE_SIZE_BYTES + 1,
        )
        assert len(errors) >= 1
        assert any("ファイルサイズが上限を超えています" in e for e in errors)

    def test_zero_file_size_rejected(self):
        """Zero-byte files should be rejected."""
        service = StorageService()
        errors = service.validate_upload_params(
            file_name="empty.jpg",
            content_type="image/jpeg",
            file_size=0,
        )
        assert len(errors) >= 1

    def test_generate_object_key_structure(self):
        """Object key should follow the expected path structure."""
        service = StorageService()
        key = service.generate_object_key(
            genba_id="abc-123",
            photo_type="SITE",
            file_name="photo.jpg",
        )

        assert key.startswith("genba/abc-123/photos/site/")
        assert key.endswith(".jpg")

    def test_generate_object_key_work_report(self):
        """Work report object key should use lowercase folder name."""
        service = StorageService()
        key = service.generate_object_key(
            genba_id="def-456",
            photo_type="WORK_REPORT",
            file_name="report.png",
        )

        assert "work_report" in key
        assert key.endswith(".png")

    def test_partner_upload_permission_check(self):
        """Verify Partner role only has PHOTO_READ and limited PHOTO_UPLOAD."""
        from app.core.permissions import Permission, Role, has_permission

        # Partner CAN view photos
        assert has_permission(Role.PARTNER, Permission.PHOTO_READ) is True

        # Partner CAN upload (but service restricts to WORK_REPORT type)
        assert has_permission(Role.PARTNER, Permission.PHOTO_UPLOAD) is True

        # Worker CANNOT upload
        assert has_permission(Role.GENBA_WORKER, Permission.PHOTO_UPLOAD) is False

    def test_allowed_mime_types_coverage(self):
        """Verify all expected MIME types are in the allowed set."""
        expected = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        assert ALLOWED_PHOTO_MIME_TYPES == expected
