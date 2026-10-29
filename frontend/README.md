# Audio Search – Frontend

React + Vite + TypeScript UI for the FastAPI backend in `../app`.

## Run

```bash
# backend (repo root)
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm install
npm run dev          # http://localhost:5173
```

API base URL: `VITE_API_URL` (default `http://localhost:8000`), e.g. `VITE_API_URL=http://host:8000 npm run dev` or put it in `.env.local`.
If you serve the UI from another origin, add it to the backend's `ASE_CORS_ORIGINS`.

Build: `npm run build` (type-checks, outputs `dist/`); `npm run preview` to serve it.

## Features

- Drag/drop or pick audio files; each upload polls `/files/{id}/status` until done/error.
- Library list; click a file to open the player and transcript.
- Debounced search (all words must match); `[hits]` render as `<mark>`; click a result to play from that second.
- Transcript: click a segment to seek; the active segment highlights while playing.
