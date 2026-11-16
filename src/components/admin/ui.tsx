'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Media } from '@/lib/types';
import { MAX_UPLOAD_MB } from '@/lib/limits';

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

/**
 * Uploads one file per request, two at a time, so a big batch of phone photos never hits request-size
 * limits and one bad file doesn't sink the rest. Results keep the order the files were picked in.
 */
export async function uploadFiles(files: File[], onProgress?: (done: number, total: number) => void): Promise<{ added: Media[]; errors: string[] }> {
  const results: Media[][] = [], errors: string[] = [];
  let next = 0, done = 0, expired = false;

  async function one(f: File): Promise<Media[]> {
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { errors.push(`${f.name} is larger than ${MAX_UPLOAD_MB} MB`); return []; }
    const fd = new FormData();
    fd.append('files', f);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (res.status === 401) { expired = true; return []; }
      const j = await res.json().catch(() => ({ errors: [`${f.name}: upload failed (${res.status})`] }));
      errors.push(...(j.errors?.length ? j.errors : j.error ? [j.error] : []));
      return j.added || [];
    } catch {
      errors.push(`${f.name}: network error — try again`);
      return [];
    }
  }
  async function worker() {
    while (next < files.length && !expired) {
      const i = next++;
      results[i] = await one(files[i]);
      onProgress?.(++done, files.length);
    }
  }

  onProgress?.(0, files.length);
  await Promise.all([worker(), worker()]);
  if (expired) errors.unshift('Your session expired — please sign in again');
  return { added: results.flat().filter(Boolean), errors };
}

/** Drag-and-drop / click upload area. `progress` (e.g. "3 / 40") shows while busy. */
export function DropZone({ onFiles, busy, progress, compact, multiple = true, accept = 'image/*,.heic,.heif,application/pdf' }: { onFiles: (f: File[]) => void; busy?: boolean; progress?: string; compact?: boolean; multiple?: boolean; accept?: string }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const img = accept.includes('image'), pdf = accept.includes('pdf');
  const what = !img ? 'a PDF' : multiple ? 'photos' : 'a photo';
  const types = [img && 'JPG, PNG, WebP, HEIC', pdf && 'PDF'].filter(Boolean).join(', ');
  return (
    <div className={`drop ${over ? 'over' : ''}`} style={compact ? { padding: 10 } : { minHeight: 70 }}
      onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files]; if (f.length) onFiles(f); }}>
      <input ref={input} type="file" multiple={multiple} accept={accept} hidden onChange={e => { const f = [...(e.target.files || [])]; e.target.value = ''; if (f.length) onFiles(f); }} />
      {busy ? <span>Uploading &amp; converting{progress ? ` · ${progress}` : '…'}</span> : <span>⬆ Drop {what} or <b>browse</b> · {types} · up to {MAX_UPLOAD_MB} MB{multiple ? ' each' : ''}</span>}
    </div>
  );
}

/** Modal grid of library photos to pick from. */
export function MediaPicker({ title, media, isOn, labels = ['✓ Added', 'Add'], onPick, onClose }: { title: string; media: Media[]; isOn: (m: Media) => boolean; labels?: [string, string]; onPick: (m: Media) => void; onClose: () => void }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="panel pad" onClick={e => e.stopPropagation()}>
        <div className="ph"><h3>{title}</h3><button className="btn pri sm" onClick={onClose}>Done</button></div>
        {media.length === 0 && <p className="muted">No photos in the library yet — upload one first.</p>}
        <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {media.map(m => {
            const on = isOn(m);
            return (
              <button key={m.id} className={`mtile ${on ? 'sel' : ''}`} onClick={() => onPick(m)}>
                <img className="im" src={m.thumb} alt="" loading="lazy" decoding="async" />
                <div className="nm"><b>{m.name}</b><small>{on ? <span className="used">{labels[0]}</span> : <span className="unused">{labels[1]}</span>}</small></div>
              </button>
            );
          })}
        </div>
      </div>
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
