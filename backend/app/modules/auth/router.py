"""
Genba Management System — Auth Module: Router (API Endpoints).

Endpoints:
- POST /auth/login    — Authenticate, set httpOnly cookies
- POST /auth/refresh  — Rotate refresh token, issue new cookies
- POST /auth/logout   — Clear cookies, revoke token from Redis
- GET  /auth/me       — Return current user info
"""
from app.core.config import settings as _app_settings

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy import select, func

from app.core.database import get_db_bypass_rls
from app.core.dependencies import CurrentUser, DbSession, get_current_user, require_roles
from app.core.exceptions import UnauthorizedError
from app.core.permissions import Role
from app.core.security import (
    get_access_token_cookie_params,
    get_refresh_token_cookie_params,
)
from app.modules.auth.schemas import (
    CreateUserRequest,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    MeResponse,
    RefreshResponse,
    UpdateUserRequest,
    UserListResponse,
    UserResponse,
)
from app.modules.auth.service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# POST /auth/login
# =============================================================================
@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=200,
    summary="ログイン",
    description="ユーザー名とパスワードでログインし、httpOnly Cookieにトークンを設定します。",
)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
) -> LoginResponse:
    """
    Authenticate a user and set JWT cookies.

    On success:
    - Sets `access_token` httpOnly cookie (15 min)
    - Sets `refresh_token` httpOnly cookie (7 days, path=/api/v1/auth)

    On failure:
    - 401: Invalid credentials (Japanese message)
    - 423: Account locked after 5 failed attempts (Japanese message)
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    async for session in get_db_bypass_rls():
        user, access_token, refresh_token = await auth_service.login(
            session=session,
            username=body.username,
            password=body.password,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Set tokens as httpOnly cookies (SEC§1.4)
        is_prod = not _app_settings.DEBUG
        response.set_cookie(
            value=access_token,
            **get_access_token_cookie_params(is_production=is_prod),
        )
        response.set_cookie(
            value=refresh_token,
            **get_refresh_token_cookie_params(is_production=is_prod),
        )

        return LoginResponse(user=UserResponse.model_validate(user))

    raise UnauthorizedError()  # unreachable but satisfies type checker


# =============================================================================
# POST /auth/refresh
# =============================================================================
@router.post(
    "/refresh",
    response_model=RefreshResponse,
    status_code=200,
    summary="トークン更新",
    description="リフレッシュトークンを使用して新しいアクセストークンを発行します。",
)
async def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
) -> RefreshResponse:
    """
    Rotate refresh token and issue new access token.

    - Old refresh token is immediately invalidated in Redis (rotation)
    - New access and refresh tokens are set as httpOnly cookies
    - Replay attack detection: if old JTI is reused, all sessions are revoked
    """
    if not refresh_token:
        raise UnauthorizedError()

    async for session in get_db_bypass_rls():
        new_access_token, new_refresh_token = await auth_service.refresh_tokens(
            session=session,
            refresh_token=refresh_token,
        )

    from app.core.config import settings
    is_prod = not settings.DEBUG

    response.set_cookie(
        value=new_access_token,
        **get_access_token_cookie_params(is_production=is_prod),
    )
    response.set_cookie(
        value=new_refresh_token,
        **get_refresh_token_cookie_params(is_production=is_prod),
    )

    return RefreshResponse()


# =============================================================================
# POST /auth/logout
# =============================================================================
@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=200,
    summary="ログアウト",
    description="セッションを終了し、Cookieを削除します。",
)
async def logout(
    request: Request,
    response: Response,
    current_user: CurrentUser,
    refresh_token: str | None = Cookie(default=None),
) -> LogoutResponse:
    """
    Logout the current user.

    - Revokes the refresh token from Redis
    - Clears both JWT cookies
    """
    async for session in get_db_bypass_rls():
        ip_address = request.client.host if request.client else None
        await auth_service.logout(
            session=session,
            user_id=current_user["id"],
            refresh_token=refresh_token,
            ip_address=ip_address,
        )

    # Clear cookies by setting them with expired max_age
    from app.core.config import settings
    is_prod = not settings.DEBUG

    cookie_params = get_access_token_cookie_params(is_production=is_prod)
    cookie_params["max_age"] = 0
    response.set_cookie(value="", **cookie_params)

    refresh_cookie_params = get_refresh_token_cookie_params(is_production=is_prod)
    refresh_cookie_params["max_age"] = 0
    response.set_cookie(value="", **refresh_cookie_params)

    return LogoutResponse()


# =============================================================================
# GET /auth/me
# =============================================================================
@router.get(
    "/me",
    response_model=MeResponse,
    status_code=200,
    summary="現在のユーザー情報",
    description="認証済みユーザーの情報を返します。",
)
async def get_me(
    current_user: CurrentUser,
    db: DbSession,
) -> MeResponse:
    """
    Return the current authenticated user's information.

    HIGH-04 Fix: Uses DbSession (with RLS context) instead of get_db_bypass_rls.
    The users_self RLS policy allows reading one's own record via:
    `id::text = current_setting('app.user_id', TRUE)`
    """
    user = await auth_service.get_current_user_model(
        session=db,
        user_id=current_user["id"],
    )
    return MeResponse(user=UserResponse.model_validate(user))


# =============================================================================
# GET /auth/users  — User management (ADMIN only)
# =============================================================================
@router.get(
    "/users",
    response_model=UserListResponse,
    status_code=200,
    summary="ユーザー一覧",
    description="全ユーザーを一覧表示します（管理者専用）。",
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
async def list_users(
    current_user: CurrentUser,
) -> UserListResponse:
    """List all users. ADMIN only."""
    async for session in get_db_bypass_rls():
        from sqlalchemy import select
        from app.modules.auth.models import UserModel
        result = await session.execute(select(UserModel).order_by(UserModel.created_at.desc()))
        users = result.scalars().all()
        return UserListResponse(
            users=[UserResponse.model_validate(u) for u in users],
            total=len(users),
        )
    raise UnauthorizedError()


# =============================================================================
# POST /auth/users  — Create user (ADMIN only)
# =============================================================================
@router.post(
    "/users",
    response_model=UserResponse,
    status_code=201,
    summary="ユーザー作成",
    description="新しいユーザーアカウントを作成します（管理者専用）。",
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
async def create_user(
    body: CreateUserRequest,
    current_user: CurrentUser,
) -> UserResponse:
    """Create a new user account. ADMIN only."""
    async for session in get_db_bypass_rls():
        user = await auth_service.create_user(session=session, data=body)
        await session.commit()
        await session.refresh(user)
        logger.info(
            "User created by admin",
            extra={"created_by": current_user["id"], "new_user": str(user.id)},
        )
        return UserResponse.model_validate(user)
    raise UnauthorizedError()


# =============================================================================
# PATCH /auth/users/{user_id}  — Update user (ADMIN only)
# =============================================================================
@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=200,
    summary="ユーザー情報更新",
    description="ユーザー情報を更新します（管理者専用）。",
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
async def update_user(
    user_id: UUID,
    body: UpdateUserRequest,
    current_user: CurrentUser,
) -> UserResponse:
    """Update user role or active status. ADMIN only."""
    async for session in get_db_bypass_rls():
        from app.modules.auth.models import UserModel
        from sqlalchemy import select, update
        import datetime, pytz
        result = await session.execute(select(UserModel).where(UserModel.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("ユーザー")
        values: dict = {}
        if body.full_name is not None:
            values["full_name"] = body.full_name
        if body.email is not None:
            values["email"] = str(body.email)
        if body.role is not None:
            values["role"] = body.role
        if body.is_active is not None:
            values["is_active"] = body.is_active
        if values:
            values["updated_at"] = datetime.datetime.now(datetime.timezone.utc)
            await session.execute(
                update(UserModel).where(UserModel.id == user_id).values(**values)
            )
        await session.commit()
        await session.refresh(user)
        logger.info(
            "User updated by admin",
            extra={"updated_by": current_user["id"], "target_user": str(user_id)},
        )
        return UserResponse.model_validate(user)
    raise UnauthorizedError()


# =============================================================================
# DELETE /auth/users/{user_id}  — Deactivate user (ADMIN only)
# =============================================================================
@router.delete(
    "/users/{user_id}",
    status_code=204,
    summary="ユーザー無効化",
    description="ユーザーアカウントを無効化します（管理者専用）。",
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
async def deactivate_user(
    user_id: UUID,
    current_user: CurrentUser,
) -> None:
    """Deactivate (soft-delete) a user. ADMIN only."""
    async for session in get_db_bypass_rls():
        from app.modules.auth.repository import user_repository
        await user_repository.deactivate(session, user_id)
        await session.commit()
        logger.info(
            "User deactivated by admin",
            extra={"deactivated_by": current_user["id"], "target_user": str(user_id)},
        )
        return
    raise UnauthorizedError()
