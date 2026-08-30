#!/bin/sh
# DEPRECATED for routine deploy: builds on VPS (OOM on 4GB). Use deploy-local-to-vps.ps1 instead.
# See docs/VPS_BUILD_RUNBOOK.md — build Docker on local machine only.
set -e
cd /opt/chapmee/app

echo "==> Extract code"
tar -xzf /tmp/chapmee-deploy.tar.gz
rm -f /tmp/chapmee-deploy.tar.gz

dcp='docker compose -f docker-compose.production.yml --env-file .env.production'

echo "==> Set build heap"
if grep -q '^NODE_MAX_OLD_SPACE_SIZE=' .env.production; then
  sed -i 's/^NODE_MAX_OLD_SPACE_SIZE=.*/NODE_MAX_OLD_SPACE_SIZE=8192/' .env.production
else
  echo 'NODE_MAX_OLD_SPACE_SIZE=8192' >> .env.production
fi

echo "==> Build web (8192MB heap)"
if ! $dcp build web; then
  echo "==> Build failed — retry 6144MB no-cache"
  sed -i 's/^NODE_MAX_OLD_SPACE_SIZE=.*/NODE_MAX_OLD_SPACE_SIZE=6144/' .env.production
  $dcp build web --no-cache
fi

echo "==> Up stack"
$dcp up -d

echo "==> Wait for web"
sleep 25

echo "==> DB shims (host one-shot — web image has no scripts/ or drizzle/)"
docker run --rm --network chapmee_chapmee_net \
  -v "/opt/chapmee/app:/app" -w /app \
  --env-file "/opt/chapmee/app/.env.production" \
  node:22-alpine sh -ec 'node scripts/db-apply-shims.mjs' || true

echo "==> Health"
if curl -sf http://127.0.0.1:3000/api/health; then
  echo ""
  echo "HEALTH_OK"
else
  echo "HEALTH_FAIL"
  $dcp logs web --tail 40
  exit 1
fi

echo "==> Status"
$dcp ps web caddy
