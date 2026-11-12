"""Central configuration, loaded once from the environment.

In production the values come from the systemd unit's EnvironmentFile (.env).
For local development you can `export` them or use a tool like python-dotenv.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


def _get(name: str, default: str | None = None, *, required: bool = False) -> str:
    val = os.environ.get(name, default)
    if required and not val:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            f"See .env.example."
        )
    return val or ""


@dataclass(frozen=True)
class Config:
    bot_token: str
    public_url: str
    host: str
    port: int
    webhook_secret: str
    hibp_api_key: str
    hf_token: str
    sapling_api_key: str
    run_mode: str  # "webhook" | "polling"

    @property
    def webhook_path(self) -> str:
        # Unguessable path so random scanners can't feed us fake updates.
        return f"/telegram/{self.webhook_secret}"

    @property
    def webhook_url(self) -> str:
        return f"{self.public_url.rstrip('/')}{self.webhook_path}"


def load_config() -> Config:
    return Config(
        bot_token=_get("BOT_TOKEN", required=True),
        public_url=_get("PUBLIC_URL"),
        host=_get("HOST", "127.0.0.1"),
        port=int(_get("PORT", "8080")),
        webhook_secret=_get("WEBHOOK_SECRET", "dev-secret"),
        hibp_api_key=_get("HIBP_API_KEY"),
        hf_token=_get("HF_TOKEN"),
        sapling_api_key=_get("SAPLING_API_KEY"),
        run_mode=_get("RUN_MODE", "webhook").lower(),
    )
