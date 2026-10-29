import type { Status } from '../types';
const styles: Record<string, string> = {
  done: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  processing: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-yellow-100 text-yellow-800',
  uploading: 'bg-yellow-100 text-yellow-800',
};
export function StatusBadge({ status }: { status: Status | 'uploading' }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] ${styles[status] ?? 'bg-zinc-100 text-zinc-500'}`}
    >
      {status}
    </span>
  );
}
