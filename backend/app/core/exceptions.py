"""
Genba Management System — Custom HTTP Exceptions.

All error messages returned to users MUST be in Japanese (日本語).
Error codes are in English for programmatic handling.
See BE§5.3 for the error response schema.
"""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


# =============================================================================
# Base Application Exception
# =============================================================================
class AppException(HTTPException):
    """
    Base application exception with structured error response.

    Response format (INT§1.2):
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "日本語エラーメッセージ",
            "details": [{"field": "...", "issue": "..."}]
        }
    }
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[dict] | None = None,
    ) -> None:
        self.code = code
        self.error_message = message
        self.details = details or []
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": self.details,
                }
            },
        )


# =============================================================================
# Authentication Exceptions (401)
# =============================================================================
class UnauthorizedError(AppException):
    """Raised when a request lacks valid authentication credentials."""

    def __init__(self) -> None:
        super().__init__(
            status_code=401,
            code="UNAUTHORIZED",
            message="認証が必要です。ログインしてください",
        )


class InvalidCredentialsError(AppException):
    """Raised when login credentials are incorrect."""

    def __init__(self) -> None:
        super().__init__(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="ユーザー名またはパスワードが正しくありません",
        )


class TokenExpiredError(AppException):
    """Raised when the JWT access token has expired."""

    def __init__(self) -> None:
        super().__init__(
            status_code=401,
            code="TOKEN_EXPIRED",
            message="セッションが期限切れです。再度ログインしてください",
        )


class AccountLockedError(AppException):
    """Raised when account is locked due to too many failed login attempts."""

    def __init__(self, remaining_minutes: int = 15) -> None:
        super().__init__(
            status_code=423,
            code="ACCOUNT_LOCKED",
            message=(
                f"ログイン試行回数が上限を超えました。"
                f"{remaining_minutes}分後に再試行してください"
            ),
        )


# =============================================================================
# Authorization Exceptions (403)
# =============================================================================
class ForbiddenError(AppException):
    """Raised when a user does not have permission for an operation."""

    def __init__(self) -> None:
        super().__init__(
            status_code=403,
            code="FORBIDDEN",
            message="この操作を行う権限がありません",
        )


class InsufficientRoleError(AppException):
    """Raised when user's role is insufficient for a specific action."""

    def __init__(self, required_role: str) -> None:
        super().__init__(
            status_code=403,
            code="INSUFFICIENT_ROLE",
            message=f"この操作には{required_role}以上の権限が必要です",
        )


# =============================================================================
# Not Found Exceptions (404)
# =============================================================================
class NotFoundError(AppException):
    """Raised when a requested resource does not exist."""

    def __init__(self, entity: str = "リソース") -> None:
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{entity}が見つかりません",
        )


# =============================================================================
# Validation Exceptions (422)
# =============================================================================
class ValidationError(AppException):
    """Raised when input data fails business rule validation."""

    def __init__(
        self,
        field: str,
        issue: str,
    ) -> None:
        super().__init__(
            status_code=422,
            code="VALIDATION_ERROR",
            message="入力データに誤りがあります",
            details=[{"field": field, "issue": issue}],
        )


class DuplicateError(AppException):
    """Raised when attempting to create a duplicate resource."""

    def __init__(self, entity: str, field: str = "name") -> None:
        super().__init__(
            status_code=422,
            code="DUPLICATE_ERROR",
            message=f"同じ{entity}がすでに存在します",
            details=[{"field": field, "issue": "重複しています"}],
        )


# =============================================================================
# Business Logic Exceptions (409)
# =============================================================================
class ConflictError(AppException):
    """Raised when an operation conflicts with the current resource state."""

    def __init__(self, message: str) -> None:
        super().__init__(
            status_code=409,
            code="CONFLICT",
            message=message,
        )


class InvalidStatusTransitionError(AppException):
    """Raised when an invalid state transition is attempted."""

    def __init__(self, current: str, target: str) -> None:
        super().__init__(
            status_code=409,
            code="INVALID_STATUS_TRANSITION",
            message=f"ステータス「{current}」から「{target}」への変更はできません",
        )


# =============================================================================
# Server Exceptions (500)
# =============================================================================
class InternalServerError(AppException):
    """Raised for unexpected server-side errors."""

    def __init__(self) -> None:
        super().__init__(
            status_code=500,
            code="INTERNAL_SERVER_ERROR",
            message="サーバーエラーが発生しました。しばらくしてから再試行してください",
        )


class StorageError(AppException):
    """Raised when S3-compatible storage operations fail."""

    def __init__(self) -> None:
        super().__init__(
            status_code=500,
            code="STORAGE_ERROR",
            message="ファイルの保存中にエラーが発生しました",
        )


# =============================================================================
# Exception Handler for FastAPI
# Ensures consistent error response format across all exception types
# =============================================================================
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Global handler for AppException instances."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Fallback handler for unexpected exceptions.
    Returns a generic Japanese error message without exposing internals.
    """
    import logging

    logger = logging.getLogger(__name__)
    logger.exception("Unhandled exception", extra={"path": str(request.url)})

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "サーバーエラーが発生しました。しばらくしてから再試行してください",
                "details": [],
            }
        },
    )
