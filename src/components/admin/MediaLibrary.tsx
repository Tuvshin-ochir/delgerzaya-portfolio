'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { deleteMedia, updateMedia } from '@/app/admin/actions';
import type { Media } from '@/lib/types';
import { fmtDate, fmtSize } from '@/lib/format';
import { DropZone, uploadFiles, useToast } from './ui';

type Tab = 'all' | 'image' | 'document' | 'unused';

export default function MediaLibrary({ media: initial, usage, tz, disk }: { media: Media[]; usage: Record<string, string[]>; tz: string; disk: { free: number; total: number } | null }) {
  const [media, setMedia] = useState(initial);
  useEffect(() => setMedia(initial), [initial]);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(initial[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show, node } = useToast();

  const list = useMemo(() => media.filter(m =>
    (tab === 'all' || (tab === 'unused' ? !usage[m.id]?.length : m.kind === tab)) && (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.caption.toLowerCase().includes(q.toLowerCase()))), [media, tab, q, usage]);
  const cur = media.find(m => m.id === sel) ?? null;
  const [caption, setCaption] = useState(''); const [alt, setAlt] = useState('');
  useEffect(() => { setCaption(cur?.caption ?? ''); setAlt(cur?.alt ?? ''); }, [cur?.id, cur?.caption, cur?.alt]);
  const total = media.reduce((a, m) => a + m.size, 0);

  async function onFiles(files: File[]) {
    setBusy(true);
    const { added, errors } = await uploadFiles(files, (d, t) => setProg(t > 1 ? `${d} / ${t}` : ''));
    setBusy(false); setProg('');
    if (added.length) { setMedia(m => [...added, ...m]); setSel(added[0].id); show(`${added.length} file${added.length > 1 ? 's' : ''} uploaded ✓`); router.refresh(); }
    if (errors.length) show(errors.join(' · '), true);
  }

  return (
    <>
      <div className="hd">
        <div><h1>Media library</h1><p>{media.length} files · {fmtSize(total)}{disk ? ` · ${fmtSize(disk.free)} free` : ''}. Photos are resized and converted to WebP automatically, so phone pictures (even iPhone HEIC) load fast.</p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 14, alignItems: 'start' }}>
        <div>
          <DropZone onFiles={onFiles} busy={busy} progress={prog} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0', gap: 10, flexWrap: 'wrap' }}>
            <div className="tabs">
              {([['all', `All ${media.length}`], ['image', `Images ${media.filter(m => m.kind === 'image').length}`], ['document', `Documents ${media.filter(m => m.kind === 'document').length}`], ['unused', `Unused ${media.filter(m => !usage[m.id]?.length).length}`]] as [Tab, string][]).map(([t, l]) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{l}</button>)}
            </div>
            <input className="in" style={{ width: 240 }} placeholder="🔍 Search files…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {list.length === 0 && <p className="muted" style={{ padding: 20 }}>Nothing here yet.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
            {list.map(m => (
              <button key={m.id} className={`mtile ${sel === m.id ? 'sel' : ''}`} onClick={() => setSel(m.id)}>
                {m.kind === 'image' ? <img className="im" src={m.thumb} alt="" loading="lazy" decoding="async" /> : <div className="im doc">PDF</div>}
                <div className="nm"><b>{m.name}</b><small>{fmtSize(m.size)} {usage[m.id]?.length ? <span className="used">{usage[m.id].length > 1 ? `${usage[m.id].length} places` : usage[m.id][0]}</span> : <span className="unused">Unused</span>}</small></div>
              </button>
            ))}
          </div>
        </div>
        {cur && (
          <div className="panel pad" style={{ position: 'sticky', top: 76 }}>
            {cur.kind === 'image'
              ? <div className="thumb" style={{ height: 200, backgroundImage: `url(${cur.thumb})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              : <div className="thumb doc" style={{ height: 120 }}>PDF</div>}
            <h3 style={{ font: '700 15px var(--fb)', marginTop: 12, wordBreak: 'break-all' }}>{cur.name}</h3>
            <p className="muted" style={{ fontFamily: 'var(--fm)' }}>{cur.width ? `${cur.width} × ${cur.height} · ` : ''}{fmtSize(cur.size)} · {fmtDate(cur.createdAt, tz)}</p>
            <div className="fl" style={{ marginTop: 12 }}><label>Caption <span>· default text under the photo</span></label><input className="in" value={caption} onChange={e => setCaption(e.target.value)} /></div>
            <div className="fl" style={{ marginTop: 10 }}><label>Alt text <span>· for screen readers &amp; Google</span></label><input className="in" value={alt} onChange={e => setAlt(e.target.value)} /></div>
            <div className="fl" style={{ marginTop: 10 }}><label>Used in</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{usage[cur.id]?.length ? usage[cur.id].map(u => <span className="chip" key={u}>{u}</span>) : <span className="muted">Not used anywhere yet</span>}</div></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn pri sm" disabled={pending || (caption === cur.caption && alt === cur.alt)} onClick={() => start(async () => { const r = await updateMedia(cur.id, { caption, alt }); if (r.ok) { setMedia(ms => ms.map(m => m.id === cur.id ? { ...m, caption, alt } : m)); show('Saved ✓'); } else show(r.error, true); })}>Save</button>
              <a className="btn out sm" href={cur.url} target="_blank" rel="noreferrer">Open ↗</a>
              <button className="btn out sm danger" style={{ marginLeft: 'auto' }} disabled={pending} onClick={() => { if (!confirm(`Delete ${cur.name}? It will also be removed from ${usage[cur.id]?.length || 0} place(s).`)) return; start(async () => { const r = await deleteMedia(cur.id); if (r.ok) { setMedia(ms => ms.filter(m => m.id !== cur.id)); setSel(null); show('Deleted'); router.refresh(); } else show(r.error, true); }); }}>Delete</button>
            </div>
          </div>
        )}
      </div>
      {node}
    </>
  );
}
