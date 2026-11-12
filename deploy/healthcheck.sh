#!/usr/bin/env bash
# Uptime self-check: if the bot's health endpoint is unreachable, try one
# restart and DM the owner on Telegram with the outcome.
#
# Setup (one time):
#   1. Get your numeric Telegram id by messaging @userinfobot, then:
#        echo 'OWNER_ID=123456789' >> /opt/toolkit-bot/.env
#      (OWNER_ID is read here; the bot itself ignores it.)
#   2. Schedule it every 5 minutes:
#        ( crontab -l 2>/dev/null; echo '*/5 * * * * /opt/toolkit-bot/deploy/healthcheck.sh' ) | crontab -
set -euo pipefail
cd /opt/toolkit-bot
set -a; source .env; set +a

alert() { [ -n "${OWNER_ID:-}" ] && [ -n "${BOT_TOKEN:-}" ] && \
  curl -fsS "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
       -d chat_id="${OWNER_ID}" -d text="$1" >/dev/null 2>&1 || true; }

health() { curl -fsS --max-time 10 http://127.0.0.1:8080/api/health >/dev/null 2>&1; }

# Healthy — nothing to do.
health && exit 0

# Unhealthy: attempt a restart, then re-check.
sudo systemctl restart toolkit-bot 2>/dev/null || true
sleep 6

if health; then
  alert "⚠️ Toolkit was unresponsive and has been auto-restarted. It's back up."
else
  alert "🚨 Toolkit is DOWN and the auto-restart failed. Check the server: journalctl -u toolkit-bot -n 50"
fi
