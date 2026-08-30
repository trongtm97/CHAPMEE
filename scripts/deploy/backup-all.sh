#!/usr/bin/env bash
# Full ChapMee backup: PostgreSQL + MinIO + manifest.
# Run before major deploy/migration. Does NOT copy .env.production into repo.
#
#   ./scripts/deploy/backup-all.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

MANIFEST_DIR="${BACKUP_ROOT}/manifests"
STAMP="$(date +%Y%m%d-%H%M%S)"
MANIFEST="${MANIFEST_DIR}/backup-${STAMP}.json"
PG_DIR="${BACKUP_ROOT}/postgres"
MINIO_PARENT="${BACKUP_ROOT}/minio"

mkdir -p "$MANIFEST_DIR"

echo "=== ChapMee backup-all (${STAMP}) ==="

"${SCRIPT_DIR}/backup-postgres.sh"
"${SCRIPT_DIR}/backup-minio.sh"

POSTGRES_FILE="$(ls -t "${PG_DIR}"/chapmee-postgres-*.sql.gz 2>/dev/null | head -1 || true)"
MINIO_DEST="$(ls -td "${MINIO_PARENT}"/${S3_BUCKET}-* 2>/dev/null | head -1 || true)"

GIT_COMMIT="unknown"
if command -v git >/dev/null 2>&1 && [ -d "${CHAPMEE_APP_DIR}/.git" ]; then
  GIT_COMMIT="$(git -C "${CHAPMEE_APP_DIR}" rev-parse HEAD 2>/dev/null || echo unknown)"
fi

DOCKER_IMAGES="unavailable"
if command -v docker >/dev/null 2>&1 && [ -f "${CHAPMEE_APP_DIR}/${COMPOSE_FILE}" ]; then
  DOCKER_IMAGES="$(compose images 2>/dev/null | tail -n +2 || echo unavailable)"
fi

mkdir -p "$(dirname "$MANIFEST")"
{
  echo "{"
  echo "  \"timestamp\": \"${STAMP}\","
  echo "  \"app_dir\": \"${CHAPMEE_APP_DIR}\","
  echo "  \"git_commit\": \"${GIT_COMMIT}\","
  echo "  \"postgres_backup\": \"${POSTGRES_FILE}\","
  echo "  \"minio_backup\": \"${MINIO_DEST}\","
  echo "  \"env_note\": \"Back up /opt/chapmee/.env.production separately (encrypted). Not in this archive.\","
  echo "  \"never_run\": \"docker compose down -v\""
  echo "}"
} > "$MANIFEST"

echo ""
echo "Manifest: $MANIFEST"
echo "Postgres: ${POSTGRES_FILE:-not found}"
echo "MinIO:    ${MINIO_DEST:-not found}"
echo ""
echo "Reminder: back up /opt/chapmee/.env.production manually (password manager / encrypted archive)."
echo "Never commit backups/ or .env.production to git."
