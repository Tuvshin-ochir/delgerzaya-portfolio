'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { reorder, saveSection, setInUse, setStatus, type Result } from '@/app/admin/actions';
import type { OrganelleKey, SectionStatus } from '@/lib/types';
import { useToast } from './ui';

export interface Row { key: OrganelleKey; label: string; organelle: string; title: string; status: SectionStatus; inUse: boolean; images: number; color: string; fn: string }

export default function SectionsManager({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);
  const [drag, setDrag] = useState<OrganelleKey | null>(null);
  const [over, setOver] = useState<OrganelleKey | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const { show, node } = useToast();

  const used = rows.filter(r => r.inUse), unused = rows.filter(r => !r.inUse);
  const run = (p: Promise<Result>, ok = 'Saved ✓') => start(async () => { const r = await p; if (r.ok) show(ok); else show(r.error, true); router.refresh(); });

  const patch = (key: OrganelleKey, p: Partial<Row>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...p } : r));
  function drop(target: OrganelleKey) {
    if (!drag || drag === target || target === 'home') return;
    const list = used.filter(r => r.key !== 'home').map(r => r.key);
    const from = list.indexOf(drag), to = list.indexOf(target);
    list.splice(to, 0, ...list.splice(from, 1));
    setRows(rs => [...rs].sort((a, b) => (a.key === 'home' ? -1 : b.key === 'home' ? 1 : (list.indexOf(a.key) + 1 || 99) - (list.indexOf(b.key) + 1 || 99))));
    run(reorder(list), 'Order saved ✓');
  }

  const cols = '22px 12px 1.3fr 1.2fr 64px 176px 150px';
  return (
    <>
      <div className="hd">
        <div><h1>Sections</h1><p>Every section lives inside an organelle of your 3D cell. Rename anything, drag ⋮⋮ to reorder, or switch to <b style={{ color: 'var(--amber)' }}>Draft</b> to hide it from the website — nothing is deleted.</p></div>
      </div>
      <div className="panel">
        <div className="row head" style={{ gridTemplateColumns: cols }}><span /><span /><span>Menu label · organelle</span><span>Page title</span><span>Photos</span><span>Status</span><span /></div>
        {used.map((r, i) => {
          const home = r.key === 'home';
          return (
            <div key={r.key} className={`row ${r.status !== 'published' ? 'draft' : ''} ${over === r.key ? 'dragover' : ''}`} style={{ gridTemplateColumns: cols }}
              draggable={!home} onDragStart={() => setDrag(r.key)} onDragEnd={() => { setDrag(null); setOver(null); }}
              onDragOver={e => { if (!home && drag) { e.preventDefault(); setOver(r.key); } }} onDragLeave={() => setOver(null)} onDrop={e => { e.preventDefault(); setOver(null); drop(r.key); }}>
              <span className="handle" title={home ? 'Home is always first' : 'Drag to reorder'}>{home ? '·' : '⋮⋮'}</span>
              <span className="dot" style={{ background: r.color }} />
              <span className="lbl">
                <input className="in slim" defaultValue={r.label} aria-label="Menu label" style={{ fontWeight: 700, maxWidth: 220 }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  onBlur={e => { const v = e.target.value.trim(); if (v && v !== r.label) { patch(r.key, { label: v }); run(saveSection(r.key, { label: v }), 'Renamed ✓'); } else e.target.value = r.label; }} />
                <small style={{ display: 'block', marginTop: 2 }}>{String(i).padStart(2, '0')} · {r.organelle}{r.status !== 'published' ? ' — hidden from website' : ''}</small>
              </span>
              <span style={{ color: r.status !== 'published' ? 'var(--dim)' : undefined }}>{r.title}</span>
              <span>{r.images || '—'}</span>
              {home ? <span className="pill lock">🔒 Always visible</span> : (
                <span className="seg">
                  <button className={r.status === 'published' ? 'on' : ''} onClick={() => { patch(r.key, { status: 'published' }); run(setStatus(r.key, 'published'), 'Published ✓'); }}>Published</button>
                  <button className={r.status !== 'published' ? 'on d' : ''} onClick={() => { patch(r.key, { status: 'draft' }); run(setStatus(r.key, 'draft'), 'Moved to draft ✓'); }}>Draft</button>
                </span>
              )}
              <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Link className="btn out sm" href={`/admin/sections/${r.key}`}>Edit</Link>
                {!home && <button className="btn out sm" title="Stop using this organelle" onClick={() => { if (confirm(`Remove “${r.label}” from the site? Its text and photos stay saved and you can add it back later.`)) { patch(r.key, { inUse: false }); run(setInUse(r.key, false), 'Removed ✓'); } }}>✕</button>}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 14, marginTop: 14 }}>
        <div className="panel pad">
          <div className="ph"><h3>Unused organelles</h3><small>turn one into a new section</small></div>
          {unused.length === 0 && <p className="muted">All organelles are in use.</p>}
          <div className="grid">
            {unused.map(r => (
              <div className="orgcard" key={r.key}>
                <span className="o" style={{ background: `${r.color}22`, color: r.color }}>{r.organelle.slice(0, 2).toUpperCase()}</span>
                <div><b>{r.organelle}</b><span className="muted">{r.fn} · e.g. “{r.label}”</span></div>
                <button className="btn out sm" onClick={() => { patch(r.key, { inUse: true, status: 'draft' }); run(setInUse(r.key, true), 'Added as draft ✓'); }}>＋ Use</button>
              </div>
            ))}
          </div>
        </div>
        <div className="panel pad">
          <div className="ph"><h3>Website menu preview</h3><small>only published sections</small></div>
          <div className="menuprev">
            {used.filter(r => r.status === 'published').map((r, i) => <div key={r.key}><i style={{ background: r.color }} />{String(i).padStart(2, '0')}<b>{r.label}</b></div>)}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>Drafts disappear from this menu and their organelle dims in the 3D cell. Use “Preview with drafts” (top right) to see them before publishing.</p>
        </div>
      </div>
      {node}
    </>
  );
}
