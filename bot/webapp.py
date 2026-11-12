"""aiohttp routes for the Mini App API and the Telegram webhook.

Every ``/api/*`` request must carry a valid Telegram ``initData`` (header
``X-Init-Data`` for JSON requests, or an ``initData`` form field for uploads).
We verify its signature and derive the user id from the *verified* payload, so a
client can never make the bot act on behalf of someone else.
"""
from __future__ import annotations

import asyncio
import io
import logging

from aiohttp import web
from telegram import Update

from .config import Config
from .telegram_auth import InvalidInitData, TelegramUser, verify_init_data
from .tools import aidetect, media, network, osint, security

log = logging.getLogger("toolkit.webapp")


def _auth(request: web.Request, init_data: str | None = None) -> TelegramUser:
    cfg: Config = request.app["config"]
    init_data = init_data or request.headers.get("X-Init-Data", "")
    try:
        return verify_init_data(init_data, cfg.bot_token)
    except InvalidInitData as e:
        raise web.HTTPUnauthorized(text=f"Unauthorized: {e}")


async def _json_body(request: web.Request) -> dict:
    try:
        data = await request.json()
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _ok(data: dict) -> web.Response:
    return web.json_response(data)


# --------------------------------------------------------------------------- #
# Stateless compute endpoints
# --------------------------------------------------------------------------- #
async def h_password(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(security.generate_password(
        b.get("length", 16), upper=b.get("upper", True),
        digits=b.get("digits", True), symbols=b.get("symbols", True)))


async def h_hash(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(security.crack_hash(b.get("hash", ""), b.get("algo")))


async def h_subnet(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(network.subnet_info(b.get("address", ""), b.get("prefix")))


async def h_portscan(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await network.port_scan(b.get("target", "")))


async def h_domain(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await network.domain_info(b.get("domain", "")))


async def h_ipinfo(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await network.ip_info(b.get("ip")))


async def h_inspect(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await network.inspect_url(b.get("url", "")))


async def h_ssl(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await network.ssl_check(b.get("host", "")))


async def h_dns(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await network.dns_query(b.get("domain", ""), b.get("type", "A")))


async def h_phone(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(osint.phone_lookup(b.get("number", ""), b.get("region")))


async def h_username(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await osint.username_search(b.get("username", "")))


async def h_breach(request):
    _auth(request)
    cfg: Config = request.app["config"]
    b = await _json_body(request)
    return _ok(await osint.breach_check(b.get("email", ""), cfg.hibp_api_key))


async def h_dork(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(osint.build_dork(b.get("domain", ""), b.get("kind", "")))


async def h_tgprofile(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await osint.telegram_public_profile(b.get("username", "")))


async def h_media(request):
    _auth(request)
    b = await _json_body(request)
    return _ok(await media.extract_media(b.get("url", "")))


# --------------------------------------------------------------------------- #
# Endpoints that deliver a result to the user's Telegram chat
# --------------------------------------------------------------------------- #
async def h_share(request):
    user = _auth(request)
    bot = request.app["bot"]
    b = await _json_body(request)
    text = (b.get("text") or "").strip()
    if not text:
        return _ok({"success": False, "error": "Nothing to share"})
    text = text[:3800]  # Telegram message limit headroom
    try:
        # Plain text (no parse_mode) so user content can't inject markup.
        await bot.send_message(chat_id=user.id, text=text, disable_web_page_preview=True)
        return _ok({"success": True})
    except Exception as e:
        log.warning("share delivery failed: %s", e)
        return _ok({"success": False, "error": "Could not deliver. Open a chat with the bot first."})


async def h_tts(request):
    user = _auth(request)
    b = await _json_body(request)
    bot = request.app["bot"]
    try:
        audio = await media.text_to_speech(b.get("text", ""), b.get("lang", "en"))
    except Exception as e:
        return _ok({"success": False, "error": str(e)})
    try:
        await bot.send_voice(chat_id=user.id, voice=io.BytesIO(audio), filename="speech.ogg")
        return _ok({"success": True, "delivered": True})
    except Exception as e:
        log.warning("tts delivery failed: %s", e)
        return _ok({"success": False, "error": "Could not deliver to chat. Have you started the bot?"})


def _bar(score):
    if score is None:
        return "—"
    filled = round(score * 10)
    return "█" * filled + "░" * (10 - filled) + f" {round(score * 100)}%"


async def h_aidetect(request):
    cfg: Config = request.app["config"]
    bot = request.app["bot"]
    reader = await request.multipart()
    init_data = ""
    text = ""
    file_bytes = b""
    filename = ""
    async for part in reader:
        if part.name == "initData":
            init_data = (await part.text()).strip()
        elif part.name == "text":
            text = await part.text()
        elif part.name == "file":
            filename = part.filename or "file"
            file_bytes = await part.read(decode=False)
    user = _auth(request, init_data)

    if file_bytes:
        try:
            text = await asyncio.to_thread(aidetect.extract_text, filename, file_bytes)
        except Exception as e:
            return _ok({"success": False, "error": f"Could not read file: {e}"})
    if not (text or "").strip():
        return _ok({"success": False, "error": "Provide text or a file with readable text"})

    res = await aidetect.detect(text, hf_token=cfg.hf_token, sapling_key=cfg.sapling_api_key)
    if not res.get("success"):
        return _ok(res)

    # Build a chat report and deliver it.
    lines = [f"🤖 <b>AI detection</b> · {res['chars']} chars"]
    for r in res["results"]:
        s = r.get("score")
        lines.append(f"• <b>{r['name']}</b>: {_bar(s)}" + (f"  <i>{r['note']}</i>" if s is None and r.get("note") else ""))
    if res["aggregate"] is not None:
        lines.append(f"\n<b>Average</b>: {_bar(res['aggregate'])}  ({res['detectors_used']} detectors)")
    lines.append(f"\n⚠️ <i>{res['disclaimer']}</i>")
    report = "\n".join(lines)
    try:
        await bot.send_message(chat_id=user.id, text=report, parse_mode="HTML")
        res["delivered"] = True
    except Exception as e:
        log.warning("aidetect delivery failed: %s", e)
        res["delivered"] = False
    return _ok(res)


async def h_exif(request):
    bot = request.app["bot"]
    reader = await request.multipart()
    init_data = ""
    file_bytes = b""
    filename = "image"
    async for part in reader:
        if part.name == "initData":
            init_data = (await part.text()).strip()
        elif part.name == "file":
            filename = part.filename or "image"
            file_bytes = await part.read(decode=False)
    user = _auth(request, init_data)
    if not file_bytes:
        return _ok({"success": False, "error": "No file received"})
    try:
        clean, fmt = media.strip_exif(file_bytes)
    except Exception as e:
        return _ok({"success": False, "error": f"Not a valid image: {e}"})
    try:
        buf = io.BytesIO(clean)
        buf.name = f"clean.{fmt}"
        await bot.send_document(
            chat_id=user.id, document=buf,
            caption="✅ Metadata stripped — this copy carries no EXIF/GPS data.")
        return _ok({"success": True, "delivered": True})
    except Exception as e:
        log.warning("exif delivery failed: %s", e)
        return _ok({"success": False, "error": "Could not deliver to chat. Have you started the bot?"})


# --------------------------------------------------------------------------- #
# Telegram webhook
# --------------------------------------------------------------------------- #
async def h_webhook(request):
    application = request.app["application"]
    cfg: Config = request.app["config"]
    # Telegram includes our secret token in a header when configured.
    if request.headers.get("X-Telegram-Bot-Api-Secret-Token") != cfg.webhook_secret:
        raise web.HTTPForbidden()
    data = await request.json()
    update = Update.de_json(data, application.bot)
    await application.process_update(update)
    return web.Response(text="OK")


async def h_health(request):
    return web.json_response({"ok": True, "service": "toolkit-bot"})


def build_api_routes() -> list:
    return [
        web.get("/api/health", h_health),
        web.post("/api/password", h_password),
        web.post("/api/hash", h_hash),
        web.post("/api/subnet", h_subnet),
        web.post("/api/portscan", h_portscan),
        web.post("/api/domain", h_domain),
        web.post("/api/ipinfo", h_ipinfo),
        web.post("/api/inspect", h_inspect),
        web.post("/api/ssl", h_ssl),
        web.post("/api/dns", h_dns),
        web.post("/api/phone", h_phone),
        web.post("/api/username", h_username),
        web.post("/api/breach", h_breach),
        web.post("/api/dork", h_dork),
        web.post("/api/tgprofile", h_tgprofile),
        web.post("/api/media", h_media),
        web.post("/api/share", h_share),
        web.post("/api/tts", h_tts),
        web.post("/api/exif", h_exif),
        web.post("/api/aidetect", h_aidetect),
    ]
