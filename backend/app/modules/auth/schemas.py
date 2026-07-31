"""
Genba Management System — Auth Module: Pydantic Schemas.

Request/Response DTOs for authentication endpoints.
All schemas use strict mode per BE§5.1.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# =============================================================================
# Base Schema
# =============================================================================
class BaseSchema(BaseModel):
    """Base schema with common configuration per BE§5.1."""

    model_config = ConfigDict(
        from_attributes=True,      # ORM mode for SQLAlchemy models
        str_strip_whitespace=True,  # Auto-strip whitespace
        strict=True,                # Strict type coercion
    )


# =============================================================================
# Request Schemas
# =============================================================================
class LoginRequest(BaseSchema):
    """Request body for POST /auth/login."""

    username: str = Field(min_length=1, max_length=100, description="ユーザー名")
    password: str = Field(min_length=1, max_length=200, description="パスワード")


class ChangePasswordRequest(BaseSchema):
    """Request body for POST /auth/change-password."""

    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Enforce minimum password complexity."""
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上にしてください")
        return v


class CreateUserRequest(BaseSchema):
    """Request body for POST /users (ADMIN only)."""

    username: str = Field(min_length=3, max_length=100)
    email: EmailStr | None = None
    last_name: str = Field(min_length=1, max_length=100)
    first_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    password: str = Field(min_length=8, max_length=200)
    is_active: bool = Field(default=True)
    role: str = Field(default="INTERNAL_STAFF")
    related_entity_id: UUID | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Ensure role is one of the 6 valid roles."""
        valid_roles = {
            "ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF",
            "GENBA_WORKER", "PARTNER", "CUSTOMER",
        }
        if v not in valid_roles:
            raise ValueError(f"無効なロールです: {v}")
        return v


# =============================================================================
# Response Schemas
# =============================================================================
class UserResponse(BaseSchema):
    """Public user information returned in API responses."""

    id: UUID
    username: str
    email: str | None
    last_name: str
    first_name: str
    phone: str | None
    role: str
    related_entity_id: UUID | None
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class LoginResponse(BaseSchema):
    """Response for successful login — user info only, tokens are in cookies."""

    user: UserResponse
    message: str = "ログインに成功しました"


class LogoutResponse(BaseSchema):
    """Response for successful logout."""

    message: str = "ログアウトしました"


class RefreshResponse(BaseSchema):
    """Response for successful token refresh."""

    message: str = "トークンを更新しました"


class MeResponse(BaseSchema):
    """Response for GET /auth/me — current user info."""

    user: UserResponse


class UserListResponse(BaseSchema):
    """Response for GET /auth/users — paginated user list."""

    users: list[UserResponse]
    total: int


class UpdateUserRequest(BaseSchema):
    """Request body for PATCH /auth/users/{user_id} (ADMIN only)."""

    last_name: str | None = Field(default=None, max_length=100)
    first_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    password: str | None = Field(default=None, min_length=8, max_length=200)
    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is None:
            return v
        valid_roles = {
            "ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF",
            "GENBA_WORKER", "PARTNER", "CUSTOMER",
        }
        if v not in valid_roles:
            raise ValueError(f"無効なロールです: {v}")
        return v
