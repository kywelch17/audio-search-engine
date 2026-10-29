import type { SearchResult } from '../types';
import { Snippet } from './Snippet';
import { Timestamp } from './Timestamp';
/** One search hit: summary (if any) above the highlighted snippet; click plays from r.start. */
export function ResultCard({
  r,
  onPlay,
}: {
  r: SearchResult;
  onPlay: (fileId: number, start: number) => void;
}) {
  const summary = r.summary?.trim();
  return (
    <li
      onClick={() => onPlay(r.file_id, r.start)}
      className="cursor-pointer rounded-[10px] border border-zinc-200 bg-white px-3.5 py-3 hover:border-indigo-600"
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
        <span className="max-w-[200px] truncate font-medium">{r.filename}</span>
        <span className="flex items-center gap-2">
          {summary && r.summary_source === 'fallback' && (
            <span
              title="No LLM configured or it failed; showing a trimmed transcript excerpt"
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500"
            >
              excerpt
            </span>
          )}
          <Timestamp t={r.start} />
        </span>
      </div>
      {summary ? (
        <>
          <div className="mb-1 text-[15px] leading-snug font-medium">
            {summary}
          </div>
          <details
            className="text-[13px] text-zinc-500"
            onClick={(e) => e.stopPropagation()}
          >
            <summary className="cursor-pointer select-none">
              Transcript snippet
            </summary>
            <div className="mt-1">
              <Snippet text={r.snippet} />
            </div>
          </details>
        </>
      ) : (
        <div>
          <Snippet text={r.snippet} />
        </div>
      )}
    </li>
  );
}
