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

## Search result summaries
Each `/search` hit gets a summary of its context window: the hit segment plus up to 2 segments on each side.

- **LLM mode:** set `ASE_LLM_BASE_URL` (e.g. `https://api.openai.com/v1`), `ASE_LLM_API_KEY` and `ASE_LLM_MODEL` to call any OpenAI-compatible `/chat/completions` endpoint for a 1-2 sentence summary. `ASE_LLM_TIMEOUT` defaults to 5 seconds. LLM summaries are cached in SQLite (`summaries` table, keyed by file id + segment id), so repeat searches don't re-bill. Failures are not cached.
- **Fallback:** without those vars, or on any LLM error or timeout, the summary is the context text trimmed to about 200 chars, with `summary_source: "fallback"`. Summarizing never fails a search.
- `GET /search?q=...&summarize=false` skips summaries.

Result shape:
```json
{"query": "fox", "results": [{
  "file_id": 1, "filename": "a.mp3", "segment_id": 1, "idx": 0,
  "start": 0.0, "end": 3.4, "text": "...", "snippet": "The quick brown [fox] ...",
  "summary": "...", "summary_source": "llm|fallback",
  "context_start": 0.0, "context_end": 13.2}]}
```
