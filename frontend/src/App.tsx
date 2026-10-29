import { useRef, useState } from 'react';
import { API } from './api';
import { AudioPlayer, type AudioPlayerHandle } from './components/AudioPlayer';
import { FileLibrary } from './components/FileLibrary';
import { ResultsList } from './components/ResultsList';
import { SearchBar } from './components/SearchBar';
import { UploadPanel } from './components/UploadPanel';
import { useFiles } from './hooks/useFiles';
import { useSearch } from './hooks/useSearch';
import { useUploads } from './hooks/useUploads';

export default function App() {
  const { files, error: filesErr, refresh } = useFiles();
  const { uploads, addFiles } = useUploads(refresh);
  const [q, setQ] = useState('');
  const search = useSearch(q);
  const [selected, setSelected] = useState<number | null>(null);
  const [initialSeek, setInitialSeek] = useState<number | null>(null);
  const player = useRef<AudioPlayerHandle>(null);

  const open = (id: number, start?: number) => {
    if (id === selected) {
      if (start != null) player.current?.seek(start);
      return;
    }
    setInitialSeek(start ?? null);
    setSelected(id);
  };

  return (
    <div className="mx-auto max-w-[1200px] p-6 text-zinc-900">
      <header className="mb-5 flex items-baseline gap-4">
        <h1 className="text-[22px] font-bold">Audio Search</h1>
        <span className="text-[13px] text-zinc-500">API: {API}</span>
      </header>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <aside>
          <UploadPanel uploads={uploads} onFiles={addFiles} />
          <FileLibrary
            files={files}
            error={filesErr}
            selected={selected}
            onSelect={(id) => open(id)}
            onRefresh={refresh}
          />
        </aside>
        <main>
          <SearchBar value={q} onChange={setQ} />
          <ResultsList query={q} {...search} onPlay={open} />
          {selected != null && (
            <AudioPlayer
              key={selected}
              ref={player}
              fileId={selected}
              file={files.find((f) => f.id === selected)}
              initialSeek={initialSeek}
            />
          )}
        </main>
      </div>
    </div>
  );
}
