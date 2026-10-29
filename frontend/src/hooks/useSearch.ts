import { useEffect, useState } from 'react';
import * as api from '../api';
import type { SearchResult } from '../types';
/** Debounced (300ms), abortable search. results=null when query is empty. */
export function useSearch(q: string) {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      setError(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      api
        .search(term, 30, ctl.signal)
        .then((r) => {
          setResults(r.results);
          setError(null);
        })
        .catch((e) => {
          if (e.name !== 'AbortError') setError(String(e.message || e));
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);
  return { results, searching, error };
}
