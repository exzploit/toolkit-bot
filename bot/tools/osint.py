"""OSINT utilities, implemented honestly.

Design principles for this module:
* Only ever touch **public** endpoints and **metadata** — no scraping of private
  data, no credential testing, no fabricated results.
* The breach checker uses the official Have I Been Pwned API and requires the
  operator's own API key. Without a key it reports "not configured" rather than
  guessing or inventing breaches (the old version returned hardcoded fake data).
* The username checker reports an HTTP-based *heuristic*, clearly labelled, not a
  definitive "this person is on X" claim.
"""
from __future__ import annotations

from urllib.parse import quote

import aiohttp
import phonenumbers
from phonenumbers import carrier, geocoder, timezone

_TIMEOUT = aiohttp.ClientTimeout(total=8)
_UA = "Mozilla/5.0 (compatible; ToolkitBot/3.0)"


# --------------------------------------------------------------------------- #
# Phone number metadata (pure offline parsing via libphonenumber)
# --------------------------------------------------------------------------- #
def phone_lookup(number: str, region_hint: str | None = None) -> dict:
    number = (number or "").strip()
    if not number:
        return {"success": False, "error": "Enter a phone number (include +country code)"}
    try:
        parsed = phonenumbers.parse(number, region_hint)
    except phonenumbers.NumberParseException as e:
        return {"success": False, "error": f"Could not parse number: {e}"}

    if not phonenumbers.is_valid_number(parsed):
        return {"success": False, "error": "Not a valid phone number"}

    tz = timezone.time_zones_for_number(parsed)
    return {
        "success": True,
        "formatted": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
        "country_code": parsed.country_code,
        "region": geocoder.description_for_number(parsed, "en") or "Unknown",
        "carrier": carrier.name_for_number(parsed, "en") or "Unknown",
        "timezone": ", ".join(tz) if tz else "Unknown",
        "line_type": str(phonenumbers.number_type(parsed)).split(".")[-1],
    }


# --------------------------------------------------------------------------- #
# Username existence heuristic across public profile URLs
# --------------------------------------------------------------------------- #
_PLATFORMS = {
    "GitHub": "https://github.com/{u}",
    "Instagram": "https://www.instagram.com/{u}/",
    "Reddit": "https://www.reddit.com/user/{u}",
    "TikTok": "https://www.tiktok.com/@{u}",
    "Telegram": "https://t.me/{u}",
    "Twitch": "https://www.twitch.tv/{u}",
    "Pinterest": "https://www.pinterest.com/{u}/",
    "Medium": "https://medium.com/@{u}",
}


async def _check_one(session: aiohttp.ClientSession, name: str, url: str) -> dict:
    try:
        async with session.get(url, allow_redirects=True) as resp:
            # 200 => likely exists, 404 => free, other => unknown. Heuristic only.
            if resp.status == 200:
                state = "likely_taken"
            elif resp.status in (404, 410):
                state = "available"
            else:
                state = "unknown"
            return {"platform": name, "url": url, "status": resp.status, "state": state}
    except Exception:
        return {"platform": name, "url": url, "status": None, "state": "unknown"}


async def username_search(username: str) -> dict:
    u = (username or "").strip().lstrip("@")
    if not u or not all(c.isalnum() or c in "._-" for c in u):
        return {"success": False, "error": "Enter a valid username"}
    async with aiohttp.ClientSession(timeout=_TIMEOUT, headers={"User-Agent": _UA}) as s:
        results = []
        for name, tmpl in _PLATFORMS.items():
            results.append(await _check_one(s, name, tmpl.format(u=u)))
    return {
        "success": True,
        "username": u,
        "results": results,
        "note": "HTTP heuristic only — a 'likely_taken' result is not proof of identity.",
    }


# --------------------------------------------------------------------------- #
# Have I Been Pwned — official API, operator key required
# --------------------------------------------------------------------------- #
async def breach_check(email: str, api_key: str) -> dict:
    email = (email or "").strip()
    if "@" not in email:
        return {"success": False, "error": "Enter a valid email address"}
    if not api_key:
        return {
            "success": False,
            "error": "Breach checking is not configured on this server "
                     "(set HIBP_API_KEY). No results are invented.",
            "configured": False,
        }
    url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}"
    headers = {"hibp-api-key": api_key, "User-Agent": _UA}
    try:
        async with aiohttp.ClientSession(timeout=_TIMEOUT, headers=headers) as s:
            async with s.get(url, params={"truncateResponse": "false"}) as resp:
                if resp.status == 404:
                    return {"success": True, "email": email, "breaches": []}
                if resp.status == 401:
                    return {"success": False, "error": "Invalid HIBP API key"}
                if resp.status == 429:
                    return {"success": False, "error": "Rate limited by HIBP, try again shortly"}
                if resp.status != 200:
                    return {"success": False, "error": f"HIBP returned {resp.status}"}
                data = await resp.json()
        breaches = [
            {"name": b.get("Name"), "domain": b.get("Domain"),
             "date": b.get("BreachDate"), "pwned": b.get("PwnCount")}
            for b in data
        ]
        return {"success": True, "email": email, "breaches": breaches}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --------------------------------------------------------------------------- #
# Public Telegram profile (reads the public t.me preview page only)
# --------------------------------------------------------------------------- #
async def telegram_public_profile(username: str) -> dict:
    from bs4 import BeautifulSoup

    u = (username or "").strip().lstrip("@")
    if not u:
        return {"success": False, "error": "Enter a Telegram username"}
    try:
        async with aiohttp.ClientSession(timeout=_TIMEOUT, headers={"User-Agent": _UA}) as s:
            async with s.get(f"https://t.me/{u}") as resp:
                html = await resp.text()
        soup = BeautifulSoup(html, "html.parser")

        def _text(cls):
            el = soup.find("div", class_=cls)
            return el.get_text(strip=True) if el else None

        title = _text("tgme_page_title")
        if not title:
            return {"success": False, "error": "No public Telegram page for that username"}
        photo_el = soup.find("img", class_="tgme_page_photo_image")
        return {
            "success": True,
            "username": f"@{u}",
            "display_name": title,
            "description": _text("tgme_page_description") or "No public bio",
            "extra": _text("tgme_page_extra"),
            "photo": photo_el.get("src") if photo_el else None,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def build_dork(domain: str, kind: str) -> dict:
    """Build a Google search query (a 'dork'). Pure string construction."""
    d = (domain or "").strip().lower()
    if not d:
        return {"success": False, "error": "Enter a domain"}
    templates = {
        "files": f'site:{d} (filetype:pdf OR filetype:docx OR filetype:xlsx)',
        "login": f'site:{d} (inurl:login OR inurl:admin OR inurl:signin)',
        "directory": f'site:{d} intitle:"index of"',
        "subdomains": f'site:*.{d} -www',
        "config": f'site:{d} (ext:env OR ext:ini OR ext:conf OR ext:bak)',
        "exposed": f'site:{d} (intext:"password" OR intext:"api_key")',
    }
    if kind not in templates:
        return {"success": False, "error": "Unknown dork type", "available": list(templates)}
    q = templates[kind]
    return {
        "success": True,
        "query": q,
        "url": f"https://www.google.com/search?q={quote(q, safe='')}",
    }
