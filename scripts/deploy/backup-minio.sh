#!/usr/bin/env bash
# Mirror MinIO bucket to host directory (preserves object keys).
# Uses minio/mc on the compose Docker network. Does NOT delete remote objects.
# Does NOT print MINIO_ROOT_PASSWORD.
#
#   ./scripts/deploy/backup-minio.sh
#   BACKUP_DIR=/opt/backups/chapmee/minio RETENTION_DAYS=30 ./scripts/deploy/backup-minio.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

BACKUP_DIR="${BACKUP_DIR:-${BACKUP_ROOT}/minio}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

load_env_defaults
require_app_dir
mkdir -p "$BACKUP_DIR"

if [ ! -f "${CHAPMEE_APP_DIR}/${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} required for MINIO_ROOT_USER / MINIO_ROOT_PASSWORD / S3_BUCKET" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_DIR}/${S3_BUCKET}-${STAMP}"
mkdir -p "$DEST"

echo "Mirroring MinIO bucket \"${S3_BUCKET}\" to ${DEST} (keys preserved)..."
mc_mirror_backup "$DEST" "$S3_BUCKET"

BUCKET_PATH="${DEST}/${S3_BUCKET}"
if [ ! -d "$BUCKET_PATH" ]; then
  echo "ERROR: mirror destination missing: $BUCKET_PATH" >&2
  exit 1
fi

FILE_COUNT="$(find "$BUCKET_PATH" -type f ! -path '*/.minio.sys/*' 2>/dev/null | wc -l | tr -d ' ')"
if [ "${FILE_COUNT}" = "0" ]; then
  echo "WARN: bucket mirror has no user objects yet (empty bucket is OK)."
else
  echo "Objects mirrored: ${FILE_COUNT} files (excluding .minio.sys)"
fi

if [ "${RETENTION_DAYS}" -gt 0 ]; then
  find "$BACKUP_DIR" -maxdepth 1 -type d -name "${S3_BUCKET}-*" -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
fi

echo "MinIO backup written to: ${BUCKET_PATH}"
echo "Object keys under this path match S3 object_key values (do not rename)."
