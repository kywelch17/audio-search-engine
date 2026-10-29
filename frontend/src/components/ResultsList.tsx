import type { SearchResult } from '../types';
import { ResultCard } from './ResultCard';
interface Props {
  query: string;
  results: SearchResult[] | null;
  searching: boolean;
  error: string | null;
  onPlay: (id: number, start: number) => void;
}
export function ResultsList({
  query,
  results,
  searching,
  error,
  onPlay,
}: Props) {
  if (error)
    return <p className="text-sm text-red-700">Search failed: {error}</p>;
  if (!results) return null;
  if (!results.length)
    return (
      <p className="text-[13px] text-zinc-500">
        {searching ? 'Searching…' : `No matches for “${query.trim()}”.`}
      </p>
    );
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {results.map((r, i) => (
        <ResultCard key={i} r={r} onPlay={onPlay} />
      ))}
    </ul>
  );
}
