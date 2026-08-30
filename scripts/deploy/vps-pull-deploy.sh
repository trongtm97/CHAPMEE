#!/usr/bin/env bash
# Pull pre-built web image from registry and restart (VPS — NO docker build).
#
# Usage on VPS:
#   export CHAPMEE_WEB_IMAGE=ghcr.io/<owner>/chapmee-web:<commit-sha>
#   ./scripts/deploy/vps-pull-deploy.sh
#
# Or pass image as first argument:
#   ./scripts/deploy/vps-pull-deploy.sh ghcr.io/owner/chapmee-web:abc123...

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_PATH="${VPS_PATH:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
IMAGE="${1:-${CHAPMEE_WEB_IMAGE:-}}"

die() { echo "ERROR: $*" >&2; exit 1; }

[[ -n "$IMAGE" ]] || die "Set CHAPMEE_WEB_IMAGE or pass image as first argument"
[[ -f "${VPS_PATH}/${COMPOSE_FILE}" ]] || die "Missing ${COMPOSE_FILE} in ${VPS_PATH}"
[[ -f "${VPS_PATH}/${ENV_FILE}" ]] || die "Missing ${ENV_FILE} — create on VPS (never commit to GitHub)"

cd "${VPS_PATH}"

echo "==> Record rollback tag (current latest if present)"
IMAGE_REPO="${IMAGE%%:*}"
if docker image inspect "${IMAGE_REPO}:latest" >/dev/null 2>&1; then
  ROLLBACK_TAG="${IMAGE_REPO}:rollback-$(date +%Y%m%d-%H%M%S)"
  docker tag "${IMAGE_REPO}:latest" "${ROLLBACK_TAG}"
  echo "${ROLLBACK_TAG}" > .deploy-rollback-image
  echo "Rollback saved: ${ROLLBACK_TAG}"
fi

echo "==> Update ${ENV_FILE}"
if grep -q '^CHAPMEE_WEB_IMAGE=' "${ENV_FILE}"; then
  sed -i "s|^CHAPMEE_WEB_IMAGE=.*|CHAPMEE_WEB_IMAGE=${IMAGE}|" "${ENV_FILE}"
else
  echo "CHAPMEE_WEB_IMAGE=${IMAGE}" >> "${ENV_FILE}"
fi

echo "==> Pull image (NO --build)"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull web

echo "==> Up stack"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

echo "==> Health check"
sleep 8
curl -sf http://127.0.0.1:3000/api/health || {
  echo "Health check failed. Rollback:"
  echo "  CHAPMEE_WEB_IMAGE=\$(cat .deploy-rollback-image) $0"
  exit 1
}

echo "==> Prune old images (safe)"
if [[ -x "${SCRIPT_DIR}/vps-prune-images.sh" ]]; then
  IMAGE_REPO="${IMAGE_REPO}" KEEP_IMAGE_TAGS="${KEEP_IMAGE_TAGS:-5}" "${SCRIPT_DIR}/vps-prune-images.sh"
else
  docker image prune -f
fi

echo "Deploy OK: ${IMAGE}"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps web
