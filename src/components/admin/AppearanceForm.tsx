'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveSettings } from '@/app/admin/actions';
import { THEMES, THEME_KEYS } from '@/lib/themes';
import type { SiteSettings } from '@/lib/types';
import { Switch, useToast, useUnsaved } from './ui';

type Look = Pick<SiteSettings, 'theme' | 'owner' | 'initials' | 'code' | 'tagline' | 'specimen' | 'location' | 'timezone' | 'autoRotate' | 'rotateSpeed' | 'glow' | 'particles' | 'intro' | 'calmMotion'>;

export default function AppearanceForm({ initial, sections }: { initial: Look; sections: number }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show, node } = useToast();
  const dirty = JSON.stringify(s) !== saved;
  useUnsaved(dirty);
  const set = (p: Partial<Look>) => setS(x => ({ ...x, ...p }));
  const T = THEMES[s.theme];

  return (
    <>
      <div className="hd">
        <div><h1>Appearance</h1><p>Pick a colour theme for your cell and edit the words around it. Nothing changes on the live site until you press Publish.</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn out" href="/" target="_blank" rel="noreferrer">View site ↗</a>
          <button className="btn pri" disabled={!dirty || pending} onClick={() => start(async () => { const r = await saveSettings(s); if (r.ok) { setSaved(JSON.stringify(s)); show('Published ✓ — reload the site to see it'); router.refresh(); } else show(r.error, true); })}>{pending ? 'Publishing…' : 'Publish changes'}</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {THEME_KEYS.map(k => {
          const t = THEMES[k];
          return (
            <button key={k} className={`tcard ${s.theme === k ? 'on' : ''}`} onClick={() => set({ theme: k })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/admin-themes/${k}.jpg`} alt={`${t.name} preview`} />
              <h4>{t.name} <span className={`radio ${s.theme === k ? 'on' : ''}`} /></h4>
              <div className="pal">{[t.bg, t.acc2, t.acc, t.mito[1]].map(c => <i key={c} style={{ background: c }} />)}</div>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="panel pad">
          <div className="ph"><h3>Site identity</h3><small>the words in the top bar</small></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr', gap: 10 }}>
            <div className="fl"><label>Your name</label><input className="in" value={s.owner} onChange={e => set({ owner: e.target.value })} /></div>
            <div className="fl"><label>Initials</label><input className="in" value={s.initials} maxLength={3} onChange={e => set({ initials: e.target.value.toUpperCase() })} /></div>
            <div className="fl"><label>Tagline</label><input className="in" value={s.tagline} onChange={e => set({ tagline: e.target.value })} /></div>
            <div className="fl"><label>Specimen label</label><input className="in" value={s.specimen} onChange={e => set({ specimen: e.target.value })} /></div>
            <div className="fl"><label>Code</label><input className="in" value={s.code} onChange={e => set({ code: e.target.value })} /></div>
            <div className="fl"><label>Location</label><input className="in" value={s.location} onChange={e => set({ location: e.target.value })} /></div>
            <div className="fl" style={{ gridColumn: '1 / 4' }}><label>Clock time zone <span>· IANA name, e.g. Asia/Taipei</span></label><input className="in" value={s.timezone} onChange={e => set({ timezone: e.target.value })} /></div>
          </div>
        </div>
        <div className="panel pad">
          <div className="ph"><h3>Motion &amp; effects</h3></div>
          <div className="chk" style={{ borderTop: 0 }}><span style={{ flex: '0 0 140px' }}>Auto-rotate cell</span><input type="range" min={0} max={1} step={0.05} value={s.rotateSpeed} disabled={!s.autoRotate} onChange={e => set({ rotateSpeed: Number(e.target.value) })} aria-label="Rotation speed" /><Switch on={s.autoRotate} onChange={v => set({ autoRotate: v })} label="Auto-rotate" /></div>
          <div className="chk"><span style={{ flex: '0 0 140px' }}>Glow intensity</span><input type="range" min={0} max={1} step={0.05} value={s.glow} onChange={e => set({ glow: Number(e.target.value) })} aria-label="Glow" /><span style={{ width: 38 }} /></div>
          <div className="chk" style={{ justifyContent: 'space-between' }}>Floating particles<Switch on={s.particles} onChange={v => set({ particles: v })} label="Particles" /></div>
          <div className="chk" style={{ justifyContent: 'space-between' }}>Intro “focus” animation<Switch on={s.intro} onChange={v => set({ intro: v })} label="Intro" /></div>
          <div className="chk" style={{ justifyContent: 'space-between' }}>Calmer motion for visitors who ask for it<Switch on={s.calmMotion} onChange={v => set({ calmMotion: v })} label="Calm motion" /></div>
        </div>
      </div>
      <div className="panel pad" style={{ marginTop: 14 }}>
        <div className="ph"><h3>Live preview · top bar of your website</h3><small>updates as you type</small></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, height: 46, padding: '0 18px', borderRadius: 10, background: T.bg, border: `1px solid ${T.acc2}33`, font: '500 10.5px var(--fm)', letterSpacing: '.16em', textTransform: 'uppercase', color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${T.acc2}55`, display: 'grid', placeItems: 'center', color: T.text, font: '600 9px var(--fd)', letterSpacing: 0 }}>{s.initials}</span><span><i style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: T.acc, marginRight: 8 }} />Specimen <b style={{ color: T.text, fontWeight: 500 }}>{s.code}</b> / <b style={{ color: T.text, fontWeight: 500 }}>{s.owner}</b> · {s.tagline}</span></span>
          <span>{s.specimen} · <b style={{ color: T.text, fontWeight: 500 }}>{sections}</b> sections</span>
          <span><i style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: T.acc2, marginRight: 8 }} />Live · {s.location}</span>
        </div>
      </div>
      {node}
    </>
  );
}
