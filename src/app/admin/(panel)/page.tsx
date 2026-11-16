import Link from 'next/link';
import { getContent, getMedia, getMessages, getStats, sortedSections } from '@/lib/content';
import { THEMES, organelleColor } from '@/lib/themes';
import { fmtDay, fmtSize, hourIn } from '@/lib/format';
import { passwordInfo } from '@/lib/password';

export default async function Dashboard() {
  const [c, media, messages, stats, pw] = await Promise.all([getContent(), getMedia(), getMessages(), getStats(), passwordInfo()]);
  const s = c.settings, T = THEMES[s.theme];
  const inUse = sortedSections(c).filter(x => x.inUse && x.key !== 'home');
  const published = inUse.filter(x => x.status === 'published'), drafts = inUse.filter(x => x.status !== 'published');
  const days = Object.entries(stats.days), since = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const visitors = days.filter(([d]) => d >= since).reduce((a, [, n]) => a + n, 0);
  const bytes = media.reduce((a, m) => a + m.size, 0);
  const unread = messages.filter(m => !m.read);
  const usesSeed = c.sections.some(x => x.images.some(i => i.mediaId.startsWith('seed-')));
  const nucleus = c.sections.find(x => x.key === 'nucleus');
  const hour = hourIn(s.timezone);

  const checklist = [
    { done: !!(s.owner && s.tagline), text: 'Set your name & tagline', href: '/admin/appearance', cta: 'Edit' },
    { done: !!nucleus?.images.some(i => !i.mediaId.startsWith('seed-')), text: `Upload a profile photo for “${nucleus?.label || 'About me'}”`, href: '/admin/sections/nucleus', cta: 'Upload' },
    { done: !usesSeed, text: 'Replace the sample illustrations with your own photos', href: '/admin/media', cta: 'Media' },
    { done: !!s.cvMediaId, text: 'Upload your CV (PDF) for the download button', href: '/admin/settings', cta: 'Add CV' },
    { done: s.links.some(l => l.url), text: 'Add your links (LinkedIn, Instagram…)', href: '/admin/settings', cta: 'Add links' },
    { done: !!s.notifyEmail, text: 'Set an email for new-message alerts', href: '/admin/settings', cta: 'Set email' },
    { done: !!s.seoImageId, text: 'Pick a share image for link previews', href: '/admin/settings', cta: 'Pick image' },
    { done: pw.custom, text: 'Choose your own admin password', href: '/admin/settings', cta: 'Change' },
  ];
  const doneN = checklist.filter(x => x.done).length;

  return (
    <>
      <div className="hd">
        <div><h1>{hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, {s.owner} 👋</h1><p>Your cell has {published.length} live section{published.length === 1 ? '' : 's'}{drafts.length ? ` and ${drafts.length} draft${drafts.length === 1 ? '' : 's'}` : ''}.</p></div>
        <div style={{ display: 'flex', gap: 10 }}><a className="btn out" href="/" target="_blank" rel="noreferrer">Open site ↗</a><Link className="btn pri" href="/admin/sections">Manage sections</Link></div>
      </div>
      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="panel st"><div className="l">Visitors · 30 days</div><div className="v">{visitors.toLocaleString('en')}</div><div className="s">unique browser sessions</div></div>
        <div className="panel st"><div className="l">Published sections</div><div className="v">{published.length} <span style={{ fontSize: 16, color: 'var(--dim)' }}>/ {inUse.length}</span></div><div className="s">+ home page, always on</div></div>
        <div className="panel st"><div className="l">Messages</div><div className="v" style={{ color: unread.length ? 'var(--coral)' : undefined }}>{unread.length}</div><div className="s">unread · {messages.length} total</div></div>
        <div className="panel st"><div className="l">Media</div><div className="v">{media.length}</div><div className="s">files · {fmtSize(bytes)}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="panel pad">
          <div className="ph"><h3>Getting started</h3><small>{doneN} of {checklist.length} done</small></div>
          <div className="bar" style={{ margin: '0 0 8px' }}><i style={{ width: `${(doneN / checklist.length) * 100}%` }} /></div>
          {checklist.map(x => (
            <div key={x.text} className={`chk ${x.done ? 'done' : ''}`}><span className="c">{x.done ? '✓' : ''}</span><span className="t">{x.text}</span>{!x.done && <Link className="btn out sm" href={x.href}>{x.cta}</Link>}</div>
          ))}
        </div>
        <div className="panel pad">
          <div className="ph"><h3>Your cell right now</h3><Link href="/admin/appearance" style={{ color: 'var(--em)', fontWeight: 700, fontSize: 12.5 }}>Change theme →</Link></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/admin-themes/${s.theme}.jpg`} alt="" style={{ width: '100%', borderRadius: 10, display: 'block', aspectRatio: '16/10', objectFit: 'cover', background: T.bg }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontWeight: 600, fontSize: 13 }}>
            <span>{T.name} · {published.length} live sections</span>
            <span style={{ display: 'flex', gap: 5 }}>{[T.bg, T.acc2, T.acc, T.mito[1]].map(x => <i key={x} style={{ width: 16, height: 16, borderRadius: 5, background: x, border: '1px solid rgba(0,0,0,.08)' }} />)}</span>
          </div>
        </div>
      </div>
      <div className="g2">
        <div className="panel">
          <div className="ph pad" style={{ marginBottom: 0 }}><h3>Sections</h3><Link href="/admin/sections" style={{ color: 'var(--em)', fontWeight: 700, fontSize: 12.5 }}>Manage all →</Link></div>
          {inUse.map(x => (
            <Link key={x.key} href={`/admin/sections/${x.key}`} className="row" style={{ gridTemplateColumns: '12px 1fr auto' }}>
              <span className="dot" style={{ background: organelleColor(T, x.key) }} />
              <span className="lbl"><b>{x.label}</b><small>{x.organelle}</small></span>
              <span className={`pill ${x.status === 'published' ? 'pub' : 'dra'}`}><i />{x.status === 'published' ? 'Live' : 'Draft'}</span>
            </Link>
          ))}
        </div>
        <div className="panel">
          <div className="ph pad" style={{ marginBottom: 0 }}><h3>Latest messages</h3><Link href="/admin/messages" style={{ color: 'var(--em)', fontWeight: 700, fontSize: 12.5 }}>Inbox →</Link></div>
          {messages.length === 0 && <p className="muted" style={{ padding: '6px 18px 18px' }}>No messages yet — they arrive here from the contact form.</p>}
          {messages.slice(0, 5).map(m => (
            <Link key={m.id} href={`/admin/messages?id=${m.id}`} className={`msg ${m.read ? '' : 'unread'}`}>
              <span className="av" style={{ width: 36, height: 36, fontSize: 12 }}>{m.name.slice(0, 2).toUpperCase()}</span>
              <span style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 13.5 }}>{m.name}</b><span className="muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.body}</span></span>
              <span className="muted">{fmtDay(m.createdAt, s.timezone)}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
