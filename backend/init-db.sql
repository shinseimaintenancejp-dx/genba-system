-- =============================================================================
-- Genba Management System — PostgreSQL Database Initialization
-- Runs automatically when PostgreSQL container starts for the first time.
-- See: infrastructure.md §2.1
-- =============================================================================

-- Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Key encryption (AES-256) — Sprint 8
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation (fallback)

-- pg_bigm must be installed in the PostgreSQL image.
-- Enable it after verifying the extension is available in the container.
-- CREATE EXTENSION IF NOT EXISTS "pg_bigm";  -- Japanese full-text search — Sprint 10

-- =============================================================================
-- Application User & Permissions
-- =============================================================================

-- The main application user is created by POSTGRES_USER env var.
-- Grant necessary privileges:
DO $$
BEGIN
    -- Ensure the user exists (created by docker-entrypoint)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = current_user) THEN
        RAISE NOTICE 'User % already exists', current_user;
    END IF;
END
$$;

-- =============================================================================
-- Row-Level Security Configuration
-- =============================================================================

-- These custom GUC (Grand Unified Configuration) variables are used by RLS
-- policies to identify the current user role and entity.
-- They are set per-transaction via SET LOCAL in the application layer.

-- Register custom configuration parameters (allows SET LOCAL without superuser).
-- SECURITY: Default to 'NONE' (least-privilege) — NOT 'ADMIN'.
-- If SET LOCAL is ever missed, RLS policies will deny access by default. (HIGH-06 fix)
ALTER DATABASE genba_management SET "app.user_id" = '';            -- MED-03: register user_id GUC
ALTER DATABASE genba_management SET "app.user_role" = 'NONE';      -- HIGH-06: deny-by-default (was 'ADMIN')
ALTER DATABASE genba_management SET "app.related_entity_id" = '';
ALTER DATABASE genba_management SET "app.encryption_key" = '';

-- Notify that initialization is complete
DO $$
BEGIN
    RAISE NOTICE 'Genba Management System database initialized successfully';
    RAISE NOTICE 'Extensions: pgcrypto, uuid-ossp';
    RAISE NOTICE 'RLS custom GUC variables configured (deny-by-default)';
END
$$;
