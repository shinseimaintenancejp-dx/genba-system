"""
Genba Management System — FastAPI Application Entry Point.

Configures:
- Lifespan events (startup/shutdown)
- Middleware (CORS, request logging)
- Exception handlers
- Router registration
- OpenAPI documentation

ARCH-03 Fix: All imports moved to top of file.
ARCH-04 Fix: StaticFiles('/uploads') mount removed — use S3 presigned URLs instead.
"""

import logging
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import check_database_connection
from app.core.exceptions import AppException, app_exception_handler, generic_exception_handler
from app.core.redis import close_redis, get_redis

# --- Routers (ARCH-03: all imports at top) ---
from app.modules.auth.router import router as auth_router
from app.modules.contract.router import router as contract_router
from app.modules.customer.router import router as customer_router
from app.modules.genba.router import router as genba_router
from app.modules.invoice.auto_generator import generate_monthly_invoices
from app.modules.invoice.router import router as invoice_router
from app.modules.key_management.router import router as key_management_router
from app.modules.manual.router import router as manual_router
from app.modules.partner.router import router as partner_router
from app.modules.photo.router import router as photo_router
from app.modules.quotation.router import router as quotation_router
from app.modules.schedule.router import router as schedule_router
from app.modules.staff.router import router as staff_router
from app.modules.worker.router import router as worker_router

# --- Force-load all SQLAlchemy models so relationships resolve ---
from app.core.approval import ApprovalRequestModel  # noqa: F401
from app.core.audit import AuditLogModel  # noqa: F401
from app.modules.auth.models import UserModel  # noqa: F401
from app.modules.contract.models import ContractModel  # noqa: F401
from app.modules.customer.models import CustomerModel  # noqa: F401
from app.modules.genba.models import GenbaModel, GenbaStaffAssignmentModel, GenbaWorkerModel  # noqa: F401
from app.modules.invoice.models import InvoiceModel  # noqa: F401
from app.modules.key_management.models import KeyInfoModel  # noqa: F401
from app.modules.manual.models import (  # noqa: F401
    CleaningAreaModel,
    DailyCleaningTaskModel,
    EntryExitInstructionModel,
    MemoAttachmentModel,
    MemoModel,
)
from app.modules.partner.models import PartnerCompanyModel  # noqa: F401
from app.modules.photo.models import GenbaPhotoModel  # noqa: F401
from app.modules.quotation.models import QuotationItemModel, QuotationModel  # noqa: F401
from app.modules.schedule.models import (  # noqa: F401
    CleaningWorkStandardModel,
    GenbaCustomHolidayModel,
    GenbaEquipmentModel,
    PeriodicCleaningDetailModel,
    PeriodicCleaningPlanModel,
    WorkScheduleModel,
)
from app.modules.staff.models import StaffModel  # noqa: F401
from app.modules.worker.models import WorkerModel  # noqa: F401


# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# =============================================================================
# Application Lifespan (startup / shutdown events)
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifecycle:
    - Startup: Verify database and Redis connectivity
    - Shutdown: Gracefully close resources
    """
    # --- Startup ---
    logger.info("Starting Genba Management System API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    # Verify database connection on startup
    db_ok = await check_database_connection()
    if not db_ok:
        logger.error("Database connection failed on startup!")
        raise RuntimeError("Cannot connect to database")

    logger.info("Database connection verified ✓")

    # Initialize Redis connection
    await get_redis()
    logger.info("Redis connection verified ✓")

    logger.info("Application startup complete ✓")

    # Start APScheduler for invoice auto-generation (1st of each month at 01:00 JST)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(generate_monthly_invoices, "cron", day=1, hour=1, minute=0)
    scheduler.start()
    logger.info("APScheduler started (invoice auto-generator)")

    yield

    # --- Shutdown ---
    logger.info("Shutting down Genba Management System API...")
    scheduler.shutdown()
    await close_redis()
    logger.info("Application shutdown complete ✓")


# =============================================================================
# FastAPI Application
# =============================================================================
app = FastAPI(
    title="Genba Management System API",
    description=(
        "現場管理システム API — Shinsei Co., Ltd.\n\n"
        "Manages 359+ genba (worksites) with integrated customer, partner, "
        "staff, contract, invoice, and key management."
    ),
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)


# =============================================================================
# Middleware
# =============================================================================

from app.core.feature_middleware import FeatureMiddleware

# CORS — allow frontend to communicate (INT§7)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,     # Required for httpOnly cookie auth
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Feature Middleware — controls which modules are accessible (ENABLED_MODULES)
app.add_middleware(FeatureMiddleware)

# Gzip compression for response body
app.add_middleware(GZipMiddleware, minimum_size=1000)


# =============================================================================
# Exception Handlers
# =============================================================================
app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_exception_handler)  # type: ignore[arg-type]


# =============================================================================
# Routes
# =============================================================================

# Health check — always available, no auth required
@app.get("/health", tags=["System"])
async def health_check() -> dict:
    """
    System health check endpoint.
    Returns database connectivity status.
    """
    db_ok = await check_database_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "disconnected",
    }


@app.get("/", tags=["System"])
async def root() -> dict:
    """Root endpoint — returns basic API information."""
    return {
        "name": "Genba Management System API",
        "version": "1.0.0",
        "docs": "/docs",
    }


# =============================================================================
# Module Router Registration
# All routers use /api/v1 prefix (INT§1.1)
#
# Sprint 2:  ✅ auth_router         → /api/v1/auth
# Sprint 3:  ✅ genba_router        → /api/v1/genba
# Sprint 3:  ✅ customer_router     → /api/v1/customers
# Sprint 4:  ✅ staff_router        → /api/v1/staff
# Sprint 4:  ✅ worker_router       → /api/v1/workers
# Sprint 5:  ✅ partner_router      → /api/v1/partners
# Sprint 5:  ✅ contract_router     → /api/v1/contracts
# Sprint 6:  ✅ manual_router       → /api/v1/genba (manuals)
# Sprint 7:  ✅ schedule_router     → /api/v1/genba (schedules)
# Sprint 8:  ✅ key_router          → /api/v1/genba (keys)
# Sprint 8:  ✅ photo_router        → /api/v1/genba (photos)
# Sprint 9:  ✅ invoice_router      → /api/v1/invoices
# Sprint 9:  ✅ quotation_router    → /api/v1/genba (quotations)
# Sprint 10: Security hardening — no new routers
# =============================================================================

# Sprint 2 — Authentication
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])

# Sprint 6 — Manuals Part 1 (Entry/Exit, Daily, Memo)
# Included before genba_router so that specific paths like /genba/areas take precedence over /genba/{id}
app.include_router(manual_router, prefix="/api/v1/genba", tags=["Manual Management"])

# Sprint 3 — Genba & Customer Core
app.include_router(genba_router, prefix="/api/v1/genba", tags=["Genba Management"])
app.include_router(customer_router, prefix="/api/v1/customers", tags=["Customer Management"])

# Sprint 4 — Staff & Worker Management
app.include_router(staff_router, prefix="/api/v1/staff", tags=["Staff Management"])
app.include_router(worker_router, prefix="/api/v1/workers", tags=["Worker Management"])

# Sprint 5 — Partner & Contract Management
app.include_router(partner_router, prefix="/api/v1/partners", tags=["Partner Management"])
app.include_router(contract_router, prefix="/api/v1/contracts", tags=["Contract Management"])


# Sprint 7 — Schedules, Equipment, Standards, Periodic Plans
app.include_router(schedule_router, prefix="/api/v1/genba", tags=["Schedule Management"])

# Sprint 8 — Security (pgcrypto Key Management) & S3 Storage (Photos)
app.include_router(key_management_router, prefix="/api/v1/genba", tags=["Key Management"])
app.include_router(photo_router, prefix="/api/v1/genba", tags=["Photo Management"])

# Sprint 9 — Finance & Approval (Quotations, Invoices)
app.include_router(quotation_router, prefix="/api/v1/genba", tags=["Quotation Management"])
app.include_router(invoice_router, prefix="/api/v1/invoices", tags=["Invoice Management"])

from fastapi.exceptions import RequestValidationError
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    import logging
    logger = logging.getLogger(__name__)
    body = await request.body()
    logger.error(f"Validation Error: {exc.errors()}")
    logger.error(f"Body: {body.decode()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
