#!/usr/bin/env bash
# Install daily storage garbage-collection cron on VPS (reads CRON_SECRET from .env.production).
#
# Usage on VPS:
#   cd /opt/chapmee/app && bash scripts/deploy/setup-vps-cron-storage-cleanup.sh

set -euo pipefail

APP_DIR="${VPS_PATH:-/opt/chapmee/app}"
ENV_FILE="${APP_DIR}/.env.production"
LOG_FILE="/var/log/chapmee-storage-cleanup.log"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

CRON_SECRET="$(
  grep -m1 '^CRON_SECRET=' "${ENV_FILE}" | cut -d= -f2- | sed 's/^["'\'']//; s/["'\'']$//'
)"

if [[ -z "${CRON_SECRET}" ]]; then
  echo "CRON_SECRET not set in ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v crontab >/dev/null 2>&1; then
  echo "crontab not found. Install cron on the VPS, e.g. sudo apt-get install -y cron" >&2
  exit 1
fi

touch "${LOG_FILE}" 2>/dev/null || LOG_FILE="${APP_DIR}/storage-cleanup.log"

MARKER="# chapmee-storage-cleanup"
CRON_LINE="0 4 * * * CRON_SECRET=\$(grep -m1 '^CRON_SECRET=' ${ENV_FILE} | cut -d= -f2- | sed 's/^[\"'\'']//; s/[\"'\'']$//') && curl -fsS -H \"Authorization: Bearer \${CRON_SECRET}\" \"http://127.0.0.1:3000/api/cron/storage-cleanup\" >> ${LOG_FILE} 2>&1 ${MARKER}"

TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v "${MARKER}" | grep -v "api/cron/storage-cleanup" > "${TMP}" || true
echo "${CRON_LINE}" >> "${TMP}"
crontab "${TMP}"
rm -f "${TMP}"

echo "Installed storage cleanup cron (daily 04:00). Log: ${LOG_FILE}"
crontab -l | grep storage-cleanup || true
