"""Network utilities: subnet calculator, port scanner, DNS/WHOIS, IP info, URL inspect.

All functions are async and return plain JSON-serialisable dicts of the shape
``{"success": bool, ...}``. Network calls are time-bounded so a hung target can
never block the service.
"""
from __future__ import annotations

import asyncio
import datetime
import ipaddress
import re
import socket
import ssl
import time
from urllib.parse import urlparse

import aiohttp
import dns.asyncresolver
import dns.resolver
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
# --------------------------------------------------------------------------- #
# Subdomain finder — PASSIVE. Reads public certificate-transparency data; it
# never touches the target. (The optional resolve step only issues ordinary DNS
# lookups for names that were already found.)
# --------------------------------------------------------------------------- #
_DOMAIN_RE = re.compile(r"^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
_LABEL_RE = re.compile(r"^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$")

# (name, url template, timeout seconds, max bytes read)
_SUB_SOURCES = [
    ("crt.sh", "https://crt.sh/?q=%25.{d}&output=json", 28, 12_000_000),
    ("certspotter", "https://api.certspotter.com/v1/issuances?domain={d}&include_subdomains=true&expand=dns_names", 20, 8_000_000),
]
_SUB_CACHE: dict[str, tuple[float, dict]] = {}
_SUB_CACHE_TTL = 600
_SUB_MAX_NAMES = 500
_SUB_RESOLVE_LIMIT = 100


def normalize_domain(raw: str) -> str | None:
    d = (raw or "").strip().lower()
    d = d.removeprefix("http://").removeprefix("https://").split("/")[0].split(":")[0].lstrip("*.").rstrip(".")
    return d if _DOMAIN_RE.match(d) else None


def extract_hosts(text: str, domain: str) -> tuple[set[str], set[str]]:
    """Pull hostnames under ``domain`` out of any text body (JSON or otherwise).

    Returns (concrete subdomains, distinct wildcard patterns such as
    ``*.dev.example.com``). Works on truncated or oddly-shaped responses
    because it scans for hostnames rather than parsing a particular schema.
    """
    text = text.replace("\\n", "\n")  # crt.sh packs several SANs into one JSON string
    # After the domain, reject more name characters AND a dot that continues into
    # further labels (evil.example.com.attacker.net) — but allow a bare trailing dot.
    pat = re.compile(r"[A-Za-z0-9*_.-]*" + re.escape(domain) + r"(?![A-Za-z0-9_-])(?!\.[A-Za-z0-9_-])", re.I)
    hosts: set[str] = set()
    wildcards: set[str] = set()
    suffix = "." + domain
    for m in pat.finditer(text):
        name = m.group(0).lower().strip(".")
        if name.startswith("*."):
            wildcards.add(name)
            continue
        if "*" in name or not name.endswith(suffix):
            continue  # apex, look-alikes such as notexample.com, or junk
        if all(_LABEL_RE.match(lbl) for lbl in name[: -len(suffix)].split(".")):
            hosts.add(name)
    return hosts, wildcards


async def _read_capped(resp: aiohttp.ClientResponse, cap: int) -> tuple[bytes, bool]:
    chunks, total = [], 0
    async for chunk in resp.content.iter_chunked(65536):
        chunks.append(chunk)
        total += len(chunk)
        if total >= cap:
            return b"".join(chunks)[:cap], True
    return b"".join(chunks), False


async def _fetch_sub_source(session, name: str, url: str, timeout: int, cap: int, domain: str) -> dict:
    out = {"name": name, "ok": False, "count": 0, "error": None, "truncated": False, "hosts": set(), "wildcards": set()}
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
            if resp.status == 429:
                out["error"] = "rate limited"
                return out
            if resp.status != 200:
                out["error"] = f"HTTP {resp.status}"
                return out
            body, out["truncated"] = await _read_capped(resp, cap)
    except asyncio.TimeoutError:
        out["error"] = "timed out"
        return out
    except Exception as e:
        out["error"] = (str(e) or e.__class__.__name__)[:60]
        return out
    hosts, wild = extract_hosts(body.decode("utf-8", "replace"), domain)
    if not hosts and body.lstrip()[:1] == b"<":
        out["error"] = "unexpected response"  # an HTML error page, not data
        return out
    out.update(ok=True, count=len(hosts), hosts=hosts, wildcards=wild)
    return out


async def _resolve_names(names: list[str]) -> dict[str, list[str] | None]:
    """name -> IPs; [] = exists without an A record; None = does not resolve."""
    resolver = dns.asyncresolver.Resolver()
    resolver.lifetime = 2.5
    sem = asyncio.Semaphore(25)

    async def one(n: str):
        async with sem:
            try:
                return n, [r.to_text() for r in await resolver.resolve(n, "A")][:2]
            except dns.resolver.NoAnswer:
                return n, []
            except Exception:
                return n, None

    return dict(await asyncio.gather(*(one(n) for n in names)))


async def subdomain_lookup(raw_domain: str, resolve: bool = False) -> dict:
    domain = normalize_domain(raw_domain)
    if not domain:
        return {"success": False, "error": "Enter a valid domain, e.g. example.com"}

    cached = _SUB_CACHE.get(domain)
    if cached and time.monotonic() - cached[0] < _SUB_CACHE_TTL:
        data = cached[1]
    else:
        async with aiohttp.ClientSession(headers={"User-Agent": _UA}, trust_env=True) as session:
            results = await asyncio.gather(*(
                _fetch_sub_source(session, n, u.format(d=domain), t, c, domain)
                for n, u, t, c in _SUB_SOURCES
            ))
        if not any(r["ok"] for r in results):
            reasons = "; ".join(f"{r['name']}: {r['error']}" for r in results)
            return {"success": False, "error": f"All sources failed ({reasons}). Try again shortly."}
        data = {
            "hosts": sorted(set().union(*(r["hosts"] for r in results))),
            "wildcards": len(set().union(*(r["wildcards"] for r in results))),
            "truncated": any(r["truncated"] for r in results),
            "sources": [{"name": r["name"], "ok": r["ok"], "count": r["count"], "error": r["error"]} for r in results],
        }
        if len(_SUB_CACHE) >= 64:
            _SUB_CACHE.pop(min(_SUB_CACHE, key=lambda k: _SUB_CACHE[k][0]))
        _SUB_CACHE[domain] = (time.monotonic(), data)

    shown = data["hosts"][:_SUB_MAX_NAMES]
    resolved = None
    if resolve and shown:
        resolved = await _resolve_names(shown[:_SUB_RESOLVE_LIMIT])
    names = [{"name": n, "ips": (resolved.get(n) if resolved is not None and n in resolved else "skip")} for n in shown]
    return {
        "success": True,
        "domain": domain,
        "count": len(data["hosts"]),
        "shown": len(shown),
        "names": names,
        "wildcards": data["wildcards"],
        "truncated": data["truncated"],
        "resolved": resolved is not None,
        "resolve_limit": _SUB_RESOLVE_LIMIT,
        "sources": data["sources"],
    }


async def dns_query(domain: str, rtype: str) -> dict:
    domain = (domain or "").strip().lower().removeprefix("http://").removeprefix("https://").split("/")[0]
    rtype = (rtype or "A").upper()
    allowed = {"A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA", "SRV", "PTR"}
    if rtype not in allowed:
        return {"success": False, "error": "Unsupported record type"}
    if not domain or "." not in domain:
        return {"success": False, "error": "Enter a valid domain"}
    resolver = dns.asyncresolver.Resolver()
    resolver.lifetime = 5.0
    try:
        ans = await resolver.resolve(domain, rtype)
        return {"success": True, "domain": domain, "type": rtype,
                "records": [r.to_text().strip('"') for r in ans]}
    except dns.resolver.NXDOMAIN:
        return {"success": False, "error": "Domain not found (NXDOMAIN)"}
    except dns.resolver.NoAnswer:
        return {"success": True, "domain": domain, "type": rtype, "records": []}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def ssl_check(host: str) -> dict:
    host = (host or "").strip().lower()
    host = host.removeprefix("http://").removeprefix("https://").split("/")[0].split(":")[0]
    if not host or "." not in host:
        return {"success": False, "error": "Enter a valid hostname"}

    def _fetch():
        ctx = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=8) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ss:
                return ss.getpeercert()

    try:
        cert = await asyncio.to_thread(_fetch)
    except ssl.SSLCertVerificationError as e:
        return {"success": False, "error": f"Certificate verification failed: {e.verify_message or e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

    def _name(field):
        try:
            return dict(x[0] for x in field).get("commonName", "Unknown")
        except Exception:
            return "Unknown"

    fmt = "%b %d %H:%M:%S %Y %Z"
    try:
        not_after = datetime.datetime.strptime(cert["notAfter"], fmt)
        not_before = datetime.datetime.strptime(cert["notBefore"], fmt)
    except Exception:
        not_after = not_before = None
    days_left = (not_after - datetime.datetime.utcnow()).days if not_after else None
    sans = [v for k, v in cert.get("subjectAltName", []) if k == "DNS"]

    return {
        "success": True,
        "host": host,
        "subject": _name(cert.get("subject", [])),
        "issuer": _name(cert.get("issuer", [])),
        "valid_from": cert.get("notBefore"),
        "valid_to": cert.get("notAfter"),
        "days_left": days_left,
        "expired": (days_left is not None and days_left < 0),
        "san_count": len(sans),
    }


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
