"""Pluggable snippet summarizer: OpenAI-compatible LLM if configured, else extractive fallback."""
import os
import httpx

CONTEXT = 2          # neighbouring segments on each side
FALLBACK_CHARS = 200
TIMEOUT = float(os.getenv("ASE_LLM_TIMEOUT", "10"))
PROMPT_VERSION = 2   # bump whenever the prompt changes; older cached summaries are ignored
SYSTEM_PROMPT = (
    "You summarize excerpts of audio transcripts for a search results page. "
    "Given the passage containing the search hit plus its surrounding context, write ONE or TWO short "
    "sentences describing what is being discussed and the point being made, in your own words, "
    "in the third person (e.g. 'The speaker explains...', 'A host argues...'). "
    "Do NOT quote the transcript, do NOT restate or paraphrase it line by line, and do NOT list what "
    "each speaker says in order. Abstract the topic and takeaway. "
    "Reply with the summary only, no preamble."
)


def llm_config():
    cfg = {k: os.getenv(f"ASE_LLM_{k.upper()}") for k in ("base_url", "api_key", "model")}
    return cfg if all(cfg.values()) else None


def fallback(text):
    text = " ".join(text.split())
    if len(text) <= FALLBACK_CHARS:
        return text
    cut = text[:FALLBACK_CHARS].rsplit(" ", 1)[0]
    return cut + "..."


def llm_summary(text, cfg, hit_text=None):
    user = f"Search hit: {hit_text}\n\nContext passage:\n{text}" if hit_text else text
    r = httpx.post(
        cfg["base_url"].rstrip("/") + "/chat/completions",
        headers={"Authorization": f"Bearer {cfg['api_key']}"},
        json={"model": cfg["model"], "temperature": 0.2, "max_tokens": 200, "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user}]},
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
        cached = db.get_summary(hit["file_id"], hit["segment_id"], PROMPT_VERSION)
        if cached:
            return {**out, "summary": cached, "summary_source": "llm"}
        try:
            s = llm_summary(text, cfg, hit.get("text"))
            db.put_summary(hit["file_id"], hit["segment_id"], s, PROMPT_VERSION)
            return {**out, "summary": s, "summary_source": "llm"}
        except Exception:
            pass
    return {**out, "summary": fallback(text), "summary_source": "fallback"}
