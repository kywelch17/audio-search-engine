import { useEffect, useRef } from 'react';
import type { Segment } from '../types';
import { Timestamp } from './Timestamp';
export function TranscriptView({
  segments,
  time,
  onSeek,
}: {
  segments: Segment[];
  time: number;
  onSeek: (t: number) => void;
}) {
  const activeIdx = segments.findIndex((s) => time >= s.start && time < s.end);
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);
  return (
    <ol className="mt-3 max-h-[420px] overflow-auto">
      {segments.map((s, i) => (
        <li
          key={s.idx}
          ref={i === activeIdx ? activeRef : undefined}
          onClick={() => onSeek(s.start)}
          className={`flex cursor-pointer gap-3 rounded-md px-2 py-1.5 leading-normal ${i === activeIdx ? 'bg-indigo-50' : 'hover:bg-zinc-100'}`}
        >
          <Timestamp t={s.start} />
          <span>{s.text}</span>
        </li>
      ))}
    </ol>
  );
}
