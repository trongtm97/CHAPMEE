#!/usr/bin/env bash
set -euo pipefail

# Local Postgres backup (Docker). Does NOT run `docker compose down -v`.
BACKUP_DIR="${BACKUP_DIR:-backups/db}"
CONTAINER_NAME="${POSTGRES_CONTAINER:-chapmee-local-postgres}"
POSTGRES_USER="${POSTGRES_USER:-chapmee}"
POSTGRES_DB="${POSTGRES_DB:-chapmee_local}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILE="$BACKUP_DIR/chapmee-local-${STAMP}.sql"

docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$FILE"

if [ "${RETENTION_DAYS}" -gt 0 ]; then
  find "$BACKUP_DIR" -type f -name 'chapmee-local-*.sql' -mtime +"$RETENTION_DAYS" -delete
fi

echo "Backup written to $FILE"
echo "Restore: docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER $POSTGRES_DB < $FILE"
