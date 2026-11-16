'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { saveSection } from '@/app/admin/actions';
import type { Entry, Media, Section } from '@/lib/types';
import { MAX_SECTION_PHOTOS } from '@/lib/limits';
import { DropZone, MediaPicker, Switch, uploadFiles, useToast, useUnsaved } from './ui';

let k = 0;
const newId = () => `e${Date.now().toString(36)}${(k++).toString(36)}`;

function ChipsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [t, setT] = useState('');
  const add = () => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(''); };
  return (
    <div className="chips">
      {value.map(v => <span className="chip" key={v}>{v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter(x => x !== v))}>×</button></span>)}
      <input value={t} placeholder={placeholder} onChange={e => setT(e.target.value)} onBlur={add} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } if (e.key === 'Backspace' && !t && value.length) onChange(value.slice(0, -1)); }} />
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] { const a = [...arr]; a.splice(to, 0, ...a.splice(from, 1)); return a; }

export default function SectionEditor({ section, media: initialMedia }: { section: Section; media: Media[] }) {
  const [s, setS] = useState<Section>(section);
  const [saved, setSaved] = useState(JSON.stringify(section));
  const [media, setMedia] = useState(initialMedia);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState('');
  const [picker, setPicker] = useState(false);
  const [dragImg, setDragImg] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show, node } = useToast();
  const dirty = JSON.stringify(s) !== saved;
  useUnsaved(dirty);
  const byId = useMemo(() => new Map(media.map(m => [m.id, m])), [media]);
  const home = s.key === 'home';
  const set = (p: Partial<Section>) => setS(x => ({ ...x, ...p }));
  const setEntry = (i: number, p: Partial<Entry>) => set({ entries: s.entries.map((e, j) => j === i ? { ...e, ...p } : e) });

  function save(statusOverride?: Section['status']) {
    const next = statusOverride ? { ...s, status: statusOverride } : s;
    if (statusOverride) setS(next);
    start(async () => {
      const r = await saveSection(s.key, next);
      if (r.ok) { setSaved(JSON.stringify(next)); show(statusOverride === 'published' ? 'Published ✓' : statusOverride === 'draft' ? 'Saved as draft ✓' : 'Saved ✓'); router.refresh(); }
      else show(r.error, true);
    });
  }

  async function onFiles(files: File[]) {
    setBusy(true);
    const { added, errors } = await uploadFiles(files, (d, t) => setProg(t > 1 ? `${d} / ${t}` : ''));
    setBusy(false); setProg('');
    if (added.length) {
      const imgs = added.filter(a => a.kind === 'image').map(a => ({ mediaId: a.id, caption: '' }));
      const room = MAX_SECTION_PHOTOS - s.images.length;
      setMedia(m => [...added, ...m]);
      setS(x => ({ ...x, images: [...x.images, ...imgs].slice(0, MAX_SECTION_PHOTOS) }));   // functional: keeps edits made during a long upload
      show(imgs.length > room ? `Uploaded ✓ This section holds ${MAX_SECTION_PHOTOS} photos — the rest are in the Media library` : `${added.length} file${added.length > 1 ? 's' : ''} uploaded ✓ — press Save`);
    }
    if (errors.length) show(errors.join(' · '), true);
  }

  return (
    <>
      <div className="hd" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin/sections" className="btn out sm">← Sections</Link>
          <h1>{s.label || 'Untitled'}</h1>
          <span className={`pill ${s.status === 'published' ? 'pub' : 'dra'}`}><i />{s.status === 'published' ? 'Published' : 'Draft'}</span>
          <span className="muted">{dirty ? '● Unsaved changes' : '✓ All changes saved'}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn out" href="/?preview=1" target="_blank" rel="noreferrer">Preview ↗</a>
          {!home && s.status === 'published' && <button className="btn out" disabled={pending} onClick={() => save('draft')}>Move to draft</button>}
          <button className="btn out" disabled={pending || !dirty} onClick={() => save()}>Save</button>
          {!home && s.status !== 'published' && <button className="btn pri" disabled={pending} onClick={() => save('published')}>Publish</button>}
          {(home || s.status === 'published') && <button className="btn pri" disabled={pending || !dirty} onClick={() => save()}>{pending ? 'Saving…' : 'Save & update site'}</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 14, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 12 }}>
          <div className="panel pad">
            <div className="ph"><h3>Names &amp; titles</h3><small>rename freely — the 3D shape stays the same</small></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr 1fr 1.5fr', gap: 10 }}>
              <div className="fl"><label>Organelle name</label><input className="in" value={s.organelle} maxLength={80} onChange={e => set({ organelle: e.target.value })} /></div>
              <div className="fl"><label>Short name</label><input className="in" value={s.short} maxLength={40} onChange={e => set({ short: e.target.value })} /></div>
              <div className="fl"><label>Menu label</label><input className="in" value={s.label} maxLength={40} onChange={e => set({ label: e.target.value })} /></div>
              <div className="fl"><label>Page title</label><input className="in" value={s.title} maxLength={120} onChange={e => set({ title: e.target.value })} /></div>
            </div>
          </div>

          <div className="panel pad">
            <div className="ph"><h3>Telemetry panel <span className="muted">· left side of the site</span></h3><span style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="muted">Show <Switch on={s.showTelemetry} onChange={v => set({ showTelemetry: v })} label="Show telemetry" /></span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '.7fr 1fr 1.4fr 1fr 1.3fr', gap: 10, opacity: s.showTelemetry ? 1 : 0.5 }}>
              <div className="fl"><label>Magnification ×</label><input className="in" type="number" min={1} value={s.mag} onChange={e => set({ mag: Number(e.target.value) || 0 })} /></div>
              <div className="fl"><label>Objective</label><input className="in" value={s.objective} onChange={e => set({ objective: e.target.value })} /></div>
              <div className="fl"><label>Channels <span>· Enter to add</span></label><ChipsInput value={s.channels} onChange={v => set({ channels: v })} placeholder="GFP" /></div>
              <div className="fl"><label>Size</label><input className="in" value={s.size} onChange={e => set({ size: e.target.value })} /></div>
              <div className="fl"><label>Function</label><input className="in" value={s.fn} onChange={e => set({ fn: e.target.value })} /></div>
            </div>
          </div>

          <div className="panel pad">
            <div className="ph"><h3>Notebook entries <span className="muted">· right side of the site</span></h3><button className="btn out sm" onClick={() => set({ entries: [...s.entries, { id: newId(), date: '', title: '', detail: '' }] })}>＋ Add entry</button></div>
            {s.entries.length === 0 && <p className="muted">No entries — the notebook will only show the title{s.images.length ? ' and photos' : ''}.</p>}
            {s.entries.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: '54px 170px 1fr 1fr 30px', gap: 10, font: '700 10.5px var(--fm)', color: 'var(--dim)', letterSpacing: '.08em', textTransform: 'uppercase', paddingBottom: 6 }}><span /><span>Date / label</span><span>Title</span><span>Detail</span><span /></div>}
            {s.entries.map((e, i) => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '54px 170px 1fr 1fr 30px', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ display: 'flex', gap: 2 }}>
                  <button className="btn out sm" style={{ padding: '0 7px' }} disabled={i === 0} onClick={() => set({ entries: move(s.entries, i, i - 1) })} aria-label="Move up">↑</button>
                  <button className="btn out sm" style={{ padding: '0 7px' }} disabled={i === s.entries.length - 1} onClick={() => set({ entries: move(s.entries, i, i + 1) })} aria-label="Move down">↓</button>
                </span>
                <input className="in" value={e.date} placeholder="2025.03 — now" onChange={ev => setEntry(i, { date: ev.target.value })} />
                <input className="in" value={e.title} placeholder="Title" onChange={ev => setEntry(i, { title: ev.target.value })} />
                <input className="in" value={e.detail} placeholder="optional — empty is hidden" onChange={ev => setEntry(i, { detail: ev.target.value })} />
                <button className="btn out sm danger" style={{ padding: 0, width: 30 }} onClick={() => set({ entries: s.entries.filter((_, j) => j !== i) })} aria-label="Delete entry">🗑</button>
              </div>
            ))}
          </div>

          <div className="panel pad">
            <div className="ph"><h3>Results chart</h3><span style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="muted">Show on site <Switch on={s.chart.enabled} onChange={v => set({ chart: { ...s.chart, enabled: v } })} label="Show chart" /></span></div>
            {s.chart.enabled ? (
              <>
                <div className="fl" style={{ marginBottom: 10 }}><label>Chart title</label><input className="in" value={s.chart.title} onChange={e => set({ chart: { ...s.chart, title: e.target.value } })} /></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {s.chart.rows.map((r, i) => (
                    <span key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', border: '1px solid var(--line)', borderRadius: 10, padding: 4 }}>
                      <input className="in slim" style={{ width: 100 }} value={r.label} placeholder="Label" onChange={e => set({ chart: { ...s.chart, rows: s.chart.rows.map((x, j) => j === i ? { ...x, label: e.target.value } : x) } })} />
                      <input className="in slim" style={{ width: 70 }} type="number" value={r.value} onChange={e => set({ chart: { ...s.chart, rows: s.chart.rows.map((x, j) => j === i ? { ...x, value: Number(e.target.value) } : x) } })} />
                      <button className="btn sm danger" style={{ padding: '0 6px' }} onClick={() => set({ chart: { ...s.chart, rows: s.chart.rows.filter((_, j) => j !== i) } })} aria-label="Remove bar">×</button>
                    </span>
                  ))}
                  <button className="btn out sm" onClick={() => set({ chart: { ...s.chart, rows: [...s.chart.rows, { label: '', value: 0 }] } })}>＋ Bar</button>
                </div>
              </>
            ) : <p className="muted">Off — turn on to show a small bar chart (e.g. lab results) under the notebook.</p>}
          </div>
        </div>

        <div className="grid" style={{ gap: 12, position: 'sticky', top: 76 }}>
          <div className="panel pad">
            <div className="ph"><h3>Visibility</h3></div>
            {home ? <p className="muted">The home section (whole cell) is always visible.</p> : (
              <>
                <div className="seg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%' }}>
                  <button className={s.status === 'published' ? 'on' : ''} onClick={() => set({ status: 'published' })}>● Published</button>
                  <button className={s.status !== 'published' ? 'on d' : ''} onClick={() => set({ status: 'draft' })}>Draft</button>
                </div>
                <p className="hint" style={{ marginTop: 10 }}>Draft hides this section and its organelle label from the website. All text and photos stay saved — publish again any time.</p>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontWeight: 600, fontSize: 13 }}>Show contact form here <Switch on={s.showForm} onChange={v => set({ showForm: v })} label="Contact form" /></div>
          </div>

          <div className="panel pad">
            <div className="ph"><h3>Photos</h3><small>{s.images.length}{s.images.length >= MAX_SECTION_PHOTOS ? ' (full)' : ''} · drag to reorder · first = cover</small></div>
            {s.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                {s.images.map((im, i) => {
                  const m = byId.get(im.mediaId);
                  return (
                    <div key={`${im.mediaId}-${i}`} draggable onDragStart={() => setDragImg(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragImg !== null && dragImg !== i) set({ images: move(s.images, dragImg, i) }); setDragImg(null); }}>
                      <div className="thumb" style={{ height: 84, backgroundImage: m ? `url(${m.thumb})` : undefined }}>
                        {i === 0 && <span className="star">★ Cover</span>}
                        <button className="x" onClick={() => set({ images: s.images.filter((_, j) => j !== i) })} aria-label="Remove photo">×</button>
                      </div>
                      <input className="in slim" style={{ marginTop: 4, fontSize: 11.5 }} placeholder={m?.caption || 'Caption'} value={im.caption} onChange={e => set({ images: s.images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x) })} />
                    </div>
                  );
                })}
              </div>
            )}
            <DropZone onFiles={onFiles} busy={busy} progress={prog} compact />
            <button className="btn out sm" style={{ marginTop: 8, width: '100%' }} onClick={() => setPicker(true)}>Choose from media library</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontWeight: 600, fontSize: 13 }}>Show photos as
              <span className="seg"><button className={s.layout === 'strip' ? 'on' : ''} onClick={() => set({ layout: 'strip' })}>Strip</button><button className={s.layout === 'grid' ? 'on' : ''} onClick={() => set({ layout: 'grid' })}>Grid</button></span>
            </div>
          </div>

          <div className="panel pad">
            <div className="fl"><label>Tags <span>· Enter to add</span></label><ChipsInput value={s.tags} onChange={v => set({ tags: v })} placeholder="e.g. PCR" /></div>
          </div>
        </div>
      </div>

      {picker && (
        <MediaPicker title="Choose photos" media={media.filter(m => m.kind === 'image')} isOn={m => s.images.some(i => i.mediaId === m.id)} onClose={() => setPicker(false)}
          onPick={m => {
            if (s.images.some(i => i.mediaId === m.id)) set({ images: s.images.filter(i => i.mediaId !== m.id) });
            else if (s.images.length >= MAX_SECTION_PHOTOS) show(`A section holds up to ${MAX_SECTION_PHOTOS} photos`, true);
            else set({ images: [...s.images, { mediaId: m.id, caption: '' }] });
          }} />
      )}
      {node}
    </>
  );
}
