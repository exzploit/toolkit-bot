#!/usr/bin/env bash
# One-command update: pull latest code, refresh dependencies, restart the bot.
# Usage:  /opt/toolkit-bot/deploy/update.sh
set -euo pipefail

cd /opt/toolkit-bot
echo "▸ Pulling latest code…"
git pull --ff-only
echo "▸ Updating dependencies…"
.venv/bin/pip install -q -r requirements.txt
echo "▸ Restarting service…"
sudo systemctl restart toolkit-bot
sleep 3
echo "▸ Recent logs:"
journalctl -u toolkit-bot --no-pager -n 8
echo "✅ Done."
