# 🧰 Toolkit Bot

A self-hosted Telegram **bot + Mini App** bundling network, text and privacy
utilities. Rewritten from the ground up to run as **one process** on a single
always-on server (e.g. Oracle Cloud Free Tier) — no Vercel, no serverless
function sprawl.

## What changed in the rewrite

The old version was split across **four languages** (Node, Python, Go, Rust)
as separate Vercel serverless functions — a structure forced entirely by
Vercel's per-function model. This rewrite collapses everything into **one
Python service**:

| Before (Vercel) | After |
|---|---|
| `api/bot.js`, `api/media.js`, `api/currency.js`, `api/domain.js` (Node) | `bot/` (Python) |
| `api/python_tools.py`, `api/speedtest.py`, `api/strip-exif.py` (Python) | `bot/tools/` |
| `api/scan.go` (Go port scanner) | `bot/tools/network.py` |
| `rust-vault/` (Rust→WASM encryption) | client-side **WebCrypto** (PBKDF2 + AES-256-GCM) |
| trusts client-supplied `chatId` | verifies Telegram **initData HMAC** server-side |
| fake/hardcoded "breach" results | real **Have I Been Pwned** API (or honest "not configured") |
| `ytdl-core` / `instagram-url-direct` / `tiktok-api-dl` | **yt-dlp** |

### Removed on purpose
- **Server-side speed test** — it measured the *server's* bandwidth, not the
  user's, so the number was meaningless.
- **Rust/WASM vault** — replaced by WebCrypto (stronger key derivation, zero
  build step, nothing leaves the browser).
- Audio converter / metronome gimmicks.

## Tools

**Tools:** password generator (CSPRNG), secure vault (client-side AES-256-GCM),
Morse, text transforms, QR codes, hash cracker (educational), coin/dice,
text-to-speech.

**Network:** subnet calculator, port probe, domain DNS + RDAP/WHOIS, IP info,
URL inspector, phone metadata, username existence check, Google dork builder,
breach check (HIBP), public Telegram profile.

**Media:** video downloader (yt-dlp), EXIF/metadata stripper.

## Architecture

```
Internet ──HTTPS──▶ Caddy (auto-TLS)
                      ├── /          → static Mini App (webapp/)
                      ├── /api/*      → Python service (:8080)
                      └── /telegram/* → Python service (bot webhook)

Python (systemd): aiohttp + python-telegram-bot
   ├── bot commands (/start, /password, /subnet, /phone, /ip)
   └── Mini App JSON API (all tools, each verifying initData)
```

## Quick start

See **[deploy/README.md](deploy/README.md)** for the full Oracle Cloud Free Tier
walkthrough. Local dev:

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # set BOT_TOKEN, RUN_MODE=polling
python -m bot.main
```

## Security notes

- Every `/api/*` request must carry a valid Telegram `initData`; the server
  verifies the HMAC and derives the user from the *verified* payload. Opening
  the Mini App URL in a normal browser will (correctly) fail auth.
- The webhook is protected by an unguessable path **and** Telegram's secret
  token header.
- `.env` holds all secrets and is git-ignored.

## Responsible use

The network/OSINT tools query only **public** endpoints and metadata. Use the
port probe and recon tools only against systems you own or are authorised to
test. The breach checker requires your own HIBP key and never fabricates data.
