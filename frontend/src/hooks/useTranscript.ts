import { useEffect, useState } from 'react';
import * as api from '../api';
import type { Segment } from '../types';
export function useTranscript(id: number | null) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (id == null) return;
    setLoading(true);
    setError(null);
    setSegments([]);
    api
      .getTranscript(id)
      .then((t) => setSegments(t.segments))
      .catch((e) => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [id]);
  return { segments, error, loading };
}
