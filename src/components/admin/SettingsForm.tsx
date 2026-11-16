'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveSettings } from '@/app/admin/actions';
import type { Media, SiteSettings } from '@/lib/types';
import { DropZone, uploadFiles, useToast, useUnsaved } from './ui';

type S = Pick<SiteSettings, 'siteTitle' | 'description' | 'notifyEmail' | 'links' | 'cvMediaId'>;

export default function SettingsForm({ initial, documents: initialDocs, driver, emailReady }: { initial: S; documents: Media[]; driver: string; emailReady: boolean }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [docs, setDocs] = useState(initialDocs);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show, node } = useToast();
  const dirty = JSON.stringify(s) !== saved;
  useUnsaved(dirty);
  const set = (p: Partial<S>) => setS(x => ({ ...x, ...p }));

  return (
    <>
      <div className="hd">
        <div><h1>Site settings</h1><p>Search-engine text, contact alerts, links and your CV.</p></div>
        <button className="btn pri" disabled={!dirty || pending} onClick={() => start(async () => { const r = await saveSettings(s); if (r.ok) { setSaved(JSON.stringify(s)); show('Saved ✓'); router.refresh(); } else show(r.error, true); })}>{pending ? 'Saving…' : 'Save settings'}</button>
      </div>
      <div className="g2" style={{ alignItems: 'start' }}>
        <div className="grid" style={{ gap: 14 }}>
          <div className="panel pad">
            <div className="ph"><h3>Google &amp; sharing</h3><small>browser tab, search results, link previews</small></div>
            <div className="fl"><label>Site title</label><input className="in" value={s.siteTitle} maxLength={120} onChange={e => set({ siteTitle: e.target.value })} /></div>
            <div className="fl" style={{ marginTop: 10 }}><label>Description <span>· {s.description.length}/300</span></label><textarea className="in" value={s.description} maxLength={300} onChange={e => set({ description: e.target.value })} /></div>
          </div>
          <div className="panel pad">
            <div className="ph"><h3>Contact form alerts</h3></div>
            <div className="fl"><label>Send new messages to <span>· private, never shown on the site</span></label><input className="in" type="email" value={s.notifyEmail} placeholder="you@example.com" onChange={e => set({ notifyEmail: e.target.value })} /></div>
            <p className="hint" style={{ marginTop: 8 }}>{emailReady ? 'Email sending is set up ✓' : 'Messages are always saved in Admin → Messages. To also get an email, the developer adds RESEND_API_KEY on the server.'}</p>
          </div>
        </div>
        <div className="grid" style={{ gap: 14 }}>
          <div className="panel pad">
            <div className="ph"><h3>Links</h3><button className="btn out sm" onClick={() => set({ links: [...s.links, { label: '', url: '' }] })}>＋ Link</button></div>
            {s.links.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 30px', gap: 8, marginBottom: 8 }}>
                <input className="in" placeholder="LinkedIn" value={l.label} onChange={e => set({ links: s.links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                <input className="in" placeholder="https://…" value={l.url} onChange={e => set({ links: s.links.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} />
                <button className="btn out sm danger" style={{ padding: 0, width: 30, height: 38 }} onClick={() => set({ links: s.links.filter((_, j) => j !== i) })} aria-label="Remove link">🗑</button>
              </div>
            ))}
            <p className="hint">Links with an empty address are hidden. They appear under the contact form.</p>
          </div>
          <div className="panel pad">
            <div className="ph"><h3>CV download</h3><small>shows a “CV ↓” button on the site</small></div>
            <select className="in" value={s.cvMediaId ?? ''} onChange={e => set({ cvMediaId: e.target.value || null })}>
              <option value="">No CV button</option>
              {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div style={{ marginTop: 10 }}>
              <DropZone compact busy={busy} accept="application/pdf" onFiles={async files => {
                setBusy(true); const { added, errors } = await uploadFiles(files); setBusy(false);
                const pdf = added.find(a => a.kind === 'document');
                if (pdf) { setDocs(d => [pdf, ...d]); set({ cvMediaId: pdf.id }); show('CV uploaded — press Save settings'); }
                if (errors.length) show(errors.join(' · '), true);
              }} />
            </div>
          </div>
          <div className="panel pad">
            <div className="ph"><h3>Account &amp; storage</h3></div>
            <p className="hint">The admin password is set on the server (ADMIN_PASSWORD) — ask the developer to change it.</p>
            <p className="hint" style={{ marginTop: 6 }}>Storage: <b>{driver === 'supabase' ? 'Supabase (cloud)' : 'Local disk'}</b></p>
          </div>
        </div>
      </div>
      {node}
    </>
  );
}
