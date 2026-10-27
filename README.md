# Audio Search Engine

Upload audio, transcribe it with faster-whisper, and search transcripts using SQLite FTS5. Results include segment timestamps.

## Run
    pip install -r requirements.txt
    uvicorn app.main:app --reload

## Config (env vars)
WHISPER_MODEL_SIZE (base), WHISPER_DEVICE (cpu|cuda), WHISPER_COMPUTE_TYPE (int8), ASE_DATA_DIR (./data), ASE_DB_PATH

## API
- POST /files: upload (multipart `file`); transcribes in the background; returns id
- GET /files: list
- GET /files/{id}/status: pending|processing|done|error
- GET /files/{id}/transcript: segments with start/end
- GET /search?q=...: file, start/end, snippet

## Test
    pytest   # model is mocked
