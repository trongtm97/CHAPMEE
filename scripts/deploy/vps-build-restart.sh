#!/usr/bin/env bash
set -euo pipefail
cd /opt/chapmee/app
tar -xzf /tmp/chapmee-deploy.tgz
rm -f /tmp/chapmee-deploy.tgz
echo "EXTRACT_OK"
TAG="chapmee-web:deploy-$(date +%Y%m%d-%H%M%S)"
docker build -t "$TAG" -t chapmee-web:latest \
  --build-arg NODE_MAX_OLD_SPACE_SIZE=8192 \
  --build-arg NEXT_PUBLIC_APP_URL=https://chapmee.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://chapmee.com \
  --build-arg NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com \
  .
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --pull never web
sleep 15
curl -sf http://127.0.0.1:3000/api/health && echo "HEALTH_OK"
docker compose -f docker-compose.prod.yml --env-file .env.production ps web
