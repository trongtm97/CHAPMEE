#!/usr/bin/env bash
set -euo pipefail

# Mirror local MinIO bucket objects to production S3-compatible storage (e.g. Vietnix).
# Object keys are preserved — database rows do not need path changes.
#
# Prerequisites: mc (MinIO Client) installed and configured aliases:
#   mc alias set local http://127.0.0.1:9000 chapmee_minio chapmee_minio_password
#   mc alias set prod  https://YOUR_VIETNIX_S3_ENDPOINT ACCESS_KEY SECRET_KEY
#
# Usage:
#   SOURCE_BUCKET=chapmee-local-media TARGET_BUCKET=chapmee-media ./scripts/sync-minio-to-s3.sh

SOURCE_BUCKET="${SOURCE_BUCKET:-chapmee-local-media}"
TARGET_BUCKET="${TARGET_BUCKET:-chapmee-media}"
SOURCE_ALIAS="${SOURCE_ALIAS:-local}"
TARGET_ALIAS="${TARGET_ALIAS:-prod}"

echo "Syncing ${SOURCE_ALIAS}/${SOURCE_BUCKET} -> ${TARGET_ALIAS}/${TARGET_BUCKET} (keys unchanged)"
mc mirror --overwrite "${SOURCE_ALIAS}/${SOURCE_BUCKET}" "${TARGET_ALIAS}/${TARGET_BUCKET}"
echo "Done. Update S3_* env on VPS and run: npx tsx scripts/check-media-integrity.ts"
