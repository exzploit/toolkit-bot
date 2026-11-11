"""Media tools: video/audio extraction (yt-dlp), EXIF stripping, text-to-speech.

Blocking libraries (yt-dlp, Pillow, gTTS) are run in a thread executor so they
never block the event loop.
"""
from __future__ import annotations

import asyncio
import io

from PIL import Image

_YTDLP_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "noplaylist": True,
    # Prefer a single progressive file the client can open directly.
    "format": "best[ext=mp4]/best",
}


def _extract_sync(url: str) -> dict:
    import yt_dlp

    with yt_dlp.YoutubeDL(_YTDLP_OPTS) as ydl:
        info = ydl.extract_info(url, download=False)
    if "entries" in info:  # defensive: playlist slipped through
        info = info["entries"][0]
    return {
        "success": True,
        "title": info.get("title", "media"),
        "url": info.get("url"),
        "ext": info.get("ext", "mp4"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "uploader": info.get("uploader"),
    }


async def extract_media(url: str) -> dict:
    url = (url or "").strip()
    if not url.startswith(("http://", "https://")):
        return {"success": False, "error": "Enter a full video/post URL"}
    try:
        return await asyncio.to_thread(_extract_sync, url)
    except Exception as e:
        msg = str(e).splitlines()[-1] if str(e) else "Extraction failed"
        return {"success": False, "error": msg}


def strip_exif(image_bytes: bytes) -> tuple[bytes, str]:
    """Return a copy of the image with all metadata removed, plus its format."""
    img = Image.open(io.BytesIO(image_bytes))
    fmt = (img.format or "JPEG").upper()
    # Re-create the image from pixel data only — drops EXIF/GPS/etc.
    clean = Image.new(img.mode, img.size)
    clean.putdata(list(img.getdata()))
    out = io.BytesIO()
    save_fmt = "JPEG" if fmt in ("JPG", "JPEG") else fmt
    if save_fmt == "JPEG" and clean.mode in ("RGBA", "P"):
        clean = clean.convert("RGB")
    clean.save(out, format=save_fmt)
    out.seek(0)
    return out.read(), save_fmt.lower()


def _tts_sync(text: str, lang: str) -> bytes:
    from gtts import gTTS

    buf = io.BytesIO()
    gTTS(text=text, lang=lang).write_to_fp(buf)
    buf.seek(0)
    return buf.read()


async def text_to_speech(text: str, lang: str = "en") -> bytes:
    text = (text or "").strip()
    if not text:
        raise ValueError("No text provided")
    if len(text) > 2000:
        text = text[:2000]
    return await asyncio.to_thread(_tts_sync, text, lang)
