#!/usr/bin/env bash
# One-shot VPS build after /tmp/chapmee-deploy.tar.gz is uploaded.
# Run on VPS: bash scripts/deploy/vps-build-remote-once.sh
set -euo pipefail

APP_DIR="/opt/chapmee/app"
LOG="/tmp/chapmee-build-$(date +%Y%m%d-%H%M%S).log"
ENV_BACKUP="/tmp/chapmee-env.production.bak"

exec > >(tee -a "$LOG") 2>&1

echo "==> BUILD_START $(date -Iseconds)"

if [ -f "${APP_DIR}/.env.production" ]; then
  cp "${APP_DIR}/.env.production" "${ENV_BACKUP}"
fi

mkdir -p "${APP_DIR}"
tar -xzf /tmp/chapmee-deploy.tar.gz -C "${APP_DIR}"

if [ -f "${ENV_BACKUP}" ]; then
  cp "${ENV_BACKUP}" "${APP_DIR}/.env.production"
fi
rm -f /tmp/chapmee-deploy.tar.gz

cd "${APP_DIR}"

# Vietnix VPS ~4GB RAM — 6144MB heap is the stable value (8192 OOMs).
if grep -q '^NODE_MAX_OLD_SPACE_SIZE=' .env.production; then
  sed -i 's/^NODE_MAX_OLD_SPACE_SIZE=.*/NODE_MAX_OLD_SPACE_SIZE=6144/' .env.production
else
  echo 'NODE_MAX_OLD_SPACE_SIZE=6144' >> .env.production
fi

dcp="docker compose -f docker-compose.production.yml --env-file .env.production"

echo "==> Build web"
if ! ${dcp} build web; then
  echo "==> Retry build --no-cache"
  ${dcp} build web --no-cache
fi

echo "==> Up stack"
${dcp} up -d

echo "==> Wait for web"
sleep 25

echo "==> DB shims (one-shot node container — web image has no scripts/)"
docker run --rm --network chapmee_chapmee_net \
  -v "${APP_DIR}:/app" -w /app \
  --env-file "${APP_DIR}/.env.production" \
  node:22-alpine sh -ec 'node scripts/db-apply-shims.mjs' || true

echo "==> Health"
curl -sf http://127.0.0.1:3000/api/health
echo ""
echo "HEALTH_OK"

echo "==> Status"
${dcp} ps web caddy

echo "==> BUILD_DONE $(date -Iseconds)"
echo "Log: ${LOG}"
