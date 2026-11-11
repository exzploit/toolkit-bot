"""Password generation and a small educational hash-identification/cracker.

The password generator uses ``secrets`` (a CSPRNG) rather than ``random`` —
the old client-side version used ``Math.random()``, which is not suitable for
passwords. The hash cracker is intentionally a tiny common-password check: it is
honest about being a demo and never claims capabilities it doesn't have.
"""
from __future__ import annotations

import hashlib
import secrets
import string

_LOWER = string.ascii_lowercase
_UPPER = string.ascii_uppercase
_DIGITS = string.digits
_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?"

# Short list of the most common passwords, for a "is this hash trivial?" demo.
_COMMON = [
    "123456", "password", "123456789", "12345678", "12345", "qwerty",
    "abc123", "111111", "1234567", "sunshine", "iloveyou", "admin",
    "welcome", "monkey", "letmein", "dragon", "football", "princess",
    "123123", "000000", "qwerty123", "password1", "root", "toor",
]


def generate_password(length: int = 16, *, upper: bool = True, digits: bool = True,
                      symbols: bool = True) -> dict:
    length = max(6, min(int(length), 64))
    pools = [_LOWER]
    if upper:
        pools.append(_UPPER)
    if digits:
        pools.append(_DIGITS)
    if symbols:
        pools.append(_SYMBOLS)

    alphabet = "".join(pools)
    # Guarantee at least one char from each selected pool, then fill the rest.
    chars = [secrets.choice(pool) for pool in pools]
    chars += [secrets.choice(alphabet) for _ in range(length - len(chars))]
    secrets.SystemRandom().shuffle(chars)
    pw = "".join(chars)

    return {
        "success": True,
        "password": pw,
        "length": len(pw),
        "entropy_bits": round(len(pw) * (len(alphabet).bit_length()), 1),
    }


_ALGOS = {
    32: "md5",
    40: "sha1",
    64: "sha256",
}


def crack_hash(value: str, algo: str | None = None) -> dict:
    """Identify the likely algorithm and try a common-password dictionary."""
    h = (value or "").strip().lower()
    if not all(c in "0123456789abcdef" for c in h) or len(h) not in _ALGOS:
        return {"success": False, "error": "Not a recognised MD5/SHA-1/SHA-256 hex hash"}

    algo = (algo or _ALGOS[len(h)]).lower()
    if algo not in ("md5", "sha1", "sha256"):
        return {"success": False, "error": "Unsupported algorithm"}

    hasher = getattr(hashlib, algo)
    for word in _COMMON:
        if hasher(word.encode()).hexdigest() == h:
            return {"success": True, "algorithm": algo, "password": word}
    return {
        "success": True,
        "algorithm": algo,
        "password": None,
        "note": "Not in the common-password list (this is a small demo dictionary, not a real cracker).",
    }
