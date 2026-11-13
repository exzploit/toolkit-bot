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
import os
import re
import time

from aiohttp import web
from telegram import Update

from . import logsafe, sysinfo
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
# Safe multipart uploads
#
# aiohttp's client_max_size does NOT apply to streamed multipart parts, so a
# naive ``await part.read()`` buffers whatever the client sends — and doing so
# before authenticating lets anyone on the internet exhaust memory. Uploads
# therefore go through _read_upload: initData must be the first field and is
# verified before any file byte is read, and every part is size-capped.
# --------------------------------------------------------------------------- #
class UploadError(Exception):
    """A rejected upload; the message is safe to show to the user."""


def _fmt_size(n: int) -> str:
    return f"{n // (1024 * 1024)} MB" if n >= 1024 * 1024 else f"{max(1, n // 1024)} KB"


async def _read_part(part, cap: int) -> bytes:
    """Read one multipart part without ever buffering more than ``cap`` bytes."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await part.read_chunk(65536)
        if not chunk:
            break
        total += len(chunk)
        if total > cap:
            raise UploadError(f"That's too large (limit {_fmt_size(cap)})")
        chunks.append(chunk)
    return b"".join(chunks)


async def _read_upload(request: web.Request, *, file_cap: int, text_cap: int = 0, text_fields: tuple = ()):
    """Return ``(user, text_fields, filename, file_bytes)``."""
    if not request.content_type.startswith("multipart/"):
        raise UploadError("Expected a file upload")
    user: TelegramUser | None = None
    fields: dict[str, str] = {}
    filename, data = "", b""
    try:
        reader = await request.multipart()
        async for part in reader:
            if part.name == "initData":
                user = _auth(request, (await _read_part(part, 8192)).decode("utf-8", "replace").strip())
                continue
            if user is None:  # nothing but initData may precede authentication
                raise web.HTTPUnauthorized(text="Unauthorized: initData must be the first field")
            if part.name == "file":
                filename = part.filename or "file"
                data = await _read_part(part, file_cap)
            elif part.name in text_fields:
                fields[part.name] = (await _read_part(part, text_cap)).decode("utf-8", "replace")
            else:
                await part.release()  # unknown field: drain without buffering
    except (UploadError, web.HTTPException):
        raise
    except Exception as e:  # missing boundary, truncated body, bad framing...
        log.info("malformed upload rejected: %s", e.__class__.__name__)
        raise UploadError("Malformed upload")
    if user is None:
        raise web.HTTPUnauthorized(text="Unauthorized: missing initData")
    return user, fields, filename, data


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


_COOLDOWNS: dict[tuple[int, str], float] = {}


def _cooldown_ok(user_id: int, key: str, seconds: float) -> bool:
    """Per-user minimum gap between calls to an expensive endpoint."""
    now = time.monotonic()
    if now - _COOLDOWNS.get((user_id, key), -1e9) < seconds:
        return False
    _COOLDOWNS[(user_id, key)] = now
    if len(_COOLDOWNS) > 5000:  # keep the map bounded
        for k in [k for k, t in _COOLDOWNS.items() if now - t > 3600]:
            _COOLDOWNS.pop(k, None)
    return True


# --------------------------------------------------------------------------- #
# Owner panel + anonymous usage counts
# --------------------------------------------------------------------------- #
_TOOL_ID = re.compile(r"[a-z0-9_]{1,32}")


def _is_owner(request: web.Request, user: TelegramUser) -> bool:
    cfg: Config = request.app["config"]
    return bool(cfg.owner_id) and user.id == cfg.owner_id   # OWNER_ID unset -> nobody is the owner


async def h_me(request):
    user = _auth(request)
    return _ok({"success": True, "owner": _is_owner(request, user)})


async def h_usage(request):
    """Count one open of a tool. Stores only (tool, day) -> count; never the user."""
    _auth(request)
    b = await _json_body(request)
    tool = b.get("tool", "")
    if not isinstance(tool, str) or not _TOOL_ID.fullmatch(tool):
        return _ok({"success": False})
    ok = await asyncio.to_thread(request.app["store"].record, tool)
    return _ok({"success": ok})


async def h_admin(request):
    user = _auth(request)
    if not _is_owner(request, user):
        return _ok({"success": False, "error": "Owner only"})
    bot = request.app["bot"]
    try:
        wh = await asyncio.wait_for(bot.get_webhook_info(), timeout=5)
        # Deliberately NOT returning wh.url: it contains the webhook secret.
        telegram = {"pending": wh.pending_update_count,
                    "last_error": logsafe.redact(wh.last_error_message or ""),
                    "last_error_date": wh.last_error_date.isoformat() if wh.last_error_date else None}
    except Exception as e:
        telegram = {"error": logsafe.redact(str(e))[:120]}
    usage = await asyncio.to_thread(request.app["store"].summary)
    return _ok({"success": True, "status": sysinfo.read_status(), "telegram": telegram, "usage": usage})


async def h_admin_logs(request):
    user = _auth(request)
    if not _is_owner(request, user):
        return _ok({"success": False, "error": "Owner only"})
    b = await _json_body(request)
    try:
        n = int(b.get("lines", 150))
    except (TypeError, ValueError):
        n = 150
    return _ok({"success": True, "lines": logsafe.RING.lines(max(10, min(n, 400)))})


async def h_subdomains(request):
    user = _auth(request)
    b = await _json_body(request)
    if not _cooldown_ok(user.id, "subdomains", 8):
        return _ok({"success": False, "error": "Please wait a few seconds between lookups."})
    return _ok(await network.subdomain_lookup(b.get("domain", ""), bool(b.get("resolve"))))


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
    try:
        user, fields, filename, file_bytes = await _read_upload(
            request, file_cap=10 * 1024 * 1024, text_cap=200_000, text_fields=("text",))
    except UploadError as e:
        return _ok({"success": False, "error": str(e)})
    text = fields.get("text", "")

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


_DOC_EXTS = {".pdf", ".docx", ".md", ".txt", ".csv", ".png"}
_DOC_MAX = 25 * 1024 * 1024


def _safe_filename(name: str, default: str = "document") -> str:
    name = os.path.basename((name or "").replace("\\", "/"))
    name = re.sub(r"[^\w.\- ()]+", "_", name, flags=re.UNICODE).strip(" .")[:80]
    return name or default


async def h_senddoc(request):
    """Deliver a file the browser generated (PDF, cleaned DOCX, …) to the user's chat.

    Telegram WebViews often can't download blobs, so this is the reliable path.
    """
    bot = request.app["bot"]
    try:
        user, fields, filename, data = await _read_upload(
            request, file_cap=_DOC_MAX, text_cap=300, text_fields=("caption",))
    except UploadError as e:
        return _ok({"success": False, "error": str(e)})
    if not data:
        return _ok({"success": False, "error": "No file received"})
    name = _safe_filename(filename)
    if os.path.splitext(name)[1].lower() not in _DOC_EXTS:
        return _ok({"success": False, "error": "That file type can't be sent"})
    if not _cooldown_ok(user.id, "senddoc", 2):
        return _ok({"success": False, "error": "Please wait a moment between sends."})
    try:
        await bot.send_document(chat_id=user.id, document=io.BytesIO(data), filename=name,
                                caption=(fields.get("caption") or None))
        return _ok({"success": True})
    except Exception as e:
        log.warning("senddoc delivery failed: %s", e)
        return _ok({"success": False, "error": "Could not deliver to chat. Have you started the bot?"})


async def h_exif(request):
    bot = request.app["bot"]
    try:
        user, _, filename, file_bytes = await _read_upload(request, file_cap=20 * 1024 * 1024)
    except UploadError as e:
        return _ok({"success": False, "error": str(e)})
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
        web.post("/api/subdomains", h_subdomains),
        web.post("/api/me", h_me),
        web.post("/api/usage", h_usage),
        web.post("/api/admin", h_admin),
        web.post("/api/admin/logs", h_admin_logs),
        web.post("/api/phone", h_phone),
        web.post("/api/username", h_username),
        web.post("/api/breach", h_breach),
        web.post("/api/dork", h_dork),
        web.post("/api/tgprofile", h_tgprofile),
        web.post("/api/media", h_media),
        web.post("/api/share", h_share),
        web.post("/api/tts", h_tts),
        web.post("/api/exif", h_exif),
        web.post("/api/senddoc", h_senddoc),
        web.post("/api/aidetect", h_aidetect),
    ]
