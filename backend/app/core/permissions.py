"""
Genba Management System — RBAC Permission System.

Defines:
- Role enum (6 roles per SEC§2.1)
- Permission enum
- ROLE_PERMISSIONS mapping (SEC§2.2)
"""

from enum import StrEnum


# =============================================================================
# Role Definitions (SEC§2.1)
# =============================================================================
class Role(StrEnum):
    """User roles in the Genba Management System."""

    ADMIN = "ADMIN"                      # システム管理者 — Full access
    SENIOR_STAFF = "SENIOR_STAFF"        # 管理職 — View all, approve
    INTERNAL_STAFF = "INTERNAL_STAFF"    # 社内担当者 — CRUD operations
    GENBA_WORKER = "GENBA_WORKER"        # 現場員 — View assigned genba only
    PARTNER = "PARTNER"                  # 協力会社 — View contracted genba only
    CUSTOMER = "CUSTOMER"                # 取引先 — Placeholder (future)


# =============================================================================
# Permission Definitions
# =============================================================================
class Permission(StrEnum):
    """Fine-grained permissions used in the permission decorator."""

    # Genba
    GENBA_READ = "genba:read"
    GENBA_WRITE = "genba:write"

    # Customers
    CUSTOMER_READ = "customer:read"
    CUSTOMER_WRITE = "customer:write"

    # Partners
    PARTNER_READ = "partner:read"
    PARTNER_WRITE = "partner:write"

    # Contracts
    CONTRACT_READ = "contract:read"
    CONTRACT_WRITE = "contract:write"

    # Staff & Workers
    STAFF_READ = "staff:read"
    STAFF_WRITE = "staff:write"
    WORKER_READ = "worker:read"
    WORKER_WRITE = "worker:write"

    # Keys (sensitive)
    KEY_READ = "key:read"
    KEY_WRITE = "key:write"
    KEY_DECRYPT = "key:decrypt"

    # Manuals
    MANUAL_READ = "manual:read"
    MANUAL_WRITE = "manual:write"

    # Photos
    PHOTO_READ = "photo:read"
    PHOTO_UPLOAD = "photo:upload"

    # Financial
    INVOICE_READ = "invoice:read"
    INVOICE_WRITE = "invoice:write"
    QUOTATION_READ = "quotation:read"
    QUOTATION_WRITE = "quotation:write"

    # Approvals
    APPROVAL_READ = "approval:read"
    APPROVAL_SUBMIT = "approval:submit"
    APPROVAL_APPROVE = "approval:approve"

    # User Management (ADMIN only)
    USER_MANAGE = "user:manage"

    # System
    SYSTEM_ADMIN = "system:admin"


# =============================================================================
# Role → Permission Mapping (SEC§2.2)
# =============================================================================
ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    # -------------------------------------------------------------------------
    # ADMIN — Full access to everything
    # -------------------------------------------------------------------------
    Role.ADMIN: set(Permission),  # All permissions

    # -------------------------------------------------------------------------
    # SENIOR_STAFF — View all, approve, view financials (no write on most)
    # -------------------------------------------------------------------------
    Role.SENIOR_STAFF: {
        Permission.GENBA_READ,
        Permission.CUSTOMER_READ,
        Permission.PARTNER_READ,
        Permission.CONTRACT_READ,
        Permission.STAFF_READ,
        Permission.WORKER_READ,
        Permission.KEY_READ,
        Permission.KEY_DECRYPT,
        Permission.MANUAL_READ,
        Permission.PHOTO_READ,
        Permission.INVOICE_READ,
        Permission.QUOTATION_READ,
        Permission.APPROVAL_READ,
        Permission.APPROVAL_APPROVE,   # Can approve
        Permission.APPROVAL_SUBMIT,
    },

    # -------------------------------------------------------------------------
    # INTERNAL_STAFF — CRUD genba, customers, contracts, manuals, keys, photos
    # -------------------------------------------------------------------------
    Role.INTERNAL_STAFF: {
        Permission.GENBA_READ,
        Permission.GENBA_WRITE,
        Permission.CUSTOMER_READ,
        Permission.CUSTOMER_WRITE,
        Permission.PARTNER_READ,
        Permission.PARTNER_WRITE,
        Permission.CONTRACT_READ,
        Permission.CONTRACT_WRITE,
        Permission.STAFF_READ,
        Permission.WORKER_READ,
        Permission.WORKER_WRITE,
        Permission.KEY_READ,
        Permission.KEY_WRITE,
        Permission.KEY_DECRYPT,
        Permission.MANUAL_READ,
        Permission.MANUAL_WRITE,
        Permission.PHOTO_READ,
        Permission.PHOTO_UPLOAD,
        Permission.INVOICE_READ,
        Permission.INVOICE_WRITE,
        Permission.QUOTATION_READ,
        Permission.QUOTATION_WRITE,
        Permission.APPROVAL_READ,
        Permission.APPROVAL_SUBMIT,    # Can submit, NOT approve
    },

    # -------------------------------------------------------------------------
    # GENBA_WORKER — View assigned genba only (RLS enforced at DB level)
    # -------------------------------------------------------------------------
    Role.GENBA_WORKER: {
        Permission.GENBA_READ,         # RLS: assigned only
        Permission.KEY_READ,           # RLS: assigned genba only
        Permission.KEY_DECRYPT,        # Can decrypt keys for assigned genba
        Permission.MANUAL_READ,        # RLS: assigned genba only
        Permission.PHOTO_READ,         # RLS: assigned genba only
    },

    # -------------------------------------------------------------------------
    # PARTNER — View contracted genba only (RLS enforced at DB level)
    # -------------------------------------------------------------------------
    Role.PARTNER: {
        Permission.GENBA_READ,         # RLS: contracted only
        Permission.CONTRACT_READ,      # RLS: own ORDERING contracts only
        Permission.MANUAL_READ,        # Partial: entry/exit + periodic only
        Permission.PHOTO_READ,         # RLS: contracted genba only
        Permission.PHOTO_UPLOAD,       # Restricted: WORK_REPORT type only
    },

    # -------------------------------------------------------------------------
    # CUSTOMER — Placeholder (no MVP access)
    # -------------------------------------------------------------------------
    Role.CUSTOMER: set(),
}


def has_permission(role: Role, permission: Permission) -> bool:
    """
    Check if a role has a specific permission.

    Args:
        role: The user's role
        permission: The permission to check

    Returns:
        True if the role has the permission, False otherwise
    """
    return permission in ROLE_PERMISSIONS.get(role, set())


def get_permissions(role: Role) -> set[Permission]:
    """
    Get all permissions for a given role.

    Args:
        role: The user's role

    Returns:
        Set of permissions for the role
    """
    return ROLE_PERMISSIONS.get(role, set())
