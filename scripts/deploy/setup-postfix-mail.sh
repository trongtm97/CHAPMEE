#!/usr/bin/env bash
# Idempotent Postfix + OpenDKIM setup for ChapMee on Vietnix VPS.
# App runs in Docker; Postfix on host relays outbound mail with DKIM.
#
# Run on VPS (sudo):
#   cd /opt/chapmee/app
#   sudo ./scripts/deploy/setup-postfix-mail.sh
#
# Options:
#   CHAPMEE_MAIL_DOMAIN=chapmee.com
#   CHAPMEE_DOCKER_NETWORK=chapmee_chapmee_net
#   CHAPMEE_HOSTNAME=mail.chapmee.com

set -euo pipefail

CHAPMEE_MAIL_DOMAIN="${CHAPMEE_MAIL_DOMAIN:-chapmee.com}"
CHAPMEE_DOCKER_NETWORK="${CHAPMEE_DOCKER_NETWORK:-chapmee_chapmee_net}"
CHAPMEE_HOSTNAME="${CHAPMEE_HOSTNAME:-mail.${CHAPMEE_MAIL_DOMAIN}}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

echo "==> Installing Postfix + OpenDKIM (if missing)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y postfix opendkim opendkim-tools >/dev/null

echo "==> Detecting Docker bridge gateway for ${CHAPMEE_DOCKER_NETWORK}"
if ! docker network inspect "$CHAPMEE_DOCKER_NETWORK" >/dev/null 2>&1; then
  echo "WARN: Docker network ${CHAPMEE_DOCKER_NETWORK} not found yet."
  echo "      Start compose first: dcp up -d"
  DOCKER_GW="172.18.0.1"
  DOCKER_SUBNET="172.18.0.0/16"
else
  DOCKER_GW="$(docker network inspect "$CHAPMEE_DOCKER_NETWORK" -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}')"
  DOCKER_SUBNET="$(docker network inspect "$CHAPMEE_DOCKER_NETWORK" -f '{{range .IPAM.Config}}{{.Subnet}}{{end}}')"
fi

echo "    gateway=${DOCKER_GW} subnet=${DOCKER_SUBNET}"

echo "==> Configuring Postfix"
postconf -e "myhostname = ${CHAPMEE_HOSTNAME}"
postconf -e "mydomain = ${CHAPMEE_MAIL_DOMAIN}"
postconf -e "myorigin = \$mydomain"
postconf -e "inet_interfaces = 127.0.0.1, ${DOCKER_GW}"
postconf -e "mynetworks = 127.0.0.0/8, ${DOCKER_SUBNET}"
postconf -e "smtpd_tls_security_level = none"
postconf -e "smtp_tls_security_level = may"
postconf -e "smtpd_milters = inet:localhost:8891"
postconf -e "non_smtpd_milters = inet:localhost:8891"
postconf -e "milter_default_action = accept"
postconf -e "milter_protocol = 6"
postfix check

echo "==> Configuring UFW (SMTP from Docker subnet only)"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow from "${DOCKER_SUBNET}" to any port 25 proto tcp comment "Postfix for ChapMee Docker" || true
else
  echo "    (ufw inactive — skip)"
fi

echo "==> Configuring OpenDKIM"
install -d -m 0750 -o opendkim -g opendkim /etc/opendkim/keys/"${CHAPMEE_MAIL_DOMAIN}"

KEY_DIR="/etc/opendkim/keys/${CHAPMEE_MAIL_DOMAIN}"
if [ ! -f "${KEY_DIR}/default.private" ]; then
  echo "    Generating DKIM key for ${CHAPMEE_MAIL_DOMAIN}"
  opendkim-genkey -b 2048 -d "${CHAPMEE_MAIL_DOMAIN}" -s default -D "${KEY_DIR}"
  chown opendkim:opendkim "${KEY_DIR}/default.private"
  chmod 600 "${KEY_DIR}/default.private"
fi

cat > /etc/opendkim/key.table <<EOF
default._domainkey.${CHAPMEE_MAIL_DOMAIN} ${CHAPMEE_MAIL_DOMAIN}:default:${KEY_DIR}/default.private
EOF

cat > /etc/opendkim/signing.table <<EOF
*@${CHAPMEE_MAIL_DOMAIN} default._domainkey.${CHAPMEE_MAIL_DOMAIN}
EOF

cat > /etc/opendkim/trusted.hosts <<EOF
127.0.0.1
localhost
${CHAPMEE_HOSTNAME}
${CHAPMEE_MAIL_DOMAIN}
${DOCKER_SUBNET}
EOF

# refile: prefix required for hash-style tables (Ubuntu package paths below).
sed -i 's|^KeyTable.*|KeyTable refile:/etc/opendkim/key.table|' /etc/opendkim.conf
sed -i 's|^SigningTable.*|SigningTable refile:/etc/opendkim/signing.table|' /etc/opendkim.conf
sed -i 's|^ExternalIgnoreList.*|ExternalIgnoreList refile:/etc/opendkim/trusted.hosts|' /etc/opendkim.conf
sed -i 's|^InternalHosts.*|InternalHosts refile:/etc/opendkim/trusted.hosts|' /etc/opendkim.conf
grep -q '^LogWhy' /etc/opendkim.conf || echo 'LogWhy yes' >> /etc/opendkim.conf

systemctl enable opendkim postfix
systemctl restart opendkim
systemctl restart postfix

echo ""
echo "==> Listening on SMTP"
ss -tlnp | grep ':25 ' || true

echo ""
echo "==> DKIM DNS record (add TXT at default._domainkey.${CHAPMEE_MAIL_DOMAIN} if not present)"
if [ -f "${KEY_DIR}/default.txt" ]; then
  grep -v '^;' "${KEY_DIR}/default.txt" | tr -d '\n\t "' | sed 's/)/ /g' | fold -s -w 72
  echo ""
fi

echo ""
echo "==> Recommended SPF (Cloudflare DNS TXT on ${CHAPMEE_MAIL_DOMAIN})"
VPS_IP="$(curl -4 -fsS --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo "v=spf1 ip4:${VPS_IP} include:_spf.mx.cloudflare.net ~all"

echo ""
echo "==> App env (.env.production) — set:"
echo "EMAIL_MODE=smtp"
echo "SMTP_HOST=host.docker.internal"
echo "SMTP_PORT=25"
echo "SMTP_SECURE=false"
echo "SMTP_TLS_REJECT_UNAUTHORIZED=false"
echo "MAIL_FROM=ChapMee <no-reply@${CHAPMEE_MAIL_DOMAIN}>"
echo ""
echo "Then: dcp up -d web   (recreate web for extra_hosts)"
echo "Verify: ./scripts/deploy/verify-mail.sh"
