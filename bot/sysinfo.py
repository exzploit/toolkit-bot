"""Read-only host and process status for the owner panel.

Everything here is best-effort: on a non-Linux machine (e.g. local development
on macOS) a field is simply ``None`` rather than an error.
"""
from __future__ import annotations

import os
import platform
import shutil
import sys
import time

_START = time.time()


def _meminfo() -> dict[str, int]:
    out: dict[str, int] = {}
    with open("/proc/meminfo") as f:
        for line in f:
            k, _, rest = line.partition(":")
            parts = rest.split()
            if parts and parts[0].isdigit():
                out[k] = int(parts[0]) * 1024  # kB -> bytes
    return out


def read_status() -> dict:
    out: dict = {
        "python": sys.version.split()[0],
        "host": platform.node(),
        "process_uptime": int(time.time() - _START),
        "cpus": os.cpu_count(),
        "mem": None, "disk": None, "uptime": None, "load": None, "rss": None,
    }
    try:
        m = _meminfo()
        out["mem"] = {"total": m["MemTotal"], "available": m["MemAvailable"],
                      "swap_total": m.get("SwapTotal", 0), "swap_free": m.get("SwapFree", 0)}
    except Exception:
        pass
    try:
        d = shutil.disk_usage("/")
        out["disk"] = {"total": d.total, "used": d.used, "free": d.free}
    except Exception:
        pass
    try:
        with open("/proc/uptime") as f:
            out["uptime"] = int(float(f.read().split()[0]))
    except Exception:
        pass
    try:
        out["load"] = [round(x, 2) for x in os.getloadavg()]
    except Exception:
        pass
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    out["rss"] = int(line.split()[1]) * 1024
                    break
    except Exception:
        pass
    return out
