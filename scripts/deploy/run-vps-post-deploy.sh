#!/bin/sh
# Usage: SSHPASS='...' sh scripts/deploy/run-vps-post-deploy.sh
: "${SSHPASS:?Set SSHPASS env var}"
sshpass -e ssh -o StrictHostKeyChecking=no deploy@14.225.211.205 'set -e
cd /opt/chapmee/app
dcp="docker compose -f docker-compose.production.yml --env-file .env.production"
curl -sf http://127.0.0.1:3000/api/health && echo LOCAL_HEALTH_OK
curl -sf -o /dev/null -w "boi-tinh-yeu:%{http_code}\n" https://chapmee.com/tien-ich/boi-tinh-yeu
if [ -f drizzle/0039_episode_creator_publish_rls.sql ]; then
  echo "Applying drizzle/0039_episode_creator_publish_rls.sql"
  $dcp exec -T postgres psql -U chapmee -d chapmee -f - < drizzle/0039_episode_creator_publish_rls.sql 2>&1 | tail -8
fi
if [ -f drizzle/0038_love_insight.sql ]; then
  echo "Applying drizzle/0038_love_insight.sql"
  $dcp exec -T postgres psql -U chapmee -d chapmee -f - < drizzle/0038_love_insight.sql 2>&1 | tail -8
fi
$dcp ps web caddy
'
