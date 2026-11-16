'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { THEMES, organelleColor } from '@/lib/themes';
import type { OrganelleKey } from '@/lib/types';
import type { CellScene } from './cellScene';
import ContactForm from './ContactForm';
import { MAP_POS, type PublicData, type PublicImage } from './publicTypes';

const num = (i: number) => String(i).padStart(2, '0');

export default function CellExperience({ data }: { data: PublicData }) {
  const T = THEMES[data.settings.theme] ?? THEMES.green;
  const S = data.sections;
  const [sel, setSel] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  const [hint, setHint] = useState(true);
  const [focusing, setFocusing] = useState(data.settings.intro);
  const [noGL, setNoGL] = useState(false);
  const [clock, setClock] = useState('');
  const [calm, setCalm] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rad, setRad] = useState(300);
  const [box, setBox] = useState({ w: 800, h: 700 });

  const glRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<CellScene | null>(null);
  const pinRefs = useRef(new Map<OrganelleKey, HTMLDivElement>());
  const magRef = useRef<HTMLDivElement>(null);
  const xyzRef = useRef<HTMLDivElement>(null);
  const selRef = useRef(0); selRef.current = sel;
  const lbRef = useRef<number | null>(null); lbRef.current = lb;

  const s = S[sel];
  const col = organelleColor(T, s.key);
  const images = s.images;

  /* ---------- scene lifecycle ---------- */
  useEffect(() => {
    const isCalm = data.settings.calmMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setCalm(isCalm);
    if (!data.settings.intro || isCalm) setFocusing(false); else setTimeout(() => setFocusing(false), 900);
    let disposed = false, scene: CellScene | null = null;
    (async () => {
      const mod = await import('./cellScene');
      if (disposed || !glRef.current) return;
      if (!mod.CellScene.supported()) { setNoGL(true); return; }
      try {
        scene = new mod.CellScene(glRef.current, T, { autoRotate: data.settings.autoRotate, rotateSpeed: data.settings.rotateSpeed, glow: data.settings.glow, particles: data.settings.particles, calm: isCalm, mobile: window.innerWidth < 760 });
      } catch { setNoGL(true); return; }
      sceneRef.current = scene;
      scene.setSections(S.filter(x => x.key !== 'home').map(x => x.key), S.filter(x => x.draft).map(x => x.key));
      const cur = S[selRef.current]; scene.select(cur.key, cur.mag);
      scene.onFrame = sc => {
        const selKey = S[selRef.current].key;
        pinRefs.current.forEach((el, key) => {
          const p = sc.project(key);
          el.style.transform = `translate(${p.x}px,${p.y}px)`;
          el.style.opacity = p.visible ? '1' : '0';
          el.style.pointerEvents = p.visible ? '' : 'none';
          if (key === selKey) {
            const rr = Math.max(30, Math.min(sc.radius * 0.55, p.r * 1.15));
            const ring = el.querySelector('i') as HTMLElement | null;
            if (ring) Object.assign(ring.style, { left: `${-rr}px`, top: `${-rr}px`, width: `${rr * 2}px`, height: `${rr * 2}px` });
            const ax = rr * 0.71, ay = -rr * 0.71, lx = ax + 40, ly = ay - 40;
            el.querySelector('polyline')?.setAttribute('points', `${ax},${ay} ${lx},${ly} ${lx + 30},${ly}`);
            const sp = el.querySelector('span') as HTMLElement | null;
            if (sp) { sp.style.left = `${lx + 30}px`; sp.style.top = `${ly - 30}px`; }
          }
        });
        if (magRef.current) magRef.current.firstChild!.textContent = `×${Math.round(sc.magnification).toLocaleString('en')}`;
        const t = sc.target;
        if (xyzRef.current) xyzRef.current.textContent = `X ${(t.x * 2).toFixed(2)} · Y ${(t.y * 2).toFixed(2)} · Z ${(t.z * 2).toFixed(2)} µm`;
      };
    })();
    return () => { disposed = true; scene?.dispose(); sceneRef.current = null; };
    // the scene is built once per page load; theme/settings changes come with a reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- reticle sizing ---------- */
  useEffect(() => {
    const el = centerRef.current; if (!el) return;
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setBox({ w: r.width, h: r.height }); setRad(Math.min(r.width, r.height) * 0.46); });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  /* ---------- navigation ---------- */
  const go = useCallback((i: number) => {
    const n = (i + S.length) % S.length;
    if (n === selRef.current) return;
    setSel(n); setLb(null);
    sceneRef.current?.select(S[n].key, S[n].mag);
    setFocusing(true); setTimeout(() => setFocusing(false), 420);
  }, [S]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input,textarea')) return;
      if (lbRef.current !== null) {
        const n = S[selRef.current].images.length;
        if (e.key === 'Escape') setLb(null);
        if (e.key === 'ArrowRight') setLb(v => ((v ?? 0) + 1) % n);
        if (e.key === 'ArrowLeft') setLb(v => ((v ?? 0) - 1 + n) % n);
        return;
      }
      if (/^[0-9]$/.test(e.key) && +e.key < S.length) go(+e.key);
      if (e.key === 'ArrowRight') go(selRef.current + 1);
      if (e.key === 'ArrowLeft') go(selRef.current - 1);
      if (e.key === 'Escape') go(0);
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [S, go]);

  /* ---------- clock, hint, visit counter ---------- */
  useEffect(() => {
    const tick = () => { try { setClock(new Date().toLocaleTimeString('en-GB', { timeZone: data.settings.timezone || 'UTC', hour: '2-digit', minute: '2-digit' })); } catch { setClock(''); } };
    tick(); const id = setInterval(tick, 15000);
    const h = setTimeout(() => setHint(false), 9000);
    if (!data.preview) { try { if (!sessionStorage.getItem('dz_v')) { sessionStorage.setItem('dz_v', '1'); fetch('/api/view', { method: 'POST' }).catch(() => {}); } } catch { /* storage blocked */ } }
    return () => { clearInterval(id); clearTimeout(h); };
  }, [data.settings.timezone, data.preview]);

  /* ---------- rotate / zoom gestures ---------- */
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef({ moved: 0, lastX: 0, lastY: 0, pinch: 0 });
  useEffect(() => {
    const el = centerRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { if ((e.target as HTMLElement).closest('.lb')) return; e.preventDefault(); sceneRef.current?.zoomBy(1 + e.deltaY * 0.0012); setHint(false); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.lb,.pin.o')) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gest.current.moved = 0; gest.current.lastX = e.clientX; gest.current.lastY = e.clientY;
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; gest.current.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sceneRef.current?.setDragging(true); setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current;
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (g.pinch) sceneRef.current?.zoomBy(g.pinch / d); g.pinch = d; g.moved += 10; return; }
    const dx = e.clientX - g.lastX, dy = e.clientY - g.lastY; g.lastX = e.clientX; g.lastY = e.clientY; g.moved += Math.abs(dx) + Math.abs(dy);
    sceneRef.current?.dragBy(dx, dy); if (g.moved > 6) setHint(false);
  };
  const onUp = (e: React.PointerEvent) => {
    const wasClick = gest.current.moved < 6;
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size) return;
    sceneRef.current?.setDragging(false); setDragging(false);
    if (wasClick && !(e.target as HTMLElement).closest('.lb,.pin')) {
      const r = centerRef.current!.getBoundingClientRect(), key = sceneRef.current?.pick(e.clientX - r.left, e.clientY - r.top);
      if (key) { const i = S.findIndex(x => x.key === key); if (i >= 0) go(i); }
    }
  };

  /* ---------- reticle svg ---------- */
  const cx = box.w / 2, cy = box.h / 2;
  const ticks = [];
  for (let i = 0; i < 180; i++) {
    const a = i / 180 * Math.PI * 2, l = i % 15 === 0 ? 14 : i % 5 === 0 ? 8 : 4, c = Math.cos(a), sn = Math.sin(a);
    ticks.push(<line key={i} x1={cx + c * (rad + 6)} y1={cy + sn * (rad + 6)} x2={cx + c * (rad + 6 + l)} y2={cy + sn * (rad + 6 + l)} stroke={T.acc2} strokeOpacity={i % 15 === 0 ? 0.55 : 0.22} />);
  }

  /* ---------- minimap ---------- */
  const k = 12.5, mcx = 110, mcy = 78, [sx, sy] = MAP_POS[s.key];

  return (
    <div className={`dz ${calm ? 'calm' : ''}`} style={{ ['--bg' as string]: T.bg, ['--panel' as string]: T.panel, ['--text' as string]: T.text, ['--muted' as string]: T.muted, ['--dim' as string]: T.dim, ['--acc' as string]: T.acc, ['--acc2' as string]: T.acc2 }}>
      <div className="app">
        <header className="bar">
          <div className="brand"><i>{data.settings.initials}</i><span><span className="dot" />Specimen <b>{data.settings.code}</b> / <b>{data.settings.owner}</b><span className="hm"> · {data.settings.tagline}</span></span></div>
          <div className="mid">{data.settings.specimen} · <b>{S.length - 1}</b> sections · <b>1</b> researcher</div>
          <div className="rt">
            {data.cvUrl && <a className="cv" href={data.cvUrl} target="_blank" rel="noreferrer">CV ↓</a>}
            <span className="loc"><span className="dot g" />Live · {data.settings.location} <b>{clock}</b></span>
          </div>
        </header>

        <aside className="left">
          <div className="h">Telemetry · {num(sel)}{sel ? ` · ${s.short}` : ''}</div>
          {s.showTelemetry && (
            <div>
              {([['Magnification', `×${s.mag.toLocaleString('en')}`], ['Objective', s.objective], ['Channel', null], ['Size', s.size], ['Function', s.fn], ['Section', s.label]] as [string, string | null][]).filter(([, v]) => v !== '').map(([label, v]) => (
                <div className="kv" key={label}>{label}<b>{v ?? s.channels.map(c => <span key={c}>{c}<span className="ch" style={{ background: col, boxShadow: `0 0 6px ${col}` }} /> </span>)}</b></div>
              ))}
            </div>
          )}
          <div className="h" style={{ marginTop: 18 }}>Cell map</div>
          <div className="mini">
            <svg viewBox="0 0 220 160">
              <circle cx={mcx} cy={mcy} r={5 * k} fill="none" stroke={T.acc2} strokeOpacity={0.5} strokeDasharray="3 3" />
              <ellipse cx={mcx + MAP_POS.nucleus[0] * k} cy={mcy - MAP_POS.nucleus[1] * k} rx={1.75 * k} ry={1.6 * k} fill={T.nuc[1]} fillOpacity={0.18} stroke={T.nuc[1]} strokeOpacity={0.6} />
              {S.map((x, i) => i === 0 ? null : <circle key={x.key} cx={mcx + MAP_POS[x.key][0] * k} cy={mcy - MAP_POS[x.key][1] * k} r={i === sel ? 4 : 2.5} fill={organelleColor(T, x.key)} opacity={i === sel ? 1 : 0.6} />)}
              {sel === 0
                ? <rect x={mcx - 5 * k - 6} y={mcy - 5 * k - 6} width={10 * k + 12} height={10 * k + 12} fill="none" stroke={T.acc} />
                : <g><rect x={mcx + sx * k - 15} y={mcy - sy * k - 11} width={30} height={22} fill="none" stroke={T.acc} /><line x1={mcx + sx * k} y1={0} x2={mcx + sx * k} y2={160} stroke={T.acc} strokeOpacity={0.25} /><line x1={0} y1={mcy - sy * k} x2={220} y2={mcy - sy * k} stroke={T.acc} strokeOpacity={0.25} /></g>}
            </svg>
            <small>X {(sx * 2).toFixed(1)} · Y {(sy * 2).toFixed(1)} µm</small>
          </div>
          <div className="h" style={{ marginTop: 18 }}>Activity · 24 h</div>
          <div className="bars">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ height: `${((0.25 + 0.6 * Math.abs(Math.sin(i * 0.55 + 3 + sel * 7)) * (0.6 + 0.4 * Math.sin(i * 0.21 + sel))) * 100).toFixed(0)}%`, background: col }} />)}</div>
          <div className="stat"><span className="dot g" />Cell alive · 37.0 °C</div>
        </aside>

        <main className={`center ${dragging ? 'drag' : ''}`} ref={centerRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={() => sceneRef.current?.resetView()}>
          <div className={`gl ${focusing ? 'focusing' : ''}`} ref={glRef} />
          {noGL && <div className="fallback" aria-hidden />}
          <div className="mask" style={{ ['--r' as string]: `${rad}px` }} />
          <svg className="reticle" aria-hidden>
            {ticks}
            <circle cx={cx} cy={cy} r={rad} fill="none" stroke={T.acc} strokeOpacity={0.45} />
            <circle cx={cx} cy={cy} r={rad * 0.5} fill="none" stroke={T.acc2} strokeOpacity={0.07} strokeDasharray="2 6" />
            {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => <line key={`${dx}${dy}`} x1={cx + dx * rad} y1={cy + dy * rad} x2={cx + dx * 18} y2={cy + dy * 18} stroke={T.acc2} strokeOpacity={0.12} />)}
            <path d={`M${cx - 8} ${cy}h16M${cx} ${cy - 8}v16`} stroke={T.acc} strokeOpacity={0.8} />
            {['0°', '90°', '180°', '270°'].map((d, i) => { const a = i * Math.PI / 2 - Math.PI / 2; return <text key={d} x={cx + Math.cos(a) * (rad + 32)} y={cy + Math.sin(a) * (rad + 32) + 3} fill={T.muted} fontFamily="var(--font-mono)" fontSize={9} textAnchor="middle" letterSpacing={1.5}>{d}</text>; })}
          </svg>
          <div className="ctext cam" style={{ left: 26, top: 22 }}>CAM 03 · <b>{s.organelle}{sel ? ` · ${s.label}` : ''}</b></div>
          <div className="ctext obj" style={{ right: 26, top: 22 }}>{[s.objective, s.channels.join(' / ')].filter(Boolean).join(' · ')}</div>
          <div className="mag" ref={magRef}>{`×${s.mag.toLocaleString('en')}`}<small>Magnification</small></div>
          {!noGL && <div className={`hint ${hint ? '' : 'off'}`}><b>⟲ Drag</b> to rotate · <b>Scroll</b> to zoom<span className="dc"> · <b>Double-click</b> to reset</span></div>}
          <div className="ctext nt" style={{ left: 26, bottom: 22 }} ref={xyzRef}>X 0.00 · Y 0.00 · Z 0.00 µm</div>
          <div className="ctext" style={{ right: 26, bottom: 22 }}><span className="dot r" />REC</div>
          <div className="scale"><i />{sel ? (s.mag >= 3000 ? '1 µm' : '2 µm') : '10 µm'}</div>
          {data.preview && <div className="preview">PREVIEW · drafts visible</div>}
          {!noGL && S.map((x, i) => i === 0 ? null : (
            <div key={x.key} ref={el => { if (el) pinRefs.current.set(x.key, el); else pinRefs.current.delete(x.key); }}
              className={`pin ${i === sel ? 'sel' : 'o'}`} style={{ opacity: 0 }} onClick={i === sel ? undefined : () => go(i)}>
              {i === sel
                ? <><i /><svg width="1" height="1"><polyline fill="none" stroke={T.acc} strokeWidth={1} /></svg><span>{num(i)} · {x.short}<small>{x.label}{x.size ? ` · ${x.size}` : ''}</small></span></>
                : <b>{num(i)}</b>}
            </div>
          ))}
          {lb !== null && images[lb] && (
            <Lightbox images={images} index={lb} label={s.label} onClose={() => setLb(null)} onGo={setLb} />
          )}
        </main>

        <aside className="right">
          <div className="h">Lab notebook · {s.label}</div>
          <div className="nbwrap swap" key={s.key}>
            <div className="nb-h">{s.title}</div>
            {s.layout === 'grid' && images.length > 0 ? (
              <div className="gal">{images.map((im, i) => <button key={i} onClick={() => setLb(i)} style={{ backgroundImage: `url(${im.thumb})` }} aria-label={im.caption || im.alt}>{im.caption && <small>{im.caption}</small>}</button>)}</div>
            ) : null}
            {s.entries.length > 0 && (
              <div className="log">
                {s.entries.filter(e => e.date || e.title || e.detail).map(e => (
                  <div className="blk" key={e.id}>{e.date && <div className="d">&gt; {e.date}</div>}{e.title && <p>{e.title}</p>}{e.detail && <p>{e.detail}</p>}</div>
                ))}
                {!s.showForm && <div className="d" style={{ color: 'var(--text)' }}>$ <span className="cur" /></div>}
              </div>
            )}
            {s.chart.enabled && s.chart.rows.length > 0 && (() => {
              const max = Math.max(1, ...s.chart.rows.map(r => r.value));
              return <div className="res"><div className="h" style={{ margin: '0 0 9px' }}>{s.chart.title}</div>{s.chart.rows.map((r, i) => <div className="rb" key={i}><span>{r.label}</span><i><b style={{ width: `${(r.value / max) * 100}%` }} /></i><em>{r.value}</em></div>)}</div>;
            })()}
            {s.layout !== 'grid' && images.length > 0 && (
              <div className="media"><div className="h" style={{ margin: '0 0 9px' }}>Media · {images.length}</div>
                <div className="thumbs">{images.slice(0, 4).map((im, i) => <button key={i} onClick={() => setLb(i)} style={{ backgroundImage: `url(${im.thumb})` }} aria-label={im.caption || im.alt}>{i === 3 && images.length > 4 && <span>+{images.length - 3}</span>}</button>)}</div>
              </div>
            )}
            {s.showForm && <ContactForm />}
            {s.showForm && data.links.length > 0 && <div className="links">{data.links.map(l => <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}{data.cvUrl && <a href={data.cvUrl} target="_blank" rel="noreferrer">CV ↓</a>}</div>}
            {s.tags.length > 0 ? <div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div> : <div className="spacer" />}
            {S.length > 1 && <div className="pnav"><button onClick={() => go(sel - 1)}>← {num((sel + S.length - 1) % S.length)} {S[(sel + S.length - 1) % S.length].label}</button><button onClick={() => go(sel + 1)}>{num((sel + 1) % S.length)} {S[(sel + 1) % S.length].label} →</button></div>}
          </div>
        </aside>

        <nav className="tray" aria-label="Sections">
          <button className="nav" onClick={() => go(sel - 1)}>◂ Prev</button>
          {S.map((x, i) => (
            <button key={x.key} className={`${i === sel ? 'on' : ''} ${x.draft ? 'dr' : ''}`} style={{ ['--c' as string]: organelleColor(T, x.key) }} onClick={() => go(i)}>
              <small><span>{num(i)}</span><span>{i ? x.short : 'Home'}</span></small>
              <b><span className="gld" />{x.label}</b>
              <em>{x.draft ? 'Draft' : x.organelle}</em>
            </button>
          ))}
          <button className="nav" onClick={() => go(sel + 1)}>Next ▸</button>
        </nav>
      </div>
      <div className="scan" />
    </div>
  );
}

function Lightbox({ images, index, label, onClose, onGo }: { images: PublicImage[]; index: number; label: string; onClose: () => void; onGo: (i: number) => void }) {
  const im = images[index], n = images.length;
  return (
    <div className="lb" role="dialog" aria-label="Image viewer" onPointerDown={e => e.stopPropagation()}>
      <div className="tag">{label} · media</div>
      <button className="x" onClick={onClose} aria-label="Close">✕</button>
      {n > 1 && <><button className="ar l" onClick={() => onGo((index - 1 + n) % n)} aria-label="Previous">‹</button><button className="ar r" onClick={() => onGo((index + 1) % n)} aria-label="Next">›</button></>}
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={im.url} alt={im.alt || im.caption} />
      </figure>
      <figcaption><b>{im.caption}</b><span>{num(index + 1)} / {num(n)}</span></figcaption>
      {n > 1 && <div className="strip">{images.map((x, i) => <button key={i} className={i === index ? 'on' : ''} onClick={() => onGo(i)} style={{ backgroundImage: `url(${x.thumb})` }} aria-label={`Image ${i + 1}`} />)}</div>}
    </div>
  );
}
