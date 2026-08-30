#!/bin/sh
# Usage: SSHPASS='...' sh scripts/deploy/run-vps-load-image.sh
: "${SSHPASS:?Set SSHPASS env var}"
HOST='deploy@14.225.211.205'
SSH='sshpass -e ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30'
SCP='sshpass -e scp -o StrictHostKeyChecking=no'
TAR='/tmp/docker-desktop-root/run/desktop/mnt/host/d/PROGRAM-TRONG/CHAPMEE/chapmee-image.tar'

echo "==> Upload image (~95MB)"
$SCP "$TAR" "$HOST:/tmp/chapmee-image.tar"

echo "==> Load image + restart"
$SSH "$HOST" 'set -e
cd /opt/chapmee/app
if docker image inspect chapmee-web:latest >/dev/null 2>&1; then
  docker tag chapmee-web:latest chapmee-web:rollback-$(date +%Y%m%d-%H%M%S)
fi
docker load -i /tmp/chapmee-image.tar
rm -f /tmp/chapmee-image.tar
docker compose -f docker-compose.production.yml --env-file .env.production up -d --no-build web
sleep 20
docker compose -f docker-compose.production.yml --env-file .env.production exec -T web node scripts/db-apply-shims.mjs || true
curl -sf http://127.0.0.1:3000/api/health && echo HEALTH_OK
docker compose -f docker-compose.production.yml --env-file .env.production ps web caddy
curl -sf https://chapmee.com/api/health && echo PUBLIC_OK || echo PUBLIC_SKIP
'
