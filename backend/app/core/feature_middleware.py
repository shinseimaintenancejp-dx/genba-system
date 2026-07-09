"""
Genba Management System — Feature Module Middleware.

Controls which API modules are accessible based on the ENABLED_MODULES env var.

Usage (in .env):
    ENABLED_MODULES=all                  # All modules enabled (development)
    ENABLED_MODULES=genba                # Only genba module (initial production)
    ENABLED_MODULES=genba,customers      # Genba + customers enabled
"""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings

logger = logging.getLogger(__name__)

# Map from URL path prefix → module name used in ENABLED_MODULES
_PATH_MODULE_MAP: dict[str, str] = {
    "/api/v1/customers": "customers",
    "/api/v1/contracts": "contracts",
    "/api/v1/invoices": "invoices",
    "/api/v1/partners": "partners",
    "/api/v1/staff": "staff",
    "/api/v1/workers": "workers",
    # genba is always allowed (core module)
    # auth/health/docs are always allowed (system routes)
}

# Routes that are always accessible regardless of ENABLED_MODULES
_ALWAYS_ALLOWED_PREFIXES: tuple[str, ...] = (
    "/api/v1/genba",
    "/api/v1/auth",
    "/api/v1/users",   # User management — ADMIN only, always accessible
    "/api/v1/openapi.json",
    "/openapi.json",
    "/docs",
    "/redoc",
    "/health",
    "/",
)


def _get_enabled_modules() -> set[str] | None:
    """
    Parse ENABLED_MODULES from settings.

    Returns:
        None if 'all' (middleware is disabled),
        set of module names otherwise.
    """
    raw = settings.ENABLED_MODULES.strip().lower()
    if raw == "all":
        return None  # Signal to allow everything
    return {m.strip() for m in raw.split(",") if m.strip()}


class FeatureMiddleware(BaseHTTPMiddleware):
    """
    Middleware that restricts API access based on ENABLED_MODULES config.

    When ENABLED_MODULES=all: completely disabled — no overhead.
    Otherwise: blocks requests to modules not listed, returns 403.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        enabled = _get_enabled_modules()

        # If all modules are enabled, pass through immediately
        if enabled is None:
            return await call_next(request)

        path = request.url.path

        # Always-allowed system routes
        if any(path.startswith(prefix) for prefix in _ALWAYS_ALLOWED_PREFIXES):
            return await call_next(request)

        # Determine which module this path belongs to
        for path_prefix, module_name in _PATH_MODULE_MAP.items():
            if path.startswith(path_prefix):
                if module_name in enabled:
                    return await call_next(request)
                # Module found but not enabled
                logger.info(
                    "Feature access blocked",
                    extra={"path": path, "module": module_name, "enabled": enabled},
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"この機能は現在利用できません。（モジュール: {module_name}）"},
                )

        # Path not in the module map — allow by default (e.g., unknown routes)
        return await call_next(request)
