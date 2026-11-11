#!/usr/bin/env bash
# Keep your DuckDNS subdomain pointed at this server's current public IP.
#
# Oracle "ephemeral" public IPs can change if the instance is stopped/started.
# Run this on a schedule (cron) so DNS always follows the server.
#
# Reads its config from /opt/toolkit-bot/duckdns.conf (git-ignored), e.g.:
#     DUCKDNS_DOMAIN=toolkitbot
#     DUCKDNS_TOKEN=your-duckdns-token
#
# Setup (one time):
#     printf 'DUCKDNS_DOMAIN=toolkitbot\nDUCKDNS_TOKEN=YOUR_TOKEN\n' > /opt/toolkit-bot/duckdns.conf
#     chmod 600 /opt/toolkit-bot/duckdns.conf
#     ( crontab -l 2>/dev/null; echo '*/5 * * * * /opt/toolkit-bot/deploy/duckdns-update.sh' ) | crontab -
set -euo pipefail

CONF="${DUCKDNS_CONF:-/opt/toolkit-bot/duckdns.conf}"
# shellcheck disable=SC1090
source "$CONF"

# Leaving ip= blank tells DuckDNS to use the request's source IP (this server).
resp=$(curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=")
echo "$(date -u +%FT%TZ) duckdns: ${resp}"
[ "$resp" = "OK" ]
