#!/bin/bash
# =============================================================================
# Genba Management System — Database Backup Script
#
# Run BEFORE any production migration.
# Usage: bash scripts/backup_db.sh
#
# Requires: docker compose to be running
# Output: backups/backup_YYYYMMDD_HHMMSS.sql
# =============================================================================

set -euo pipefail

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "📦 Starting database backup..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${DB_USER:-genba_user}" genba_management \
  > "$BACKUP_FILE"

echo "✅ Backup saved: $BACKUP_FILE"
echo "   Size: $(du -sh "$BACKUP_FILE" | cut -f1)"
