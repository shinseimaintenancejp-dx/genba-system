"""
Genba Management System — Audit Log Service.

Records all CREATE/UPDATE/DELETE/VIEW actions for compliance.
Sensitive access (key decryption) is flagged with is_sensitive=True.

CRITICAL: Never log decrypted key values (SEC§4.2).
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

logger = logging.getLogger(__name__)


# =============================================================================
# Audit Log Model
# =============================================================================
class AuditLogModel(Base):
    """Immutable audit log — records every significant action in the system."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,  # Allow null for system-generated events
    )
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # CREATE/UPDATE/DELETE/VIEW
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'genba', 'key_info'
    entity_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string (sanitized)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string (sanitized)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)  # Flagged for security review
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv4/IPv6
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"AuditLog(id={self.id}, user_id={self.user_id}, "
            f"action={self.action}, entity_type={self.entity_type})"
        )


# =============================================================================
# Audit Service
# =============================================================================
class AuditService:
    """
    Records audit log entries for compliance and security monitoring.

    Usage:
        audit_service = AuditService()
        await audit_service.log(
            session=db,
            user_id=str(current_user["id"]),
            action="VIEW",
            entity_type="key_info",
            entity_id=genba_id,
            is_sensitive=True,  # CRITICAL for key access
        )
    """

    async def log(
        self,
        session: AsyncSession,
        action: str,
        entity_type: str,
        user_id: str | None = None,
        entity_id: str | None = None,
        old_value: str | None = None,
        new_value: str | None = None,
        is_sensitive: bool = False,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLogModel:
        """
        Create an audit log entry.

        CRITICAL: Never pass plaintext key codes or passwords in old_value/new_value.
        For sensitive operations, only log WHO accessed, not WHAT they accessed.

        Args:
            session: Active async database session
            action: One of CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT
            entity_type: Resource type (e.g., 'genba', 'user', 'key_info')
            user_id: UUID of the acting user (None for system events)
            entity_id: UUID of the affected resource
            old_value: JSON string of previous state (sanitized — no secrets)
            new_value: JSON string of new state (sanitized — no secrets)
            is_sensitive: True for key decryption events (SEC§4.3)
            ip_address: Client IP address
            user_agent: Client user agent string

        Returns:
            The created AuditLogModel instance
        """
        entry = AuditLogModel(
            user_id=uuid.UUID(user_id) if user_id else None,
            action=action,
            entity_type=entity_type,
            entity_id=uuid.UUID(entity_id) if entity_id else None,
            old_value=old_value,
            new_value=new_value,
            is_sensitive=is_sensitive,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        session.add(entry)

        if is_sensitive:
            logger.info(
                "Sensitive data accessed",
                extra={
                    "user_id": user_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action": action,
                    # NEVER log the actual sensitive value
                },
            )

        return entry

    async def log_login(
        self,
        session: AsyncSession,
        user_id: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLogModel:
        """Convenience method for logging successful login events."""
        return await self.log(
            session=session,
            user_id=user_id,
            action="LOGIN",
            entity_type="user",
            entity_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def log_logout(
        self,
        session: AsyncSession,
        user_id: str,
        ip_address: str | None = None,
    ) -> AuditLogModel:
        """Convenience method for logging logout events."""
        return await self.log(
            session=session,
            user_id=user_id,
            action="LOGOUT",
            entity_type="user",
            entity_id=user_id,
            ip_address=ip_address,
        )


# Global audit service instance
audit_service = AuditService()
