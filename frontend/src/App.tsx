import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api";
import type { FileInfo, SearchResult, Segment, Status } from "./api";

function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]*\])/g);
  return <>{parts.map((p, i) => p.startsWith("[") && p.endsWith("]") ? <mark key={i}>{p.slice(1, -1)}</mark> : <span key={i}>{p}</span>)}</>;
}
const Badge = ({ s }: { s: Status }) => <span className={`badge ${s}`}>{s}</span>;

interface UploadItem { key: string; name: string; id?: number; status: Status | "uploading"; error?: string }

export default function App() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filesErr, setFilesErr] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [drag, setDrag] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [trErr, setTrErr] = useState<string | null>(null);
  const [trLoading, setTrLoading] = useState(false);
  const [time, setTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    api.listFiles().then(f => { setFiles(f); setFilesErr(null); }).catch(e => setFilesErr(String(e.message || e)));
  }, []);
  useEffect(refresh, [refresh]);

  // poll active uploads
  useEffect(() => {
    const active = uploads.filter(u => u.id != null && (u.status === "pending" || u.status === "processing"));
    if (!active.length) return;
    const t = setTimeout(async () => {
      const upd = await Promise.all(active.map(u => api.getStatus(u.id!).then(s => ({ key: u.key, status: s.status, error: s.error ?? undefined })).catch(e => ({ key: u.key, status: "error" as Status, error: String(e.message || e) }))));
      setUploads(prev => prev.map(u => { const n = upd.find(x => x.key === u.key); return n ? { ...u, ...n } : u; }));
      if (upd.some(x => x.status === "done" || x.status === "error")) refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [uploads, refresh]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    Array.from(list).forEach(f => {
      const key = crypto.randomUUID?.() ?? String(Math.random());
      setUploads(p => [{ key, name: f.name, status: "uploading" }, ...p]);
      api.upload(f).then(r => { setUploads(p => p.map(u => u.key === key ? { ...u, id: r.id, status: r.status } : u)); refresh(); })
        .catch(e => setUploads(p => p.map(u => u.key === key ? { ...u, status: "error", error: String(e.message || e) } : u)));
    });
  };

  // debounced search
  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults(null); setSearchErr(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      api.search(term, 30, ctl.signal).then(r => { setResults(r.results); setSearchErr(null); })
        .catch(e => { if (e.name !== "AbortError") setSearchErr(String(e.message || e)); })
        .finally(() => setSearching(false));
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  // load transcript
  useEffect(() => {
    if (selected == null) return;
    setTrLoading(true); setTrErr(null); setSegments([]);
    api.getTranscript(selected).then(t => setSegments(t.segments)).catch(e => setTrErr(String(e.message || e))).finally(() => setTrLoading(false));
  }, [selected]);

  const open = (id: number, start?: number) => {
    const a = audioRef.current;
    if (id === selected && a) { if (start != null) { a.currentTime = start; a.play().catch(() => {}); } return; }
    pendingSeek.current = start ?? null; setTime(0); setSelected(id);
  };
  const onLoaded = () => {
    const a = audioRef.current;
    if (a && pendingSeek.current != null) { a.currentTime = pendingSeek.current; pendingSeek.current = null; a.play().catch(() => {}); }
  };

  const activeIdx = segments.findIndex(s => time >= s.start && time < s.end);
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [activeIdx]);
  const selFile = files.find(f => f.id === selected);

  return (
    <div className="app">
      <header><h1>Audio Search</h1><span className="muted">API: {api.API}</span></header>
      <div className="grid">
        <aside>
          <section
            className={`drop ${drag ? "over" : ""}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept="audio/*,video/*" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
            <strong>Drop audio here</strong><span className="muted">or click to choose files</span>
          </section>
          {uploads.length > 0 && <ul className="uploads">{uploads.map(u => (
            <li key={u.key}><span className="name">{u.name}</span>{u.status === "uploading" ? <span className="badge processing">uploading</span> : <Badge s={u.status} />}
              {u.error && <div className="err small">{u.error}</div>}</li>))}</ul>}
          <h2>Library <button className="link" onClick={refresh}>refresh</button></h2>
          {filesErr ? <p className="err">Couldn't load files: {filesErr}</p>
            : files.length === 0 ? <p className="muted">No files yet. Upload something to get started.</p>
            : <ul className="files">{files.map(f => (
              <li key={f.id} className={f.id === selected ? "sel" : ""} onClick={() => open(f.id)}>
                <span className="name">{f.filename}</span>
                <span className="meta">{f.duration ? api.fmt(f.duration) : ""} <Badge s={f.status} /></span></li>))}</ul>}
        </aside>
        <main>
          <input className="search" type="search" placeholder="Search what was said…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          {searchErr && <p className="err">Search failed: {searchErr}</p>}
          {results && !searchErr && (results.length === 0
            ? <p className="muted">{searching ? "Searching…" : `No matches for “${q.trim()}”.`}</p>
            : <ul className="results">{results.map((r, i) => (
              <li key={i} onClick={() => open(r.file_id, r.start)}>
                <div className="rhead"><span className="name">{r.filename}</span><span className="ts">{api.fmt(r.start)}</span></div>
                {r.summary?.trim() ? <>
                  <div className="summary">{r.summary}</div>
                  <div className="snip sub"><Snippet text={r.snippet} /></div>
                </> : <div className="snip"><Snippet text={r.snippet} /></div>}</li>))}</ul>)}
          {selected != null && (
            <section className="player">
              <h2>{selFile?.filename ?? `File ${selected}`}</h2>
              <audio ref={audioRef} key={selected} src={api.audioUrl(selected)} controls preload="metadata"
                onLoadedMetadata={onLoaded} onTimeUpdate={e => setTime(e.currentTarget.currentTime)} />
              {trLoading ? <p className="muted">Loading transcript…</p>
                : trErr ? <p className="err">Couldn't load transcript: {trErr}</p>
                : segments.length === 0 ? <p className="muted">{selFile && selFile.status !== "done" ? `Transcript not ready (${selFile.status}).` : "No transcript segments."}</p>
                : <ol className="transcript">{segments.map((s, i) => (
                  <li key={s.idx} ref={i === activeIdx ? activeRef : undefined} className={i === activeIdx ? "active" : ""}
                    onClick={() => { const a = audioRef.current; if (a) { a.currentTime = s.start; a.play().catch(() => {}); } }}>
                    <span className="ts">{api.fmt(s.start)}</span><span>{s.text}</span></li>))}</ol>}
            </section>)}
        </main>
      </div>
    </div>
  );
}
