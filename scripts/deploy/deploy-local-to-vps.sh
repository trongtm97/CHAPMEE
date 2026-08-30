#!/usr/bin/env bash
# ChapMee — build Docker image locally, transfer via docker save/load, deploy on VPS.
# Does NOT upload .env.production. Does NOT run docker build on VPS.
#
# Usage:
#   export VPS_USER=deploy VPS_HOST=your.vps.ip VPS_PATH=/opt/chapmee/app IMAGE_NAME=chapmee-web
#   ./scripts/deploy/deploy-local-to-vps.sh
#
# Rollback on VPS (after a bad deploy):
#   ./scripts/deploy/deploy-local-to-vps.sh --rollback
#
# Requirements: docker, ssh, scp, gzip. SSH key auth recommended (no password in script).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

VPS_USER="${VPS_USER:-}"
VPS_HOST="${VPS_HOST:-}"
VPS_PATH="${VPS_PATH:-/opt/chapmee/app}"
IMAGE_NAME="${IMAGE_NAME:-chapmee-web}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
SSH_PORT="${SSH_PORT:-22}"
ROLLBACK_ONLY=false

usage() {
  cat <<'EOF'
ChapMee deploy: local docker build -> save -> scp -> VPS docker load -> compose up

Environment variables:
  VPS_USER      SSH user (required)
  VPS_HOST      VPS hostname or IP (required)
  VPS_PATH      App directory on VPS (default: /opt/chapmee/app)
  IMAGE_NAME    Docker image name (default: chapmee-web)
  COMPOSE_FILE  Compose file on VPS (default: docker-compose.prod.yml)
  ENV_FILE      Env file on VPS (default: .env.production)

Options:
  --rollback    Re-deploy previous image tag recorded on VPS (no local build)
  -h, --help    Show this help

Optional build-args (set before running):
  NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL
  NODE_MAX_OLD_SPACE_SIZE (default: 8192)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rollback) ROLLBACK_ONLY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1" >&2
    exit 1
  fi
}

step() {
  echo ""
  echo "==> $*"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

ssh_vps() {
  ssh -p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "$@"
}

scp_to_vps() {
  scp -P "${SSH_PORT}" -o StrictHostKeyChecking=accept-new "$1" "${VPS_USER}@${VPS_HOST}:$2"
}

require_cmd docker
require_cmd ssh
require_cmd scp
require_cmd gzip

if [[ -z "${VPS_USER}" || -z "${VPS_HOST}" ]]; then
  die "Set VPS_USER and VPS_HOST (no credentials are stored in this script)."
fi

REMOTE="${VPS_USER}@${VPS_HOST}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TAG_DEPLOY="${IMAGE_NAME}:deploy-${TIMESTAMP}"
TAG_LATEST="${IMAGE_NAME}:latest"
ARCHIVE_LOCAL="${REPO_ROOT}/.deploy-${IMAGE_NAME}-${TIMESTAMP}.tar.gz"
ARCHIVE_REMOTE_NAME="$(basename "${ARCHIVE_LOCAL}")"
ARCHIVE_REMOTE="${VPS_PATH}/images/${ARCHIVE_REMOTE_NAME}"
ROLLBACK_FILE="${VPS_PATH}/.deploy-rollback-image"

if [[ "${ROLLBACK_ONLY}" == true ]]; then
  step "Rollback on VPS using ${ROLLBACK_FILE}"
  ssh_vps bash -s <<EOF
set -euo pipefail
cd "${VPS_PATH}"
if [[ ! -f "${ROLLBACK_FILE}" ]]; then
  echo "ERROR: rollback file not found: ${ROLLBACK_FILE}" >&2
  exit 1
fi
ROLLBACK_TAG="\$(cat "${ROLLBACK_FILE}")"
if ! docker image inspect "\${ROLLBACK_TAG}" >/dev/null 2>&1; then
  echo "ERROR: rollback image not found: \${ROLLBACK_TAG}" >&2
  exit 1
fi
docker tag "\${ROLLBACK_TAG}" "${TAG_LATEST}"
if [[ -f "${ENV_FILE}" ]]; then
  if grep -q '^CHAPMEE_WEB_IMAGE=' "${ENV_FILE}"; then
    sed -i "s|^CHAPMEE_WEB_IMAGE=.*|CHAPMEE_WEB_IMAGE=${TAG_LATEST}|" "${ENV_FILE}"
  else
    echo "CHAPMEE_WEB_IMAGE=${TAG_LATEST}" >> "${ENV_FILE}"
  fi
fi
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --pull never --pull never web
sleep 5
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps web
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs --tail=30 web
echo "Rollback complete -> \${ROLLBACK_TAG} tagged as ${TAG_LATEST}"
EOF
  step "Rollback finished"
  exit 0
fi

step "1/7 — Verify VPS paths"
ssh_vps "test -d '${VPS_PATH}' && test -f '${VPS_PATH}/${COMPOSE_FILE}'" \
  || die "VPS missing ${VPS_PATH} or ${COMPOSE_FILE}"
ssh_vps "mkdir -p '${VPS_PATH}/images'" || die "Cannot create ${VPS_PATH}/images on VPS"

step "2/7 — Docker build locally (tag: ${TAG_DEPLOY})"
cd "${REPO_ROOT}"

BUILD_ARGS=(--build-arg "NODE_MAX_OLD_SPACE_SIZE=${NODE_MAX_OLD_SPACE_SIZE:-8192}")
[[ -n "${NEXT_PUBLIC_APP_URL:-}" ]] && BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}")
[[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]] && BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}")
[[ -n "${NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL:-}" ]] && BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=${NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL}")

docker build \
  -t "${TAG_DEPLOY}" \
  -t "${TAG_LATEST}" \
  "${BUILD_ARGS[@]}" \
  . || die "docker build failed"

step "3/7 — Save image to ${ARCHIVE_LOCAL}"
docker save "${TAG_DEPLOY}" "${TAG_LATEST}" | gzip > "${ARCHIVE_LOCAL}" \
  || die "docker save failed"
ARCHIVE_SIZE="$(du -h "${ARCHIVE_LOCAL}" | cut -f1)"
echo "Archive size: ${ARCHIVE_SIZE}"

step "4/7 — Upload archive to VPS (scp)"
scp_to_vps "${ARCHIVE_LOCAL}" "${ARCHIVE_REMOTE}" || die "scp failed"

step "5/7 — Load image on VPS + record rollback tag"
ssh_vps bash -s <<EOF
set -euo pipefail
cd "${VPS_PATH}"
if docker image inspect "${TAG_LATEST}" >/dev/null 2>&1; then
  ROLLBACK_TAG="${IMAGE_NAME}:rollback-${TIMESTAMP}"
  docker tag "${TAG_LATEST}" "\${ROLLBACK_TAG}"
  echo "\${ROLLBACK_TAG}" > "${ROLLBACK_FILE}"
  echo "Saved rollback tag: \${ROLLBACK_TAG}"
fi
gunzip -c "${ARCHIVE_REMOTE}" | docker load
docker image inspect "${TAG_DEPLOY}" >/dev/null
docker tag "${TAG_DEPLOY}" "${TAG_LATEST}"
EOF
|| die "docker load on VPS failed"

step "6/7 — Start stack (docker compose up -d, NO --build)"
ssh_vps bash -s <<EOF
set -euo pipefail
cd "${VPS_PATH}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found on VPS. Create it manually — this script does not upload .env." >&2
  exit 1
fi
if grep -q '^CHAPMEE_WEB_IMAGE=' "${ENV_FILE}"; then
  sed -i "s|^CHAPMEE_WEB_IMAGE=.*|CHAPMEE_WEB_IMAGE=${TAG_LATEST}|" "${ENV_FILE}"
else
  echo "CHAPMEE_WEB_IMAGE=${TAG_LATEST}" >> "${ENV_FILE}"
fi
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --pull never
EOF
|| die "docker compose up failed"

step "7/7 — Verify containers"
ssh_vps bash -s <<'EOF'
set -euo pipefail
sleep 8
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20
EOF

step "Health check"
ssh_vps "curl -sf http://127.0.0.1:3000/api/health || (docker logs --tail=40 chapmee-web; exit 1)" \
  || die "Health check failed — run: ./scripts/deploy/deploy-local-to-vps.sh --rollback"

step "Cleanup local archive"
rm -f "${ARCHIVE_LOCAL}"

echo ""
echo "Deploy OK"
echo "  Image: ${TAG_DEPLOY}"
echo "  Rollback: ./scripts/deploy/deploy-local-to-vps.sh --rollback"
echo "  Logs:   ssh ${REMOTE} 'cd ${VPS_PATH} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} logs -f web'"
