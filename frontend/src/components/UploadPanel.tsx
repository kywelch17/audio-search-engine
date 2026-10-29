import { useRef, useState } from 'react';
import type { UploadItem } from '../types';
import { StatusBadge } from './StatusBadge';
export function UploadPanel({
  uploads,
  onFiles,
}: {
  uploads: UploadItem[];
  onFiles: (f: FileList | null) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <section
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-7 transition hover:border-indigo-600 hover:bg-indigo-50 ${drag ? 'border-indigo-600 bg-indigo-50' : 'border-zinc-200 bg-white'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <strong>Drop audio here</strong>
        <span className="text-[13px] text-zinc-500">
          or click to choose files
        </span>
      </section>
      {uploads.length > 0 && (
        <ul className="mt-3">
          {uploads.map((u) => (
            <li
              key={u.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm"
            >
              <span className="max-w-[200px] truncate font-medium">
                {u.name}
              </span>
              <StatusBadge status={u.status} />
              {u.error && (
                <div className="w-full text-xs text-red-700">{u.error}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
