"""Verify Telegram Mini App ``initData``.

The Mini App frontend receives a signed ``initData`` string from Telegram
(``window.Telegram.WebApp.initData``). We must verify its HMAC signature
*server-side* and derive the user from the verified payload — never trust a
``chatId`` or user id sent as a plain parameter by the client.

Algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl


class InvalidInitData(Exception):
    """Raised when initData is missing, malformed, expired, or forged."""


@dataclass(frozen=True)
class TelegramUser:
    id: int
    first_name: str
    username: str | None
    language_code: str | None


# initData older than this is rejected (replay protection).
MAX_AGE_SECONDS = 24 * 60 * 60


def verify_init_data(init_data: str, bot_token: str, *, max_age: int = MAX_AGE_SECONDS) -> TelegramUser:
    """Validate ``init_data`` and return the authenticated Telegram user.

    Raises :class:`InvalidInitData` on any failure. Constant-time hash compare.
    """
    if not init_data:
        raise InvalidInitData("empty initData")

    # Keep raw values (do NOT url-decode twice); parse_qsl already decodes once.
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))

    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise InvalidInitData("missing hash")

    # Build the data-check-string: all remaining keys sorted, joined by "\n".
    data_check_string = "\n".join(
        f"{k}={pairs[k]}" for k in sorted(pairs.keys())
    )

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise InvalidInitData("hash mismatch (forged or wrong bot token)")

    # Replay / freshness check.
    try:
        auth_date = int(pairs.get("auth_date", "0"))
    except ValueError:
        raise InvalidInitData("bad auth_date")
    if auth_date <= 0 or (time.time() - auth_date) > max_age:
        raise InvalidInitData("initData expired")

    # Extract the user object.
    user_raw = pairs.get("user")
    if not user_raw:
        raise InvalidInitData("no user in initData")
    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError:
        raise InvalidInitData("malformed user json")

    uid = user.get("id")
    if not isinstance(uid, int):
        raise InvalidInitData("missing user id")

    return TelegramUser(
        id=uid,
        first_name=user.get("first_name", ""),
        username=user.get("username"),
        language_code=user.get("language_code"),
    )
