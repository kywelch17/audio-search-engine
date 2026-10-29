import { fmt } from '../api';
export function Timestamp({ t }: { t: number }) {
  return (
    <span className="min-w-12 text-xs text-indigo-600 tabular-nums">
      {fmt(t)}
    </span>
  );
}
