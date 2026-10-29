export type Status = 'pending' | 'processing' | 'done' | 'error';
export interface FileInfo {
  id: number;
  filename: string;
  status: Status;
  language?: string | null;
  duration?: number | null;
  created_at?: string;
}
export interface Segment {
  idx: number;
  start: number;
  end: number;
  text: string;
}
export interface Transcript {
  id: number;
  filename: string;
  status: Status;
  language: string | null;
  segments: Segment[];
}
export interface SearchResult {
  file_id: number;
  filename: string;
  start: number;
  end: number;
  text: string;
  snippet: string;
  summary?: string | null;
  summary_source?: 'llm' | 'fallback' | null;
  context_start?: number;
  context_end?: number;
  segment_id?: number;
  idx?: number;
}
export interface UploadItem {
  key: string;
  name: string;
  id?: number;
  status: Status | 'uploading';
  error?: string;
}
