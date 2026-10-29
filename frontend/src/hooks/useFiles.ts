import { useCallback, useEffect, useState } from 'react';
import * as api from '../api';
import type { FileInfo } from '../types';
const msg = (e: unknown) => String((e as Error)?.message || e);
export function useFiles() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    api
      .listFiles()
      .then((f) => {
        setFiles(f);
        setError(null);
      })
      .catch((e) => setError(msg(e)));
  }, []);
  useEffect(refresh, [refresh]);
  return { files, error, refresh };
}
