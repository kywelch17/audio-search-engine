export const API =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000';
import type { FileInfo, SearchResult, Status, Transcript } from './types';
export type * from './types';

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, init);
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try {
      const b = await r.json();
      if (b?.detail)
        msg =
          typeof b.detail === 'string' ? b.detail : JSON.stringify(b.detail);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}
export const listFiles = () => j<FileInfo[]>('/files');
export const getStatus = (id: number) =>
  j<{ id: number; status: Status; error: string | null }>(
    `/files/${id}/status`,
  );
export const getTranscript = (id: number) =>
  j<Transcript>(`/files/${id}/transcript`);
export const search = (q: string, limit = 20, signal?: AbortSignal) =>
  j<{ query: string; results: SearchResult[] }>(
    `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    { signal },
  );
export const audioUrl = (id: number) => `${API}/files/${id}/audio`;
export function upload(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return j<{ id: number; status: Status }>('/files', {
    method: 'POST',
    body: fd,
  });
}
export function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    x = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'),
    ss = String(x).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm.padStart(2, '0')}:${ss}`;
}
