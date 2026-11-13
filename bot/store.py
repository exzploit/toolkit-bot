"""Anonymous usage counters (SQLite, stdlib only).

Privacy by design: the only thing stored is *(tool id, UTC day) -> count*. No
user ids, no content, no timestamps finer than a day — so the data can answer
"which tools get used?" and nothing else.
"""
from __future__ import annotations

import datetime
import os
import sqlite3
import threading


def _today() -> datetime.date:
    return datetime.datetime.now(datetime.timezone.utc).date()


class UsageStore:
    MAX_TOOLS = 300          # bound distinct tool names so the table can't be inflated
    KEEP_DAYS = 400

    def __init__(self, data_dir: str, today: datetime.date | None = None):
        os.makedirs(data_dir, exist_ok=True)
        self.path = os.path.join(data_dir, "usage.db")
        self._lock = threading.Lock()
        self._db = sqlite3.connect(self.path, check_same_thread=False, isolation_level=None)  # autocommit
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("PRAGMA synchronous=NORMAL")
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS usage ("
            " tool TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tool, day))")
        cutoff = ((today or _today()) - datetime.timedelta(days=self.KEEP_DAYS)).isoformat()
        self._db.execute("DELETE FROM usage WHERE day < ?", (cutoff,))
        self._known = {r[0] for r in self._db.execute("SELECT DISTINCT tool FROM usage")}

    def record(self, tool: str, today: datetime.date | None = None) -> bool:
        """Count one open of ``tool``. Returns False if a brand-new tool name is refused (cap reached)."""
        day = (today or _today()).isoformat()
        with self._lock:
            if tool not in self._known and len(self._known) >= self.MAX_TOOLS:
                return False
            self._db.execute(
                "INSERT INTO usage (tool, day, n) VALUES (?, ?, 1) "
                "ON CONFLICT (tool, day) DO UPDATE SET n = n + 1", (tool, day))
            self._known.add(tool)
            return True

    def summary(self, today: datetime.date | None = None) -> dict:
        today = today or _today()
        d7 = (today - datetime.timedelta(days=6)).isoformat()
        d30 = (today - datetime.timedelta(days=29)).isoformat()
        with self._lock:
            rows = self._db.execute(
                "SELECT tool, SUM(n), SUM(CASE WHEN day >= ? THEN n ELSE 0 END), "
                "SUM(CASE WHEN day >= ? THEN n ELSE 0 END) FROM usage GROUP BY tool", (d7, d30)).fetchall()
            per_day = dict(self._db.execute(
                "SELECT day, SUM(n) FROM usage WHERE day >= ? GROUP BY day",
                ((today - datetime.timedelta(days=13)).isoformat(),)).fetchall())
        tools = sorted(({"tool": t, "all": a, "d7": w, "d30": m} for t, a, w, m in rows),
                       key=lambda x: (-x["d30"], -x["all"], x["tool"]))
        daily = [{"day": (today - datetime.timedelta(days=i)).isoformat(),
                  "n": per_day.get((today - datetime.timedelta(days=i)).isoformat(), 0)} for i in range(13, -1, -1)]
        return {"tools": tools, "daily": daily,
                "total": {"all": sum(t["all"] for t in tools), "d7": sum(t["d7"] for t in tools), "d30": sum(t["d30"] for t in tools)}}

    def close(self) -> None:
        with self._lock:
            self._db.close()
