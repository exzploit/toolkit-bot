"""Network utilities: subnet calculator, port scanner, DNS/WHOIS, IP info, URL inspect.

All functions are async and return plain JSON-serialisable dicts of the shape
``{"success": bool, ...}``. Network calls are time-bounded so a hung target can
never block the service.
"""
from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlparse

import aiohttp
import dns.asyncresolver
from bs4 import BeautifulSoup

# Standard, well-known ports. Deliberately a small fixed set (dual-use tool kept
# honest and bounded — this is a reachability probe, not a vulnerability scanner).
COMMON_PORTS: dict[int, str] = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
    80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 465: "SMTPS",
    587: "SMTP", 993: "IMAPS", 995: "POP3S", 3306: "MySQL",
    3389: "RDP", 5432: "Postgres", 6379: "Redis", 8080: "HTTP-alt",
}

_HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)
_UA = "ToolkitBot/3.0 (+https://github.com/exzploit/toolkit-bot)"


# --------------------------------------------------------------------------- #
# Subnet calculator (pure, no network)
# --------------------------------------------------------------------------- #
def subnet_info(address: str, prefix: str | int | None = None) -> dict:
    """Compute CIDR details. Accepts ``192.168.1.0/24`` or (ip, prefix)."""
    try:
        cidr = address.strip()
        if "/" not in cidr and prefix not in (None, ""):
            cidr = f"{cidr}/{prefix}"
        net = ipaddress.ip_network(cidr, strict=False)
    except ValueError as e:
        return {"success": False, "error": f"Invalid network: {e}"}

    hosts = net.num_addresses
    usable = max(hosts - 2, 0) if net.version == 4 and net.prefixlen < 31 else hosts
    first = last = str(net.network_address)
    if net.version == 4 and net.prefixlen < 31:
        host_iter = net.hosts()
        try:
            first = str(next(host_iter))
            last = str(list(net.hosts())[-1])
        except StopIteration:
            pass

    return {
        "success": True,
        "cidr": str(net),
        "network": str(net.network_address),
        "broadcast": str(net.broadcast_address) if net.version == 4 else None,
        "netmask": str(net.netmask),
        "wildcard": str(net.hostmask),
        "prefix": net.prefixlen,
        "total_addresses": hosts,
        "usable_hosts": usable,
        "first_host": first,
        "last_host": last,
        "version": net.version,
    }


# --------------------------------------------------------------------------- #
# Port scanner (async TCP connect)
# --------------------------------------------------------------------------- #
async def _probe(host: str, port: int, timeout: float) -> tuple[int, bool]:
    try:
        fut = asyncio.open_connection(host, port)
        reader, writer = await asyncio.wait_for(fut, timeout=timeout)
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return port, True
    except Exception:
        return port, False


async def port_scan(target: str, timeout: float = 2.0) -> dict:
    target = (target or "").strip()
    if not target:
        return {"success": False, "error": "Target required"}
    # Resolve first so we fail fast on garbage input.
    try:
        await asyncio.get_running_loop().getaddrinfo(target, None)
    except Exception:
        return {"success": False, "error": f"Could not resolve '{target}'"}

    results = await asyncio.gather(
        *(_probe(target, p, timeout) for p in COMMON_PORTS)
    )
    ports = [
        {"port": p, "service": COMMON_PORTS[p], "open": is_open}
        for p, is_open in sorted(results)
    ]
    return {
        "success": True,
        "target": target,
        "open_count": sum(1 for p in ports if p["open"]),
        "ports": ports,
    }


# --------------------------------------------------------------------------- #
# Domain info: DNS records + RDAP (modern WHOIS)
# --------------------------------------------------------------------------- #
async def domain_info(domain: str) -> dict:
    domain = (domain or "").strip().lower().removeprefix("http://").removeprefix("https://").split("/")[0]
    if not domain or "." not in domain:
        return {"success": False, "error": "Enter a valid domain"}

    resolver = dns.asyncresolver.Resolver()
    resolver.lifetime = 5.0
    records: dict[str, list[str]] = {}
    for rtype in ("A", "AAAA", "MX", "NS", "TXT"):
        try:
            answers = await resolver.resolve(domain, rtype)
            records[rtype] = [r.to_text().strip('"') for r in answers]
        except Exception:
            records[rtype] = []

    whois: dict | None = None
    try:
        async with aiohttp.ClientSession(timeout=_HTTP_TIMEOUT, headers={"User-Agent": _UA}) as s:
            async with s.get(f"https://rdap.org/domain/{domain}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    events = {e.get("eventAction"): e.get("eventDate") for e in data.get("events", [])}
                    registrar = "Unknown"
                    for ent in data.get("entities", []):
                        vcard = ent.get("vcardArray", [None, []])[1]
                        for item in vcard:
                            if item and item[0] == "fn":
                                registrar = item[3]
                                break
                        if registrar != "Unknown":
                            break
                    whois = {
                        "registrar": registrar,
                        "status": ", ".join(data.get("status", [])) or "Unknown",
                        "created": events.get("registration", "Unknown"),
                        "expires": events.get("expiration", "Unknown"),
                    }
    except Exception:
        whois = None

    return {"success": True, "domain": domain, "dns": records, "whois": whois}


# --------------------------------------------------------------------------- #
# IP info (caller's IP, or a supplied one) via ip-api.com (free, no key)
# --------------------------------------------------------------------------- #
async def ip_info(ip: str | None = None) -> dict:
    query = (ip or "").strip()
    if query:
        try:
            ipaddress.ip_address(query)
        except ValueError:
            return {"success": False, "error": "Invalid IP address"}
    try:
        url = f"http://ip-api.com/json/{query}" if query else "http://ip-api.com/json/"
        async with aiohttp.ClientSession(timeout=_HTTP_TIMEOUT, headers={"User-Agent": _UA}) as s:
            async with s.get(url, params={"fields": "status,message,query,country,regionName,city,isp,org,as,timezone,lat,lon,reverse"}) as resp:
                data = await resp.json()
        if data.get("status") != "success":
            return {"success": False, "error": data.get("message", "Lookup failed")}
        return {"success": True, **{k: data.get(k) for k in (
            "query", "country", "regionName", "city", "isp", "org", "as", "timezone", "reverse")}}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --------------------------------------------------------------------------- #
# URL inspector: final URL, status, server header, resolved IP, page title
# --------------------------------------------------------------------------- #
async def inspect_url(url: str) -> dict:
    url = (url or "").strip()
    if not url:
        return {"success": False, "error": "URL required"}
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        async with aiohttp.ClientSession(timeout=_HTTP_TIMEOUT, headers={"User-Agent": _UA}) as s:
            async with s.get(url, allow_redirects=True) as resp:
                final = str(resp.url)
                headers = resp.headers
                body = await resp.content.read(200_000)  # cap: title only
        host = urlparse(final).netloc.split(":")[0]
        try:
            ip = socket.gethostbyname(host)
        except Exception:
            ip = "Unknown"
        title = None
        try:
            title = BeautifulSoup(body, "html.parser").title
            title = title.get_text(strip=True) if title else None
        except Exception:
            pass
        return {
            "success": True,
            "final_url": final,
            "status": resp.status,
            "secure": final.startswith("https://"),
            "ip": ip,
            "server": headers.get("Server", "Unknown"),
            "content_type": headers.get("Content-Type", "Unknown"),
            "title": title,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
