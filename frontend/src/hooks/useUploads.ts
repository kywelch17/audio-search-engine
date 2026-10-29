import { useEffect, useState } from 'react';
import * as api from '../api';
import type { Status, UploadItem } from '../types';
const msg = (e: unknown) => String((e as Error)?.message || e);
/** Uploads files and polls job status every 1.5s until done/error. */
export function useUploads(onChange: () => void) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  useEffect(() => {
    const active = uploads.filter(
      (u) =>
        u.id != null && (u.status === 'pending' || u.status === 'processing'),
    );
    if (!active.length) return;
    const t = setTimeout(async () => {
      const upd = await Promise.all(
        active.map((u) =>
          api
            .getStatus(u.id!)
            .then((s) => ({
              key: u.key,
              status: s.status,
              error: s.error ?? undefined,
            }))
            .catch((e) => ({
              key: u.key,
              status: 'error' as Status,
              error: msg(e),
            })),
        ),
      );
      setUploads((prev) =>
        prev.map((u) => {
          const n = upd.find((x) => x.key === u.key);
          return n ? { ...u, ...n } : u;
        }),
      );
      if (upd.some((x) => x.status === 'done' || x.status === 'error'))
        onChange();
    }, 1500);
    return () => clearTimeout(t);
  }, [uploads, onChange]);
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    Array.from(list).forEach((f) => {
      const key = crypto.randomUUID?.() ?? String(Math.random());
      setUploads((p) => [{ key, name: f.name, status: 'uploading' }, ...p]);
      api
        .upload(f)
        .then((r) => {
          setUploads((p) =>
            p.map((u) =>
              u.key === key ? { ...u, id: r.id, status: r.status } : u,
            ),
          );
          onChange();
        })
        .catch((e) =>
          setUploads((p) =>
            p.map((u) =>
              u.key === key ? { ...u, status: 'error', error: msg(e) } : u,
            ),
          ),
        );
    });
  };
  return { uploads, addFiles };
}
