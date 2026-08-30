#!/bin/sh
# Usage: SSHPASS='...' sh scripts/deploy/run-vps-deploy-from-windows.sh
: "${SSHPASS:?Set SSHPASS env var}"
HOST='deploy@14.225.211.205'
SSH='sshpass -e ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30'
SCP='sshpass -e scp -o StrictHostKeyChecking=no'

$SSH "$HOST" 'cd /opt/chapmee/app && tar -xzf /tmp/chapmee-deploy.tar.gz && rm -f /tmp/chapmee-deploy.tar.gz && echo EXTRACT_OK'

$SSH "$HOST" 'cd /opt/chapmee/app && if grep -q ^NODE_MAX_OLD_SPACE_SIZE= .env.production; then sed -i s/^NODE_MAX_OLD_SPACE_SIZE=.*/NODE_MAX_OLD_SPACE_SIZE=8192/ .env.production; else echo NODE_MAX_OLD_SPACE_SIZE=8192 >> .env.production; fi && echo HEAP_OK'

$SSH "$HOST" 'cd /opt/chapmee/app && docker compose -f docker-compose.production.yml --env-file .env.production build web' || \
$SSH "$HOST" 'cd /opt/chapmee/app && sed -i s/^NODE_MAX_OLD_SPACE_SIZE=.*/NODE_MAX_OLD_SPACE_SIZE=6144/ .env.production && docker compose -f docker-compose.production.yml --env-file .env.production build web --no-cache'

$SSH "$HOST" 'cd /opt/chapmee/app && docker compose -f docker-compose.production.yml --env-file .env.production up -d'

$SSH "$HOST" 'sleep 25 && cd /opt/chapmee/app && docker run --rm --network chapmee_chapmee_net -v /opt/chapmee/app:/app -w /app --env-file /opt/chapmee/app/.env.production node:22-alpine sh -ec "node scripts/db-apply-shims.mjs" || true'

$SSH "$HOST" 'curl -sf http://127.0.0.1:3000/api/health && echo HEALTH_OK || (echo HEALTH_FAIL; exit 1)'

$SSH "$HOST" 'cd /opt/chapmee/app && docker compose -f docker-compose.production.yml --env-file .env.production ps web caddy'
