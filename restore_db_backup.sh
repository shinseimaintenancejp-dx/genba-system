#!/bin/bash
# ==============================================================================
# Script khôi phục Database PostgreSQL cho Genba Management System
# Usage: ./restore_db_backup.sh [file_path.sql|file_path.dump]
# ==============================================================================

set -e

BACKUP_FILE="${1:-backup/genba_db_backup_20260731.dump}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found!"
    exit 1
fi

echo "=== START RESTORE: $BACKUP_FILE ==="

CONTAINER_NAME="genba_db"
DB_USER="genba_user"
DB_NAME="genba_management"

if [[ "$BACKUP_FILE" == *.dump ]]; then
    echo "🔄 Restoring custom format dump..."
    docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists < "$BACKUP_FILE" || true
elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    echo "🔄 Restoring compressed SQL script..."
    gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
elif [[ "$BACKUP_FILE" == *.sql ]]; then
    echo "🔄 Restoring SQL script..."
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
else
    echo "❌ Unsupported file format. Use .sql, .sql.gz, or .dump"
    exit 1
fi

echo "✅ Database restore completed successfully!"
