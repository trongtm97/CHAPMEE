# shellcheck shell=bash
# Shared helpers for ChapMee deploy backup scripts.
# Source: source "$(dirname "$0")/lib/common.sh"

set -euo pipefail

# Never use in these scripts:
#   docker compose down -v

CHAPMEE_APP_DIR="${CHAPMEE_APP_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

POSTGRES_USER="${POSTGRES_USER:-chapmee}"
POSTGRES_DB="${POSTGRES_DB:-chapmee}"
S3_BUCKET="${S3_BUCKET:-chapmee-media}"

BACKUP_ROOT="${BACKUP_ROOT:-/opt/backups/chapmee}"

require_app_dir() {
  if [ ! -f "${CHAPMEE_APP_DIR}/${COMPOSE_FILE}" ]; then
    echo "ERROR: ${COMPOSE_FILE} not found in CHAPMEE_APP_DIR=${CHAPMEE_APP_DIR}" >&2
    echo "Run from /opt/chapmee/app or set CHAPMEE_APP_DIR." >&2
    exit 1
  fi
}

compose() {
  require_app_dir
  local env_args=()
  if [ -f "${CHAPMEE_APP_DIR}/${ENV_FILE}" ]; then
    env_args=(--env-file "${CHAPMEE_APP_DIR}/${ENV_FILE}")
  fi
  docker compose -f "${CHAPMEE_APP_DIR}/${COMPOSE_FILE}" "${env_args[@]}" "$@"
}

# docker-compose.production.yml sets `name: chapmee` → network chapmee_chapmee_net
compose_network() {
  echo "${COMPOSE_PROJECT_NETWORK:-chapmee_chapmee_net}"
}

mc_mirror_backup() {
  local dest_host="$1"
  local bucket="$2"
  local network
  network="$(compose_network)"
  docker run --rm \
    --network "$network" \
    -v "${dest_host}:/backup:rw" \
    --env-file "${CHAPMEE_APP_DIR}/${ENV_FILE}" \
    minio/mc:latest \
    /bin/sh -c "
      set -e
      mc alias set local http://minio:9000 \"\${MINIO_ROOT_USER}\" \"\${MINIO_ROOT_PASSWORD}\"
      mc mirror \"local/${bucket}\" \"/backup/${bucket}\"
    "
}

# Load POSTGRES_* / S3_BUCKET from env file without printing values.
load_env_defaults() {
  local file="${CHAPMEE_APP_DIR}/${ENV_FILE}"
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [ -n "$line" ] || continue
    case "$line" in
      POSTGRES_USER=*) POSTGRES_USER="${line#POSTGRES_USER=}" ;;
      POSTGRES_DB=*) POSTGRES_DB="${line#POSTGRES_DB=}" ;;
      S3_BUCKET=*) S3_BUCKET="${line#S3_BUCKET=}" ;;
    esac
  done < "$file"
  POSTGRES_USER="$(echo "$POSTGRES_USER" | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
  POSTGRES_DB="$(echo "$POSTGRES_DB" | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
  S3_BUCKET="$(echo "$S3_BUCKET" | sed -e 's/^["'\'']//' -e 's/["'\'']$//')"
}

verify_nonempty_file() {
  local path="$1"
  if [ ! -s "$path" ]; then
    echo "ERROR: backup file is empty: $path" >&2
    exit 1
  fi
}
