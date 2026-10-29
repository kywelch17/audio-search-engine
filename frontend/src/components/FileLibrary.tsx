import { fmt } from '../api';
import type { FileInfo } from '../types';
import { SectionHeading } from './SectionHeading';
import { StatusBadge } from './StatusBadge';
interface Props {
  files: FileInfo[];
  error: string | null;
  selected: number | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
}
export function FileLibrary({
  files,
  error,
  selected,
  onSelect,
  onRefresh,
}: Props) {
  return (
    <>
      <SectionHeading
        action={
          <button
            className="cursor-pointer text-xs tracking-normal text-indigo-600 normal-case"
            onClick={onRefresh}
          >
            refresh
          </button>
        }
      >
        Library
      </SectionHeading>
      {error ? (
        <p className="text-sm text-red-700">Couldn't load files: {error}</p>
      ) : files.length === 0 ? (
        <p className="text-[13px] text-zinc-500">
          No files yet. Upload something to get started.
        </p>
      ) : (
        <ul>
          {files.map((f) => (
            <li
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm ${f.id === selected ? 'bg-indigo-50' : 'hover:bg-zinc-100'}`}
            >
              <span className="max-w-[200px] truncate font-medium">
                {f.filename}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                {f.duration ? fmt(f.duration) : ''}{' '}
                <StatusBadge status={f.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
