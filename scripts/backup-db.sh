#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/chapmee-db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER_NAME="${POSTGRES_CONTAINER:-chapmee-postgres}"
POSTGRES_USER="${POSTGRES_USER:-chapmee}"
POSTGRES_DB="${POSTGRES_DB:-chapmee}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/chapmee-${STAMP}.sql.gz"

docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"

find "$BACKUP_DIR" -type f -name 'chapmee-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup written to $FILE"

# TODO: rclone copy "$FILE" vietnix-s3:your-bucket/chapmee-db-backups/
