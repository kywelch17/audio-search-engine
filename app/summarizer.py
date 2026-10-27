"""Pluggable snippet summarizer: OpenAI-compatible LLM if configured, else extractive fallback."""
import os
import httpx

CONTEXT = 2          # neighbouring segments on each side
FALLBACK_CHARS = 200
TIMEOUT = float(os.getenv("ASE_LLM_TIMEOUT", "5"))


def llm_config():
    cfg = {k: os.getenv(f"ASE_LLM_{k.upper()}") for k in ("base_url", "api_key", "model")}
    return cfg if all(cfg.values()) else None


def fallback(text):
    text = " ".join(text.split())
    if len(text) <= FALLBACK_CHARS:
        return text
    cut = text[:FALLBACK_CHARS].rsplit(" ", 1)[0]
    return cut + "..."


def llm_summary(text, cfg):
    r = httpx.post(
        cfg["base_url"].rstrip("/") + "/chat/completions",
        headers={"Authorization": f"Bearer {cfg['api_key']}"},
        json={"model": cfg["model"], "temperature": 0.2, "max_tokens": 120, "messages": [
            {"role": "system", "content": "Summarize this audio transcript excerpt in 1-2 sentences. Reply with the summary only."},
            {"role": "user", "content": text}]},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    out = r.json()["choices"][0]["message"]["content"].strip()
    if not out:
        raise ValueError("empty summary")
    return out


def summarize(db, hit):
    """Return dict(summary, summary_source, context_start, context_end). Never raises."""
    ctx = db.context(hit["file_id"], hit["idx"], CONTEXT)
    text = " ".join(s["text"] for s in ctx) or hit["text"]
    out = {"context_start": ctx[0]["start"] if ctx else hit["start"],
           "context_end": ctx[-1]["end"] if ctx else hit["end"]}
    cfg = llm_config()
    if cfg:
        cached = db.get_summary(hit["file_id"], hit["segment_id"])
        if cached:
            return {**out, "summary": cached, "summary_source": "llm"}
        try:
            s = llm_summary(text, cfg)
            db.put_summary(hit["file_id"], hit["segment_id"], s)
            return {**out, "summary": s, "summary_source": "llm"}
        except Exception:
            pass
    return {**out, "summary": fallback(text), "summary_source": "fallback"}
