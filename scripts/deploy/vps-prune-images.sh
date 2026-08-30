#!/usr/bin/env bash
# Remove old ChapMee web images — never deletes the image the running container uses.
#
# Usage:
#   IMAGE_REPO=ghcr.io/myorg/chapmee-web KEEP_IMAGE_TAGS=5 ./scripts/deploy/vps-prune-images.sh

set -euo pipefail

IMAGE_REPO="${IMAGE_REPO:-}"
KEEP_IMAGE_TAGS="${KEEP_IMAGE_TAGS:-5}"

if [[ -z "${IMAGE_REPO}" ]]; then
  if [[ -f .env.production ]] && grep -q '^CHAPMEE_WEB_IMAGE=' .env.production; then
    IMAGE_REPO="${CHAPMEE_WEB_IMAGE%%:*}"
  else
    echo "ERROR: set IMAGE_REPO=ghcr.io/<owner>/chapmee-web" >&2
    exit 1
  fi
fi

echo "==> Prune dangling images (safe)"
docker image prune -f

RUNNING_ID=""
if docker inspect chapmee-web >/dev/null 2>&1; then
  RUNNING_ID="$(docker inspect -f '{{.Image}}' chapmee-web)"
  echo "Protect running container image: ${RUNNING_ID}"
fi

ROLLBACK_ID=""
if [[ -f .deploy-rollback-image ]]; then
  ROLLBACK_TAG="$(cat .deploy-rollback-image)"
  if docker image inspect "${ROLLBACK_TAG}" >/dev/null 2>&1; then
    ROLLBACK_ID="$(docker image inspect -f '{{.Id}}' "${ROLLBACK_TAG}")"
    echo "Protect rollback image: ${ROLLBACK_TAG}"
  fi
fi

is_protected() {
  local id="$1"
  [[ -n "${RUNNING_ID}" && "${id}" == "${RUNNING_ID}" ]] && return 0
  [[ -n "${ROLLBACK_ID}" && "${id}" == "${ROLLBACK_ID}" ]] && return 0
  return 1
}

echo "==> Trim old SHA tags for ${IMAGE_REPO} (keep ${KEEP_IMAGE_TAGS})"
mapfile -t SHA_ROWS < <(
  docker images "${IMAGE_REPO}" --format '{{.ID}}\t{{.Tag}}\t{{.CreatedAt}}' \
    | awk -F'\t' '$2 ~ /^[a-f0-9]{40}$/ { print }' \
    | sort -t$'\t' -k3 -r
)

count=0
for row in "${SHA_ROWS[@]}"; do
  id="${row%%$'\t'*}"
  rest="${row#*$'\t'}"
  tag="${rest%%$'\t'*}"
  if is_protected "${id}"; then
    continue
  fi
  count=$((count + 1))
  if [[ "${count}" -le "${KEEP_IMAGE_TAGS}" ]]; then
    continue
  fi
  echo "Removing ${IMAGE_REPO}:${tag}"
  docker rmi "${IMAGE_REPO}:${tag}" 2>/dev/null || true
done

echo "Prune complete."
