"""AI-text detection by aggregating multiple free detectors.

IMPORTANT: AI detectors are unreliable. They produce false positives (flagging
human writing as AI) and false negatives (missing AI text, especially after
editing). This module therefore returns each detector's score separately, labels
everything as an estimate, and never emits a definitive verdict. The caller
presents results with a prominent disclaimer.

Providers (all optional; graceful degradation):
  * heuristic  — stylometric signals, no key, always available (weakest)
  * huggingface — free inference models (needs a free HF_TOKEN)
  * sapling    — AI-detector API (needs a free-tier SAPLING_API_KEY)
"""
from __future__ import annotations

import asyncio
import io
import re
import statistics

import aiohttp

MAX_CHARS = 12000

# Hugging Face detector models queried when HF_TOKEN is set. Each returns a
# label/score; we map the "AI" label to a 0..1 score.
HF_MODELS = [
    ("HF · roberta-openai", "openai-community/roberta-base-openai-detector"),
    ("HF · chatgpt-roberta", "Hello-SimpleAI/chatgpt-detector-roberta"),
]
_AI_LABELS = {"fake", "chatgpt", "ai", "generated", "label_1", "machine"}
_HUMAN_LABELS = {"real", "human", "label_0"}

_CLICHES = [
    "it's important to note", "it is important to note", "in conclusion",
    "in today's fast-paced", "delve into", "a testament to", "navigating the",
    "it's worth noting", "it is worth noting", "furthermore", "moreover",
    "tapestry", "underscores", "a myriad of", "plays a crucial role",
    "in the realm of", "when it comes to", "on the other hand", "that being said",
]


# --------------------------------------------------------------------------- #
# File text extraction
# --------------------------------------------------------------------------- #
def extract_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".txt") or name.endswith(".md") or name.endswith(".csv"):
        return data.decode("utf-8", errors="replace")
    if name.endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    if name.endswith(".docx"):
        import docx
        doc = docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    # Fallback: try utf-8
    return data.decode("utf-8", errors="replace")


# --------------------------------------------------------------------------- #
# Heuristic (no key) — honest, weak stylometric signals
# --------------------------------------------------------------------------- #
def heuristic_score(text: str) -> dict:
    words = re.findall(r"\b\w+\b", text.lower())
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    if len(words) < 20 or len(sentences) < 2:
        return {"name": "Heuristic", "score": None, "note": "Too short to estimate"}

    sent_lens = [len(re.findall(r"\b\w+\b", s)) for s in sentences]
    burstiness = statistics.pstdev(sent_lens) / (statistics.mean(sent_lens) or 1)
    ttr = len(set(words)) / len(words)  # type-token ratio (lexical variety)
    low = text.lower()
    cliches = sum(low.count(p) for p in _CLICHES)

    # Each sub-signal → 0..1 "AI-ness". These are rough rules of thumb, not science.
    s_burst = max(0.0, min(1.0, (0.6 - burstiness) / 0.6))        # low variance → more AI-like
    s_ttr = max(0.0, min(1.0, (0.55 - ttr) / 0.35))               # low variety → more AI-like
    s_cliche = min(1.0, cliches / 5)                              # many clichés → more AI-like
    score = round(0.4 * s_burst + 0.3 * s_ttr + 0.3 * s_cliche, 3)

    return {
        "name": "Heuristic",
        "score": score,
        "detail": {
            "burstiness": round(burstiness, 3),
            "lexical_variety": round(ttr, 3),
            "ai_cliche_hits": cliches,
        },
        "note": "Rough stylometric estimate only — the least reliable signal.",
    }


# --------------------------------------------------------------------------- #
# Hugging Face inference
# --------------------------------------------------------------------------- #
async def _hf_one(session, name, model, text, token) -> dict:
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"inputs": text[:2000], "options": {"wait_for_model": True}}
    try:
        async with session.post(url, headers=headers, json=payload,
                                timeout=aiohttp.ClientTimeout(total=35)) as r:
            if r.status == 503:
                return {"name": name, "score": None, "note": "model warming up, try again"}
            if r.status == 401:
                return {"name": name, "score": None, "note": "invalid HF token"}
            if r.status != 200:
                return {"name": name, "score": None, "note": f"HF {r.status}"}
            data = await r.json()
    except Exception as e:
        return {"name": name, "score": None, "note": str(e)[:60]}

    # data may be [[{label,score},...]] or [{label,score},...]
    rows = data[0] if (isinstance(data, list) and data and isinstance(data[0], list)) else data
    if not isinstance(rows, list):
        return {"name": name, "score": None, "note": "unexpected response"}
    ai = human = None
    for row in rows:
        lbl = str(row.get("label", "")).lower()
        if lbl in _AI_LABELS:
            ai = row.get("score")
        elif lbl in _HUMAN_LABELS:
            human = row.get("score")
    if ai is None and human is not None:
        ai = 1 - human
    if ai is None:
        return {"name": name, "score": None, "note": "could not map labels"}
    return {"name": name, "score": round(float(ai), 3)}


# --------------------------------------------------------------------------- #
# Sapling
# --------------------------------------------------------------------------- #
async def _sapling(session, text, key) -> dict:
    try:
        async with session.post("https://api.sapling.com/api/v1/aidetect",
                                json={"key": key, "text": text[:8000]},
                                timeout=aiohttp.ClientTimeout(total=25)) as r:
            data = await r.json()
            if r.status != 200:
                return {"name": "Sapling", "score": None, "note": data.get("msg", f"HTTP {r.status}")}
    except Exception as e:
        return {"name": "Sapling", "score": None, "note": str(e)[:60]}
    sc = data.get("score")
    return {"name": "Sapling", "score": round(float(sc), 3)} if sc is not None else {"name": "Sapling", "score": None, "note": "no score"}


# --------------------------------------------------------------------------- #
# Aggregate
# --------------------------------------------------------------------------- #
async def detect(text: str, *, hf_token: str = "", sapling_key: str = "") -> dict:
    text = (text or "").strip()
    if len(text) < 1:
        return {"success": False, "error": "No text provided"}
    text = text[:MAX_CHARS]

    results = [heuristic_score(text)]
    tasks = []
    async with aiohttp.ClientSession() as session:
        if hf_token:
            for name, model in HF_MODELS:
                tasks.append(_hf_one(session, name, model, text, hf_token))
        if sapling_key:
            tasks.append(_sapling(session, text, sapling_key))
        if tasks:
            results += await asyncio.gather(*tasks)

    scored = [r["score"] for r in results if isinstance(r.get("score"), (int, float))]
    aggregate = round(sum(scored) / len(scored), 3) if scored else None
    return {
        "success": True,
        "chars": len(text),
        "results": results,
        "aggregate": aggregate,
        "detectors_used": len(scored),
        "disclaimer": "AI detectors are unreliable and frequently misclassify both "
                      "human and AI text. Treat these as weak estimates, never proof.",
    }
