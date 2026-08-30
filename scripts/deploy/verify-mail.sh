#!/usr/bin/env bash
# Verify ChapMee transactional email path: web container → Postfix → outbound.
#
#   cd /opt/chapmee/app
#   ./scripts/deploy/verify-mail.sh
#   EMAIL_TEST_TO=you@gmail.com ./scripts/deploy/verify-mail.sh --send

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

SEND_TEST=false
for arg in "$@"; do
  case "$arg" in
    --send) SEND_TEST=true ;;
  esac
done

load_env_defaults

echo "==> Container env"
compose exec -T web sh -c 'echo EMAIL_MODE=$EMAIL_MODE SMTP_HOST=$SMTP_HOST SMTP_PORT=$SMTP_PORT MAIL_FROM=$MAIL_FROM'

echo ""
echo "==> SMTP connect from web container"
if compose exec -T web sh -c 'node -e "
const net = require(\"net\");
const host = process.env.SMTP_HOST || \"host.docker.internal\";
const port = Number(process.env.SMTP_PORT || 25);
const s = net.createConnection({ host, port }, () => { console.log(\"OK\", host, port); s.end(); });
s.on(\"error\", (e) => { console.error(\"FAIL\", e.message); process.exit(1); });
s.setTimeout(8000, () => { console.error(\"TIMEOUT\"); process.exit(1); });
"'; then
  echo "SMTP connect: pass"
else
  echo "SMTP connect: FAIL — run: sudo ./scripts/deploy/setup-postfix-mail.sh" >&2
  exit 1
fi

echo ""
echo "==> Postfix on host"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep ':25 ' || echo "(cannot read port 25 — run on VPS host)"
fi

echo ""
echo "==> Recent email_jobs"
compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT type, to_email, status, retry_count, left(coalesce(error_message,''), 80) AS err, sent_at
   FROM email_jobs ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || \
  echo "(postgres query failed)"

if [ "$SEND_TEST" = true ]; then
  TO="${EMAIL_TEST_TO:-}"
  if [ -z "$TO" ]; then
    echo "Set EMAIL_TEST_TO=recipient@example.com for --send" >&2
    exit 1
  fi
  echo ""
  echo "==> Trigger password-reset enqueue for ${TO}"
  APP_URL="${NEXT_PUBLIC_APP_URL:-https://chapmee.com}"
  curl -fsS -X POST "${APP_URL}/api/auth/request-password-reset" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${TO}\",\"redirectTo\":\"${APP_URL}/reset-password\"}" || true
  sleep 6
  compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
    "SELECT to_email, status, error_message, sent_at FROM email_jobs ORDER BY created_at DESC LIMIT 3;"
  echo ""
  echo "Check recipient inbox (and spam). Host mail log: sudo tail -20 /var/log/mail.log"
fi

echo ""
echo "Done."
