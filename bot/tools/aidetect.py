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
    "it's important to note", "it is important to note", "in conclusion", "in summary",
    "in today's fast-paced", "delve into", "delving into", "a testament to", "navigating the",
    "it's worth noting", "it is worth noting", "tapestry", "underscores", "underscore the",
    "a myriad of", "plays a crucial role", "play a crucial role", "plays a vital role",
    "in the realm of", "when it comes to", "that being said", "it is essential to",
    "it's essential to", "a double-edged sword", "the world of", "at its core",
    "paving the way", "shed light on", "a game changer", "the ever-evolving",
    "ever-changing", "harness the power", "unlock the potential", "dive into",
    "it is crucial", "it's crucial", "a wide range of", "cutting-edge", "seamless",
    "robust", "leverage", "leveraging", "holistic", "synergy", "fosters", "fostering",
]
# Formal connectives that AI loves to start sentences with.
_TRANSITIONS = {"however", "moreover", "furthermore", "additionally", "consequently",
                "therefore", "thus", "overall", "ultimately", "notably", "importantly",
                "indeed", "nonetheless", "nevertheless", "hence", "accordingly", "firstly",
                "secondly", "finally", "conversely", "similarly", "subsequently"}
# Informal markers that point toward a human (casual) writer.
_INFORMAL = {"lol", "lmao", "lmfao", "gonna", "wanna", "gotta", "kinda", "sorta", "yeah",
             "yep", "nah", "idk", "tbh", "imo", "omg", "haha", "hah", "dunno", "u", "ur",
             "cuz", "cus", "ya", "y'all", "ngl", "fr", "bruh", "lowkey", "af", "wtf"}


def _clamp(x):
    return max(0.0, min(1.0, x))


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
    words = re.findall(r"\b[\w']+\b", text.lower())
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    if len(words) < 25 or len(sentences) < 2:
        return {"name": "Heuristic", "score": None, "note": "Too short to estimate (need ~25+ words)"}

    low = text.lower()
    per100 = max(len(words) / 100, 0.5)

    # 1. Burstiness — humans vary sentence length more; AI is more uniform.
    sent_lens = [len(re.findall(r"\b[\w']+\b", s)) for s in sentences]
    mean_len = statistics.mean(sent_lens) or 1
    burstiness = statistics.pstdev(sent_lens) / mean_len

    # 2. Lexical variety (type-token ratio) — AI often less varied.
    ttr = len(set(words)) / len(words)

    # 3. AI cliché density (per 100 words).
    cliche_hits = sum(low.count(p) for p in _CLICHES)
    cliche_density = cliche_hits / per100

    # 4. Transition-word sentence openers — AI over-uses them.
    openers = [re.findall(r"\b[\w']+\b", s.lower())[:1] for s in sentences]
    trans = sum(1 for o in openers if o and o[0] in _TRANSITIONS)
    trans_ratio = trans / len(sentences)

    # 5. Informality — contractions, slang, emoji, "!" → human.
    informal_hits = sum(1 for w in words if w in _INFORMAL)
    contractions = len(re.findall(r"\b\w+'(t|s|re|ve|ll|d|m)\b", low))
    emojis = len(re.findall(r"[\U0001F000-\U0001FAFF☀-➿]", text))
    excl = text.count("!")
    informality = _clamp((informal_hits * 2 + contractions + emojis * 2 + excl) / (per100 * 4))

    # 6. Formal punctuation (semicolons, em-dashes) per sentence → AI-ish.
    formal_punct = (text.count(";") + text.count("—")) / len(sentences)

    s_burst = _clamp((0.6 - burstiness) / 0.6)
    s_ttr = _clamp((0.5 - ttr) / 0.35)
    s_cliche = _clamp(cliche_density / 2)      # ~2 clichés/100 words → maxed
    s_trans = _clamp(trans_ratio / 0.4)        # ~40% of sentences → maxed
    s_formal = 1 - informality
    s_punct = _clamp(formal_punct)
    score = round(0.2 * s_burst + 0.15 * s_ttr + 0.25 * s_cliche + 0.15 * s_trans + 0.15 * s_formal + 0.1 * s_punct, 3)

    return {
        "name": "Heuristic",
        "score": score,
        "detail": {
            "uniformity": round(s_burst, 2),
            "low_variety": round(s_ttr, 2),
            "ai_cliches": cliche_hits,
            "transition_openers": f"{round(trans_ratio * 100)}%",
            "formality": round(s_formal, 2),
        },
        "note": "Stylometric estimate — rough, not proof.",
    }


# --------------------------------------------------------------------------- #
# Hugging Face inference
# --------------------------------------------------------------------------- #
async def _hf_one(session, name, model, text, token) -> dict:
    url = f"https://router.huggingface.co/hf-inference/models/{model}"
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
                msg = ""
                try:
                    msg = (await r.json()).get("error", "")
                except Exception:
                    pass
                if "credit" in msg.lower() or "PRO" in msg:
                    return {"name": name, "score": None, "note": "HF no longer free (needs credits/PRO)"}
                return {"name": name, "score": None, "note": f"HF {r.status}: {msg[:50]}" if msg else f"HF {r.status}"}
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
        async with session.post("https://api.sapling.ai/api/v1/aidetect",
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
