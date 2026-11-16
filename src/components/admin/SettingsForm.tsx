'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { saveSettings } from '@/app/admin/actions';
import type { Media, SiteSettings } from '@/lib/types';
import { fmtSize } from '@/lib/format';
import { DropZone, MediaPicker, uploadFiles, useToast, useUnsaved } from './ui';
import PasswordForm from './PasswordForm';

type S = Pick<SiteSettings, 'siteTitle' | 'description' | 'seoImageId' | 'notifyEmail' | 'links' | 'cvMediaId'>;
type Props = {
  initial: S; media: Media[]; owner: string; host: string; tz: string;
  password: { custom: boolean; changedAt: string | null };
  disk: { free: number; total: number } | null;
  driver: string; emailReady: boolean;
};

const TITLE_FIT = 60, DESC_FIT = 160;   // about what Google shows before cutting text off

export default function SettingsForm({ initial, media: initialMedia, owner, host, tz, password, disk, driver, emailReady }: Props) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [media, setMedia] = useState(initialMedia);
  const [busy, setBusy] = useState<'' | 'cv' | 'seo'>('');
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show, node } = useToast();
  const dirty = JSON.stringify(s) !== saved;
  useUnsaved(dirty);
  const set = (p: Partial<S>) => setS(x => ({ ...x, ...p }));
  const docs = useMemo(() => media.filter(m => m.kind === 'document'), [media]);
  const images = useMemo(() => media.filter(m => m.kind === 'image'), [media]);
  const seoImg = images.find(m => m.id === s.seoImageId);
  const title = s.siteTitle || owner;
  const ogUrl = seoImg ? `/og/${seoImg.id}.jpg` : null;

  const save = () => start(async () => { const r = await saveSettings(s); if (r.ok) { setSaved(JSON.stringify(s)); show('Saved ✓'); router.refresh(); } else show(r.error, true); });

  async function upload(files: File[], kind: 'cv' | 'seo') {
    setBusy(kind);
    const { added, errors } = await uploadFiles(files.slice(0, 1));
    setBusy('');
    const f = added.find(a => a.kind === (kind === 'cv' ? 'document' : 'image'));
    if (f) { setMedia(m => [f, ...m]); set(kind === 'cv' ? { cvMediaId: f.id } : { seoImageId: f.id }); show(`${kind === 'cv' ? 'CV' : 'Image'} uploaded — press Save settings`); }
    if (errors.length) show(errors.join(' · '), true);
  }

  return (
    <>
      <div className="hd">
        <div><h1>Site settings</h1><p>How your site appears on Google and in shared links, plus contact alerts, links, CV and your password.</p></div>
        <button className="btn pri" disabled={!dirty || pending} onClick={save}>{pending ? 'Saving…' : 'Save settings'}</button>
      </div>

      <div className="panel pad" style={{ marginBottom: 14 }}>
        <div className="ph"><h3>Google &amp; link previews (SEO)</h3><small>browser tab · search results · Facebook, Messenger, X, Telegram cards</small></div>
        <div className="seo">
          <div className="grid" style={{ gap: 12, alignContent: 'start' }}>
            <div className="fl">
              <label htmlFor="seo-title">Title <span className={s.siteTitle.length > TITLE_FIT ? 'warn' : ''}>· {s.siteTitle.length}/{TITLE_FIT}{s.siteTitle.length > TITLE_FIT ? ' — Google may cut it off' : ''}</span></label>
              <input id="seo-title" className="in" value={s.siteTitle} maxLength={120} placeholder={owner} onChange={e => set({ siteTitle: e.target.value })} />
            </div>
            <div className="fl">
              <label htmlFor="seo-desc">Description <span className={s.description.length > DESC_FIT ? 'warn' : ''}>· {s.description.length}/{DESC_FIT}{s.description.length > DESC_FIT ? ' — Google may cut it off' : ''}</span></label>
              <textarea id="seo-desc" className="in" value={s.description} maxLength={300} onChange={e => set({ description: e.target.value })} />
            </div>
            <div className="fl">
              <label>Share image <span>· the picture on link previews, cropped to 1200 × 630 automatically</span></label>
              {seoImg && ogUrl ? (
                <div className="ogpick">
                  <img src={ogUrl} alt="Share image preview" />
                  <div style={{ minWidth: 0 }}>
                    <b>{seoImg.name}</b>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="btn out sm" onClick={() => setPicker(true)}>Change</button>
                      <button className="btn out sm danger" onClick={() => set({ seoImageId: null })}>Remove</button>
                    </div>
                  </div>
                </div>
              ) : <button className="btn out sm" style={{ justifySelf: 'start' }} onClick={() => setPicker(true)}>Choose from media library</button>}
              <DropZone compact multiple={false} busy={busy === 'seo'} accept="image/*,.heic,.heif" onFiles={f => upload(f, 'seo')} />
            </div>
          </div>
          <div className="seoprev">
            <span className="flabel">Google result — preview</span>
            <div className="gres">
              <div className="gs"><img src="/icon.svg" alt="" /><span><b>{owner}</b><small>https://{host}</small></span></div>
              <div className="gt">{title}</div>
              <div className="gd">{s.description || 'Add a description — Google shows it under the title.'}</div>
            </div>
            <span className="flabel" style={{ marginTop: 6 }}>Shared link — preview</span>
            <div className="sharecard">
              <div className="ci" style={ogUrl ? { backgroundImage: `url(${ogUrl})` } : undefined}>{!ogUrl && 'No share image — the card shows text only'}</div>
              <div className="cb"><small>{host}</small><b>{title}</b><span>{s.description}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        <div className="grid" style={{ gap: 14 }}>
          <div className="panel pad">
            <div className="ph"><h3>Contact form alerts</h3></div>
            <div className="fl"><label>Send new messages to <span>· private, never shown on the site</span></label><input className="in" type="email" value={s.notifyEmail} placeholder="you@example.com" onChange={e => set({ notifyEmail: e.target.value })} /></div>
            <p className="hint" style={{ marginTop: 8 }}>{emailReady ? 'Email sending is set up ✓' : 'Messages are always saved in Admin → Messages. To also get an email, the developer adds RESEND_API_KEY on the server.'}</p>
          </div>
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
            <div style={{ marginTop: 10 }}><DropZone compact multiple={false} busy={busy === 'cv'} accept="application/pdf" onFiles={f => upload(f, 'cv')} /></div>
          </div>
        </div>
        <div className="grid" style={{ gap: 14 }}>
          <PasswordForm custom={password.custom} changedAt={password.changedAt} tz={tz} />
          <div className="panel pad">
            <div className="ph"><h3>Storage</h3><small>{driver === 'supabase' ? 'Supabase (cloud)' : 'server disk'}</small></div>
            {disk ? (
              <>
                <div className="bar"><i style={{ width: `${Math.max(1, Math.round(100 * (1 - disk.free / disk.total)))}%` }} /></div>
                <p className="hint" style={{ marginTop: 8 }}>{fmtSize(disk.total - disk.free)} used · <b>{fmtSize(disk.free)} free</b> of {fmtSize(disk.total)}</p>
              </>
            ) : <p className="hint">Photos and files are kept in Supabase Storage.</p>}
          </div>
        </div>
      </div>

      {picker && <MediaPicker title="Choose a share image" media={images} isOn={m => m.id === s.seoImageId} labels={['✓ Current', 'Use']} onPick={m => { set({ seoImageId: m.id }); setPicker(false); }} onClose={() => setPicker(false)} />}
      {node}
    </>
  );
}
