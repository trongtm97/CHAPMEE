#!/usr/bin/env bash
# DESTRUCTIVE: restore PostgreSQL from a .sql or .sql.gz dump.
# Requires confirmation phrase RESTORE_CHAPMEE_POSTGRES.
# Does NOT run automatically. Does NOT use docker compose down -v.
#
#   CHAPMEE_RESTORE_CONFIRM=RESTORE_CHAPMEE_POSTGRES ./scripts/deploy/restore-postgres.sh /path/to/backup.sql.gz
#
# Optional: PRE_RESTORE_BACKUP=1 (default) snapshots current DB before restore.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIRM_PHRASE="RESTORE_CHAPMEE_POSTGRES"
PRE_RESTORE_BACKUP="${PRE_RESTORE_BACKUP:-1}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql|backup.sql.gz>" >&2
  echo "Set CHAPMEE_RESTORE_CONFIRM=${CONFIRM_PHRASE} or type phrase when prompted." >&2
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

load_env_defaults

echo "================================================================"
echo " WARNING: This OVERWRITES data in PostgreSQL database \"${POSTGRES_DB}\"."
echo " Active connections may be disrupted. App should be stopped or in maintenance."
echo " pg_dump plain SQL restore does NOT use --clean; existing objects may conflict"
echo " if schema changed. Prefer restore to empty DB or after manual review."
echo " NEVER run: docker compose down -v"
echo "================================================================"

confirm="${CHAPMEE_RESTORE_CONFIRM:-}"
if [ "$confirm" != "$CONFIRM_PHRASE" ]; then
  echo "Type ${CONFIRM_PHRASE} to continue:"
  read -r confirm
  if [ "$confirm" != "$CONFIRM_PHRASE" ]; then
    echo "Aborted."
    exit 1
  fi
fi

if [ "$PRE_RESTORE_BACKUP" = "1" ]; then
  echo "Creating pre-restore safety backup..."
  BACKUP_DIR="${BACKUP_DIR:-${BACKUP_ROOT}/postgres/pre-restore}" \
    "${SCRIPT_DIR}/backup-postgres.sh"
fi

echo "Restoring from: $BACKUP_FILE"

restore_stream() {
  case "$BACKUP_FILE" in
    *.gz) gunzip -c "$BACKUP_FILE" ;;
    *) cat "$BACKUP_FILE" ;;
  esac
}

# Plain SQL via psql (no pg_restore --clean).
restore_stream | compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Restore finished. Verify app, run migrations if needed, and check media_asset_id / object_key consistency."
