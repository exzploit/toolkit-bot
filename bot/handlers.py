"""Telegram bot command handlers.

The bot's main job is to launch the Mini App, but a few tools are also exposed
as plain chat commands so they work without opening the web view.
"""
from __future__ import annotations

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
    WebAppInfo,
)
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

from .config import Config
from .tools import network, osint, security


def _webapp_markup(public_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("🧰 Open Toolkit", web_app=WebAppInfo(url=public_url))]]
    )


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    cfg: Config = context.application.bot_data["config"]
    name = update.effective_user.first_name if update.effective_user else "there"
    text = (
        f"👋 Hi {name}!\n\n"
        "This is <b>Toolkit</b> — a bundle of network, text and privacy utilities.\n\n"
        "Tap the button below to open the full app, or use quick commands:\n"
        "• <code>/password [length]</code>\n"
        "• <code>/subnet 192.168.1.0/24</code>\n"
        "• <code>/phone +14155552671</code>\n"
        "• <code>/ip</code> — info about an address\n"
        "• <code>/help</code>"
    )
    markup = _webapp_markup(cfg.public_url) if cfg.public_url.startswith("https://") else None
    await update.message.reply_html(text, reply_markup=markup)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(
        "<b>Toolkit commands</b>\n"
        "/start — open the Mini App\n"
        "/password [6-64] — generate a strong password\n"
        "/subnet &lt;cidr&gt; — IPv4/IPv6 subnet details\n"
        "/phone &lt;+number&gt; — phone metadata\n"
        "/ip [address] — IP geolocation/ASN\n\n"
        "The Mini App has the rest: media downloads, EXIF stripper, "
        "QR, TTS, domain lookup, port probe and more."
    )


async def cmd_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    length = 16
    if context.args:
        try:
            length = int(context.args[0])
        except ValueError:
            pass
    res = security.generate_password(length)
    await update.message.reply_html(
        f"🔐 <code>{res['password']}</code>\n<i>{res['entropy_bits']} bits of entropy</i>"
    )


async def cmd_subnet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /subnet 192.168.1.0/24")
        return
    res = network.subnet_info(context.args[0])
    if not res["success"]:
        await update.message.reply_text(f"❌ {res['error']}")
        return
    await update.message.reply_html(
        f"<b>{res['cidr']}</b>\n"
        f"Netmask: <code>{res['netmask']}</code>\n"
        f"Range: <code>{res['first_host']} – {res['last_host']}</code>\n"
        f"Broadcast: <code>{res['broadcast']}</code>\n"
        f"Usable hosts: <b>{res['usable_hosts']:,}</b>"
    )


async def cmd_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /phone +14155552671")
        return
    res = osint.phone_lookup(" ".join(context.args))
    if not res["success"]:
        await update.message.reply_text(f"❌ {res['error']}")
        return
    await update.message.reply_html(
        f"📞 <b>{res['formatted']}</b>\n"
        f"Region: {res['region']}\n"
        f"Carrier: {res['carrier']}\n"
        f"Timezone: {res['timezone']}\n"
        f"Type: {res['line_type']}"
    )


async def cmd_ip(update: Update, context: ContextTypes.DEFAULT_TYPE):
    ip = context.args[0] if context.args else None
    res = await network.ip_info(ip)
    if not res["success"]:
        await update.message.reply_text(f"❌ {res['error']}")
        return
    await update.message.reply_html(
        f"🌐 <b>{res['query']}</b>\n"
        f"{res['city']}, {res['regionName']}, {res['country']}\n"
        f"ISP: {res['isp']}\n"
        f"ASN: {res['as']}\n"
        f"Timezone: {res['timezone']}"
    )


def register_handlers(application: Application) -> None:
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("password", cmd_password))
    application.add_handler(CommandHandler("subnet", cmd_subnet))
    application.add_handler(CommandHandler("phone", cmd_phone))
    application.add_handler(CommandHandler("ip", cmd_ip))
