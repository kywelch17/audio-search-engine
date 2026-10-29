import httpx, pytest
from tests.test_api import make_client
from app import summarizer

SEGS = [{"start": float(i), "end": i + 1.0, "text": f"sentence {w} here"} for i, w in
        enumerate(["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"])]

@pytest.fixture
def client(tmp_path, monkeypatch):
    c = make_client(tmp_path, monkeypatch)
    from app import main
    monkeypatch.setattr(main.transcriber, "transcribe", lambda p: (SEGS, "en", 7.0))
    for k in ("BASE_URL", "API_KEY", "MODEL"):
        monkeypatch.delenv(f"ASE_LLM_{k}", raising=False)
    c.post("/files", files={"file": ("a.mp3", b"x")})
    return c

def llm_env(monkeypatch):
    monkeypatch.setenv("ASE_LLM_BASE_URL", "http://llm.test/v1")
    monkeypatch.setenv("ASE_LLM_API_KEY", "k")
    monkeypatch.setenv("ASE_LLM_MODEL", "m")

def fake_post(calls, content="An LLM summary."):
    def post(url, **kw):
        calls.append((url, kw))
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]},
                              request=httpx.Request("POST", url))
    return post

def test_fallback_context_window(client):
    r = client.get("/search", params={"q": "delta"}).json()["results"][0]
    assert r["summary_source"] == "fallback"
    assert (r["context_start"], r["context_end"]) == (1.0, 6.0)
    assert r["summary"].startswith("sentence bravo") and "foxtrot" in r["summary"]

def test_window_clipped_at_edges(client):
    r = client.get("/search", params={"q": "alpha"}).json()["results"][0]
    assert (r["context_start"], r["context_end"]) == (0.0, 3.0)

def test_fallback_truncates():
    out = summarizer.fallback("word " * 100)
    assert len(out) <= 203 and out.endswith("...")

def test_llm_and_cache(client, monkeypatch):
    llm_env(monkeypatch); calls = []
    monkeypatch.setattr(summarizer.httpx, "post", fake_post(calls))
    for _ in range(3):
        r = client.get("/search", params={"q": "delta"}).json()["results"][0]
        assert r["summary"] == "An LLM summary." and r["summary_source"] == "llm"
    assert len(calls) == 1
    url, kw = calls[0]
    assert url == "http://llm.test/v1/chat/completions"
    assert kw["headers"]["Authorization"] == "Bearer k" and kw["json"]["model"] == "m"
    assert "bravo" in kw["json"]["messages"][1]["content"] and kw["timeout"] <= 10

@pytest.mark.parametrize("exc", [httpx.TimeoutException("t"), httpx.ConnectError("c"), KeyError("x")])
def test_llm_errors_fall_back(client, monkeypatch, exc):
    llm_env(monkeypatch)
    def boom(*a, **k): raise exc
    monkeypatch.setattr(summarizer.httpx, "post", boom)
    r = client.get("/search", params={"q": "delta"})
    assert r.status_code == 200 and r.json()["results"][0]["summary_source"] == "fallback"

def test_http_500_and_bad_json_fall_back(client, monkeypatch):
    llm_env(monkeypatch)
    monkeypatch.setattr(summarizer.httpx, "post", lambda url, **k: httpx.Response(500, request=httpx.Request("POST", url)))
    assert client.get("/search", params={"q": "delta"}).json()["results"][0]["summary_source"] == "fallback"
    monkeypatch.setattr(summarizer.httpx, "post", lambda url, **k: httpx.Response(200, json={"oops": 1}, request=httpx.Request("POST", url)))
    assert client.get("/search", params={"q": "delta"}).json()["results"][0]["summary_source"] == "fallback"

def test_failure_not_cached(client, monkeypatch):
    llm_env(monkeypatch)
    def boom(*a, **k): raise httpx.ConnectError("c")
    monkeypatch.setattr(summarizer.httpx, "post", boom)
    client.get("/search", params={"q": "delta"})
    monkeypatch.setattr(summarizer.httpx, "post", fake_post([]))
    assert client.get("/search", params={"q": "delta"}).json()["results"][0]["summary_source"] == "llm"

def test_summarizer_crash_never_fails_search(client, monkeypatch):
    monkeypatch.setattr(summarizer, "summarize", lambda db, hit: 1 / 0)
    r = client.get("/search", params={"q": "delta"})
    assert r.status_code == 200 and r.json()["results"][0]["summary_source"] == "fallback"

def test_summarize_false(client, monkeypatch):
    llm_env(monkeypatch); calls = []
    monkeypatch.setattr(summarizer.httpx, "post", fake_post(calls))
    r = client.get("/search", params={"q": "delta", "summarize": "false"}).json()["results"][0]
    assert "summary" not in r and calls == []

def test_prompt_is_abstractive_and_includes_hit(client, monkeypatch):
    llm_env(monkeypatch); calls = []
    monkeypatch.setattr(summarizer.httpx, "post", fake_post(calls))
    client.get("/search", params={"q": "delta"})
    msgs = calls[0][1]["json"]["messages"]
    assert "do not quote" in msgs[0]["content"].lower()
    assert "Search hit: sentence delta here" in msgs[1]["content"] and "foxtrot" in msgs[1]["content"]

def test_default_timeout_is_10():
    import importlib, os
    os.environ.pop("ASE_LLM_TIMEOUT", None)
    assert importlib.reload(summarizer).TIMEOUT == 10.0

def test_old_prompt_cache_ignored(client, monkeypatch):
    llm_env(monkeypatch); calls = []
    from app import main
    hit = client.get("/search", params={"q": "delta", "summarize": "false"}).json()["results"][0]
    main.app.state.db.put_summary(hit["file_id"], hit["segment_id"], "stale v1 summary", 1)
    monkeypatch.setattr(summarizer.httpx, "post", fake_post(calls, "Fresh summary."))
    r = client.get("/search", params={"q": "delta"}).json()["results"][0]
    assert r["summary"] == "Fresh summary." and len(calls) == 1

def test_headline_prompt_and_short_limit(client, monkeypatch):
    llm_env(monkeypatch); calls = []
    monkeypatch.setattr(summarizer.httpx, "post", fake_post(calls))
    client.get("/search", params={"q": "delta"})
    kw = calls[0][1]
    sysmsg = kw["json"]["messages"][0]["content"]
    assert "5 to 10 words" in sysmsg and "The speaker" in sysmsg and "The host" in sysmsg
    assert kw["json"]["max_tokens"] <= 30 and summarizer.PROMPT_VERSION == 3
