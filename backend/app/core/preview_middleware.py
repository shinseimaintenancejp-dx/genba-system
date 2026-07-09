from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings

class PreviewModeMiddleware(BaseHTTPMiddleware):
    """
    Middleware that blocks access to specific endpoints when PREVIEW_MODE is enabled.
    Allows only genba, auth, and system/docs endpoints.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
        # Exact paths or prefixes that are allowed
        self.allowed_prefixes = (
            "/api/v1/genba",
            "/api/v1/auth",
            "/docs",
            "/redoc",
            "/api/v1/openapi.json",
            "/openapi.json",
            "/health",
            "/",
        )

    async def dispatch(self, request: Request, call_next):
        if not settings.PREVIEW_MODE:
            return await call_next(request)

        path = request.url.path

        # Check if the path starts with any of the allowed prefixes
        if any(path.startswith(prefix) for prefix in self.allowed_prefixes):
            return await call_next(request)

        # Block everything else with a 503 response in Japanese
        return JSONResponse(
            status_code=503,
            content={"detail": "この機能はプレビュー期間中は利用できません。"},
        )
