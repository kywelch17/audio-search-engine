import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { audioUrl } from '../api';
import type { FileInfo } from '../types';
import { useTranscript } from '../hooks/useTranscript';
import { TranscriptView } from './TranscriptView';
export interface AudioPlayerHandle {
  seek: (t: number) => void;
}
interface Props {
  fileId: number;
  file?: FileInfo;
  initialSeek: number | null;
}
/** Audio element + synced transcript for one file. Remount (key=fileId) to switch files. */
export const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(
  function AudioPlayer({ fileId, file, initialSeek }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const pending = useRef(initialSeek);
    const [time, setTime] = useState(0);
    const { segments, error, loading } = useTranscript(fileId);
    const seek = (t: number) => {
      const a = audioRef.current;
      if (a) {
        a.currentTime = t;
        a.play().catch(() => {});
      }
    };
    useImperativeHandle(ref, () => ({ seek }));
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold">
          {file?.filename ?? `File ${fileId}`}
        </h2>
        <audio
          ref={audioRef}
          src={audioUrl(fileId)}
          controls
          preload="metadata"
          className="w-full"
          onLoadedMetadata={() => {
            if (pending.current != null) {
              seek(pending.current);
              pending.current = null;
            }
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        />
        {loading ? (
          <p className="text-[13px] text-zinc-500">Loading transcript…</p>
        ) : error ? (
          <p className="text-sm text-red-700">
            Couldn't load transcript: {error}
          </p>
        ) : segments.length === 0 ? (
          <p className="text-[13px] text-zinc-500">
            {file && file.status !== 'done'
              ? `Transcript not ready (${file.status}).`
              : 'No transcript segments.'}
          </p>
        ) : (
          <TranscriptView segments={segments} time={time} onSeek={seek} />
        )}
      </section>
    );
  },
);
