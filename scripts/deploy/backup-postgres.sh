#!/usr/bin/env bash
# Backup PostgreSQL from production compose (pg_dump → gzip).
# Does NOT print passwords. Does NOT run docker compose down -v.
#
#   ./scripts/deploy/backup-postgres.sh
#   BACKUP_DIR=/opt/backups/chapmee/postgres RETENTION_DAYS=30 ./scripts/deploy/backup-postgres.sh
#
# From VPS app root: /opt/chapmee/app

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

BACKUP_DIR="${BACKUP_DIR:-${BACKUP_ROOT}/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

load_env_defaults
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/chapmee-postgres-${STAMP}.sql.gz"

echo "Backing up PostgreSQL (db=${POSTGRES_DB}, user=${POSTGRES_USER})..."
compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"

verify_nonempty_file "$FILE"

if [ "${RETENTION_DAYS}" -gt 0 ]; then
  find "$BACKUP_DIR" -type f -name 'chapmee-postgres-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
fi

echo "Backup written to: $FILE"
echo "Size: $(du -h "$FILE" | cut -f1)"
