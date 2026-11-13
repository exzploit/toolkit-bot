"""Log hygiene: redact secrets, and keep a recent-lines buffer for the owner panel.

Why this exists: the webhook secret is part of the URL path
(``/telegram/<secret>``), so it appeared in the startup message and in every
access-log line; bot tokens and bearer tokens can leak the same way. Redaction
is applied to *every* handler (journal included), not just the viewer.
"""
from __future__ import annotations

import collections
import logging
import re

_PATTERNS = [
    (re.compile(r"/telegram/[A-Za-z0-9_\-]{8,}"), "/telegram/***"),                       # webhook secret in a path
    # Telegram bot token, e.g. ".../bot8128928618:AAEx.../getMe". No leading \b: "t" and "8" are both
    # word characters, so a word boundary never matches between "bot" and the id.
    (re.compile(r"(?<!\d)\d{6,12}:[A-Za-z0-9_\-]{30,}"), "***:***"),
    # key=value secrets, including prefixed names such as BOT_TOKEN= / HF_TOKEN= / WEBHOOK_SECRET=
    (re.compile(r"(?i)([A-Za-z0-9_\-]*(?:token|secret|api[_-]?key|authorization|password|hash))=([^\s&\"']+)"), r"\1=***"),
    (re.compile(r"(?i)\b(bearer\s+)[A-Za-z0-9._\-]{10,}"), r"\1***"),
]
_ACCESS_STATUS = re.compile(r'HTTP/\d\.\d" (\d{3})')


def redact(text: str) -> str:
    for rx, repl in _PATTERNS:
        text = rx.sub(repl, text)
    return text


class RedactFilter(logging.Filter):
    """Scrub secrets from a record in place, before any handler formats it."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
            red = redact(msg)
            if red != msg:
                record.msg, record.args = red, ()
        except Exception:
            pass
        return True


class RingHandler(logging.Handler):
    """Keeps the most recent log lines in memory (redacted) for the owner panel."""

    def __init__(self, capacity: int = 400):
        super().__init__(logging.INFO)
        self.buf: collections.deque[str] = collections.deque(maxlen=capacity)
        self.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

    def emit(self, record: logging.LogRecord) -> None:
        try:
            if record.name == "aiohttp.access":  # one line per request: only keep failures
                m = _ACCESS_STATUS.search(record.getMessage())
                if not m or int(m.group(1)) < 400:
                    return
            self.buf.append(redact(self.format(record)))
        except Exception:
            pass

    def lines(self, n: int = 150) -> list[str]:
        return list(self.buf)[-max(1, n):]


RING = RingHandler()


def install(root: logging.Logger | None = None) -> None:
    """Attach the ring buffer and the redaction filter to the root logger (idempotent)."""
    root = root or logging.getLogger()
    if RING not in root.handlers:
        root.addHandler(RING)
    for h in root.handlers:
        if not any(isinstance(f, RedactFilter) for f in h.filters):
            h.addFilter(RedactFilter())
