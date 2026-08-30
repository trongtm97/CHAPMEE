#!/usr/bin/env bash
# Convenience wrapper → production backup script.
# Does NOT hard-code passwords. Does NOT run docker compose down -v.
#
# Local (Docker Compose production layout):
#   bash scripts/backup-postgres.sh
#
# VPS (from /opt/chapmee/app):
#   bash scripts/backup-postgres.sh
#   BACKUP_DIR=/opt/backups/chapmee/postgres RETENTION_DAYS=30 bash scripts/backup-postgres.sh
#
# Env vars (optional):
#   CHAPMEE_APP_DIR   — app root (default: cwd)
#   COMPOSE_FILE      — default docker-compose.production.yml
#   ENV_FILE          — default .env.production
#   BACKUP_DIR        — output directory
#   RETENTION_DAYS    — delete backups older than N days (default 14)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/deploy/backup-postgres.sh" "$@"
