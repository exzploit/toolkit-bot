"""Entrypoint: one process running the Telegram bot and the Mini App web server.

Modes (RUN_MODE env):
  * webhook (production on the Oracle VM): Telegram pushes updates to our
    public HTTPS webhook (via Caddy). Caddy also serves the static Mini App and
    reverse-proxies /api/* here.
  * polling  (local dev): no public URL needed; the bot long-polls Telegram and
    this process also serves the static files + API directly on HOST:PORT.

Run with:  python -m bot.main
"""
from __future__ import annotations

import asyncio
import logging
import signal
from pathlib import Path

from aiohttp import web
from telegram import Update
from telegram.ext import Application

from .config import Config, load_config
from .handlers import register_handlers
from .webapp import build_api_routes, h_webhook

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
# python-telegram-bot sends requests via httpx, which logs the full API URL —
# and that URL contains the bot token. Quiet httpx so the token is never logged.
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("toolkit")

WEBAPP_DIR = Path(__file__).resolve().parent.parent / "webapp"


async def _index(request: web.Request) -> web.Response:
    return web.FileResponse(WEBAPP_DIR / "index.html")


def build_web_app(cfg: Config, application: Application) -> web.Application:
    app = web.Application(client_max_size=50 * 1024 * 1024)  # 50 MB uploads
    app["config"] = cfg
    app["application"] = application
    app["bot"] = application.bot

    app.add_routes(build_api_routes())
    # Telegram webhook (only meaningful in webhook mode, harmless otherwise).
    app.router.add_post(cfg.webhook_path, h_webhook)
    # Static Mini App. Caddy normally serves these in production, but having the
    # Python process serve them too means it works standalone for dev.
    app.router.add_get("/", _index)
    app.router.add_static("/", WEBAPP_DIR, show_index=False)
    return app


async def run() -> None:
    cfg = load_config()
    application = Application.builder().token(cfg.bot_token).updater(None).build()
    application.bot_data["config"] = cfg
    register_handlers(application)

    web_app = build_web_app(cfg, application)
    runner = web.AppRunner(web_app)
    await runner.setup()
    site = web.TCPSite(runner, cfg.host, cfg.port)

    await application.initialize()
    await application.start()
    await site.start()
    log.info("Web server listening on http://%s:%s", cfg.host, cfg.port)

    polling = cfg.run_mode == "polling"
    if polling:
        await application.updater.start_polling(allowed_updates=Update.ALL_TYPES)
        log.info("Bot running in POLLING mode")
    else:
        await application.bot.set_webhook(
            url=cfg.webhook_url,
            secret_token=cfg.webhook_secret,
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True,
        )
        log.info("Webhook set to %s", cfg.webhook_url)

    # Block until a termination signal arrives.
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:
            pass
    await stop.wait()

    log.info("Shutting down…")
    if polling and application.updater:
        await application.updater.stop()
    await application.stop()
    await application.shutdown()
    await runner.cleanup()


def main() -> None:
    try:
        asyncio.run(run())
    except (KeyboardInterrupt, SystemExit):
        pass


if __name__ == "__main__":
    main()
