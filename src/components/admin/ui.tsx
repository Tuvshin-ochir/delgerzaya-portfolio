'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Media } from '@/lib/types';

/** Small toast for "Saved ✓" / error feedback. */
export function useToast() {
  const [t, setT] = useState<{ text: string; err?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string, err = false) => { setT({ text, err }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 2600); }, []);
  const node = t ? <div className={`toast ${t.err ? 'err' : ''}`} role="status">{t.text}</div> : null;
  return { show, node };
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button type="button" className={`sw ${on ? 'on' : ''}`} aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export async function uploadFiles(files: File[]): Promise<{ added: Media[]; errors: string[] }> {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const j = await res.json().catch(() => ({ added: [], errors: ['Upload failed'] }));
  if (res.status === 401) return { added: [], errors: ['Your session expired — please sign in again'] };
  return { added: j.added || [], errors: j.errors || (j.error ? [j.error] : []) };
}

/** Drag-and-drop / click upload area. */
export function DropZone({ onFiles, busy, compact, accept = 'image/*,.heic,.heif,application/pdf' }: { onFiles: (f: File[]) => void; busy?: boolean; compact?: boolean; accept?: string }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={`drop ${over ? 'over' : ''}`} style={compact ? { padding: 10 } : { minHeight: 70 }}
      onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files]; if (f.length) onFiles(f); }}>
      <input ref={input} type="file" multiple accept={accept} hidden onChange={e => { const f = [...(e.target.files || [])]; e.target.value = ''; if (f.length) onFiles(f); }} />
      {busy ? <span>Uploading &amp; converting…</span> : <span>⬆ Drop photos or <b>browse</b> · JPG, PNG, WebP, HEIC, PDF · up to 15 MB</span>}
    </div>
  );
}

/** Warn before leaving a page with unsaved edits. */
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
}

