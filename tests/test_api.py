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
