"""
Genba Management System — Environment Guard.

Blocks dangerous operations (seed data, reset, etc.) in production.
Call block_in_production() at the top of any script that must never run on prod.
"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def block_in_production(operation_name: str) -> None:
    """
    Raise RuntimeError if the current environment is production.

    Use this at the entry point of seed scripts, fixture loaders, or
    any operation that could corrupt or overwrite real production data.

    Args:
        operation_name: Human-readable name of the blocked operation.

    Raises:
        RuntimeError: Always raised when ENVIRONMENT=production.
    """
    if settings.ENVIRONMENT == "production":
        raise RuntimeError(
            f"\n"
            f"  ╔══════════════════════════════════════════════════════╗\n"
            f"  ║  BLOCKED: '{operation_name}'                        ║\n"
            f"  ║  This operation is forbidden in ENVIRONMENT=production ║\n"
            f"  ║  Run this script in the development environment only.  ║\n"
            f"  ╚══════════════════════════════════════════════════════╝\n"
        )
    logger.warning(
        "Dangerous operation allowed in non-production environment.",
        extra={"operation": operation_name, "environment": settings.ENVIRONMENT},
    )
