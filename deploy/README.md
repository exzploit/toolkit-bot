# Deploying Toolkit on Oracle Cloud Free Tier

This guide takes you from a fresh **Oracle Cloud Always Free** VM to a running
bot with HTTPS, a Mini App, and auto-restart on reboot. No Vercel.

> **Why a VM and not "just Telegram"?** Telegram does not host web apps. A Mini
> App is a webview Telegram opens pointing at *your* HTTPS URL, and a bot needs a
> process running *somewhere*. The Oracle Always Free VM is that "somewhere" —
> one always-on machine that runs the whole thing.

---

## 0. What you need first

- An **Oracle Cloud** account (the Always Free tier is enough).
- A **domain name** you control (e.g. `toolkit.example.com`). Telegram requires
  valid HTTPS; a domain + Caddy gives you an auto-renewing certificate. A free
  subdomain (DuckDNS, etc.) works too.
- A **bot token** from [@BotFather](https://t.me/BotFather).

---

## 1. Create the VM

1. Oracle Console → **Compute → Instances → Create Instance**.
2. Image: **Ubuntu 22.04/24.04**. Shape: any Always Free option
   (`VM.Standard.A1.Flex`, 1 OCPU / 6 GB is plenty).
3. Add your SSH public key, create.
4. Note the **public IPv4 address**.

### Open the firewall (two layers on Oracle)

**a) Security List / NSG** (Console → VCN → your subnet → Security List): add
ingress rules allowing TCP **80** and **443** from `0.0.0.0/0`.

**b) The VM's own iptables** (Oracle Ubuntu images ship with it locked down):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## 2. Point your domain at the VM

Create a DNS **A record**: `toolkit.example.com → <VM public IP>`.
Wait until `dig +short toolkit.example.com` returns the IP.

---

## 3. Install system packages

```bash
sudo apt update && sudo apt install -y python3 python3-venv python3-pip git ffmpeg debian-keyring debian-archive-keyring apt-transport-https curl

# Caddy (official repo)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## 4. Install the app

```bash
sudo useradd -r -m -d /opt/toolkit-bot toolkit || true
sudo git clone https://github.com/exzploit/toolkit-bot.git /opt/toolkit-bot
sudo chown -R toolkit:toolkit /opt/toolkit-bot
cd /opt/toolkit-bot

sudo -u toolkit python3 -m venv .venv
sudo -u toolkit .venv/bin/pip install --upgrade pip
sudo -u toolkit .venv/bin/pip install -r requirements.txt
```

---

## 5. Configure

```bash
sudo -u toolkit cp .env.example .env
sudo -u toolkit nano .env
```

Fill in:

- `BOT_TOKEN` — from BotFather.
- `PUBLIC_URL` — `https://toolkit.example.com` (your domain, no trailing slash).
- `WEBHOOK_SECRET` — generate one:
  `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
- `HIBP_API_KEY` — optional; leave blank to disable the breach checker cleanly.
- Leave `RUN_MODE=webhook`.

---

## 6. Start the service + Caddy

```bash
# App service
sudo cp deploy/toolkit-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now toolkit-bot
sudo journalctl -u toolkit-bot -f      # watch it set the webhook

# Caddy (edit the domain first!)
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile          # change toolkit.example.com
sudo systemctl reload caddy
```

On first start the logs should show `Webhook set to https://…/telegram/…`.
Visit `https://toolkit.example.com/api/health` → `{"ok": true, ...}`.

---

## 7. Wire up the Mini App button in BotFather

So users get an "Open Toolkit" button:

1. [@BotFather](https://t.me/BotFather) → `/mybots` → your bot → **Bot Settings
   → Menu Button → Configure menu button**.
2. Set the URL to `https://toolkit.example.com`.

Now `/start` in your bot shows the launch button, and the menu button opens the
Mini App directly.

---

## 8. Updating later

One command pulls the latest code, refreshes dependencies and restarts:

```bash
/opt/toolkit-bot/deploy/update.sh
```

## 8b. Keep DNS pointed at the server (recommended)

Oracle "ephemeral" public IPs can change if the instance is ever stopped and
started. This keeps your DuckDNS subdomain following the server automatically:

```bash
# Save your DuckDNS domain + token (token stays local, never committed)
printf 'DUCKDNS_DOMAIN=toolkitbot\nDUCKDNS_TOKEN=YOUR_DUCKDNS_TOKEN\n' > /opt/toolkit-bot/duckdns.conf
chmod 600 /opt/toolkit-bot/duckdns.conf

# Run it now to confirm it prints "OK"
/opt/toolkit-bot/deploy/duckdns-update.sh

# Then run it every 5 minutes via cron
( crontab -l 2>/dev/null; echo '*/5 * * * * /opt/toolkit-bot/deploy/duckdns-update.sh' ) | crontab -
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Webhook not set / 401 in logs | `BOT_TOKEN` correct? `PUBLIC_URL` matches the domain and is `https://`? |
| Mini App loads but every tool says "Unauthorized" | The app must be opened **from inside Telegram** (it needs `initData`). Opening the URL in a plain browser will fail auth by design. |
| TLS fails | DNS A record propagated? Ports 80/443 open in *both* the Oracle Security List and the VM's iptables? |
| Breach checker says "not configured" | Expected without `HIBP_API_KEY`. It never invents results. |
| Media downloads fail | `yt-dlp` moves fast; `pip install -U yt-dlp` and restart. |

### Local development without a domain

Set `RUN_MODE=polling` in `.env` and run `python -m bot.main`. The bot long-polls
Telegram (no public URL needed) and serves the Mini App on `http://127.0.0.1:8080`
— though Mini App auth still requires launching from Telegram.
