import os, importlib
from fastapi.testclient import TestClient

def make_client(tmp_path, monkeypatch, fail=False):
    monkeypatch.setenv("ASE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ASE_DB_PATH", str(tmp_path / "t.db"))
    from app import config, transcriber, main
    importlib.reload(config); importlib.reload(main)
    def fake(path):
        if fail: raise RuntimeError("boom")
        return ([{"start": 0.0, "end": 2.5, "text": "hello world"},
                 {"start": 2.5, "end": 5.0, "text": "the quick brown fox"}], "en", 5.0)
    monkeypatch.setattr(main.transcriber, "transcribe", fake)
    return TestClient(main.app)

def test_flow(tmp_path, monkeypatch):
    c = make_client(tmp_path, monkeypatch)
    r = c.post("/files", files={"file": ("a.mp3", b"xx", "audio/mpeg")})
    assert r.status_code == 202; fid = r.json()["id"]
    assert c.get(f"/files/{fid}/status").json()["status"] == "done"
    assert c.get("/files").json()[0]["filename"] == "a.mp3"
    t = c.get(f"/files/{fid}/transcript").json()
    assert len(t["segments"]) == 2 and t["language"] == "en"
    res = c.get("/search", params={"q": "fox"}).json()["results"]
    assert res[0]["start"] == 2.5 and "[fox]" in res[0]["snippet"]
    assert c.get("/search", params={"q": "zebra"}).json()["results"] == []

def test_error_and_404(tmp_path, monkeypatch):
    c = make_client(tmp_path, monkeypatch, fail=True)
    fid = c.post("/files", files={"file": ("b.wav", b"x")}).json()["id"]
    s = c.get(f"/files/{fid}/status").json()
    assert s["status"] == "error" and "boom" in s["error"]
    assert c.get("/files/999/transcript").status_code == 404

def test_cors(tmp_path, monkeypatch):
    c = make_client(tmp_path, monkeypatch)
    r = c.options("/files", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    r = c.get("/files", headers={"Origin": "http://evil.com"})
    assert "access-control-allow-origin" not in r.headers

def test_audio_range(tmp_path, monkeypatch):
    c = make_client(tmp_path, monkeypatch)
    data = bytes(range(256)) * 10
    fid = c.post("/files", files={"file": ("a.mp3", data)}).json()["id"]
    assert c.get(f"/files/{fid}/audio").content == data
    r = c.get(f"/files/{fid}/audio", headers={"Range": "bytes=10-19"})
    assert r.status_code == 206 and r.content == data[10:20]
    assert r.headers["content-range"] == f"bytes 10-19/{len(data)}"
    assert c.get("/files/999/audio").status_code == 404

def test_add_segments_executemany(tmp_path):
    from app.db import DB
    db = DB(str(tmp_path / "x.db")); fid = db.add_file("f", "p")
    db.add_segments(fid, [{"start": i, "end": i + 1, "text": f"w{i}"} for i in range(500)])
    assert len(db.segments(fid)) == 500 and db.search("w42")[0]["start"] == 42

def test_streamed_upload_large(tmp_path, monkeypatch):
    c = make_client(tmp_path, monkeypatch)
    data = os.urandom(3 * 1024 * 1024 + 7)
    fid = c.post("/files", files={"file": ("big.wav", data)}).json()["id"]
    assert c.get(f"/files/{fid}/audio").content == data

def test_search_sanitize(tmp_path, monkeypatch):
    c = make_client(tmp_path, monkeypatch)
    c.post("/files", files={"file": ("a.mp3", b"x")})
    assert c.get("/search", params={"q": "fox OR"}).status_code == 200  # OR is a literal term
    for q in ["!!!", '"', "*", "()", "-"]:
        r = c.get("/search", params={"q": q}); assert r.status_code == 200 and r.json()["results"] == []
    for q in ['fox"', "(fox", "brown(", "^quick*", "quick-brown"]:
        r = c.get("/search", params={"q": q}); assert r.status_code == 200 and r.json()["results"], q
