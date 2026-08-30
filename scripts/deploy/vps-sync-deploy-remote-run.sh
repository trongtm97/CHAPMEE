#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/opt/chapmee/app"
ENV_BACKUP="/tmp/chapmee-env.production.bak"

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

if grep -q '^NODE_MAX_OLD_SPACE_SIZE=' .env.production; then
  sed -i 's/^NODE_MAX_OLD_SPACE_SIZE=.*/NODE_MAX_OLD_SPACE_SIZE=8192/' .env.production
else
  echo 'NODE_MAX_OLD_SPACE_SIZE=8192' >> .env.production
fi

dcp="docker compose -f docker-compose.production.yml --env-file .env.production"

echo "==> Build web"
if ! ${dcp} build web; then
  echo "==> Retry build 6144MB no-cache"
  sed -i 's/^NODE_MAX_OLD_SPACE_SIZE=.*/NODE_MAX_OLD_SPACE_SIZE=6144/' .env.production
  ${dcp} build web --no-cache
fi

echo "==> Up stack"
${dcp} up -d

sleep 25

echo "==> DB shims (host one-shot — web image has no scripts/ or drizzle/)"
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
