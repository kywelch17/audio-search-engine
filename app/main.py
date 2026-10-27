import os, uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Query
from . import config, transcriber
from .db import DB

os.makedirs(config.DATA_DIR, exist_ok=True)
app = FastAPI(title="Audio Search Engine")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"], expose_headers=["Content-Range", "Accept-Ranges"])
app.state.db = DB(config.DB_PATH)

def run_job(db, fid, path):
    db.set_status(fid, "processing")
    try:
        segs, lang, dur = transcriber.transcribe(path)
        db.add_segments(fid, segs)
        db.set_status(fid, "done", language=lang, duration=dur)
    except Exception as e:
        db.set_status(fid, "error", error=str(e))

@app.post("/files", status_code=202)
async def upload(bg: BackgroundTasks, file: UploadFile = File(...)):
    db = app.state.db
    up = os.path.join(config.DATA_DIR, "uploads"); os.makedirs(up, exist_ok=True)
    path = os.path.join(up, f"{uuid.uuid4().hex}_{os.path.basename(file.filename or 'audio')}")
    with open(path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)
    fid = db.add_file(file.filename, path)
    bg.add_task(run_job, db, fid, path)
    return {"id": fid, "status": "pending"}

@app.get("/files")
def list_files():
    return app.state.db.list_files()

def _file(fid):
    f = app.state.db.get_file(fid)
    if not f: raise HTTPException(404, "file not found")
    return f

@app.get("/files/{fid}/status")
def status(fid: int):
    f = _file(fid); return {"id": fid, "status": f["status"], "error": f["error"]}

@app.get("/files/{fid}/transcript")
def transcript(fid: int):
    f = _file(fid)
    return {"id": fid, "filename": f["filename"], "status": f["status"], "language": f["language"],
            "segments": app.state.db.segments(fid)}

@app.get("/search")
def search(q: str = Query(..., min_length=1), limit: int = 20):
    return {"query": q, "results": app.state.db.search(q, limit)}

@app.get("/files/{fid}/audio")
def audio(fid: int):
    f = _file(fid)
    if not os.path.exists(f["path"]): raise HTTPException(404, "audio missing")
    return FileResponse(f["path"], filename=f["filename"])
