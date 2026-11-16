'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/admin/actions';

const I = {
  dash: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></svg>,
  sec: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="10" cy="11" r="3" /><circle cx="16" cy="15" r="1.5" /></svg>,
  media: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>,
  msg: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v11H8l-4 4z" /></svg>,
  look: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5 1-2 2.5-2H18a3 3 0 0 0 3-3c0-6-4-11-9-11z" /><circle cx="7.5" cy="11" r="1.2" /><circle cx="11" cy="7" r="1.2" /><circle cx="16" cy="8.5" r="1.2" /></svg>,
  set: <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>,
};

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: I.dash, crumb: 'Dashboard' },
  { href: '/admin/sections', label: 'Sections', icon: I.sec, crumb: 'Sections', count: 'sections' },
  { href: '/admin/media', label: 'Media library', icon: I.media, crumb: 'Media library', count: 'media' },
  { href: '/admin/messages', label: 'Messages', icon: I.msg, crumb: 'Messages', badge: 'unread' },
  { href: '/admin/appearance', label: 'Appearance', icon: I.look, crumb: 'Appearance', group: 'LOOK & FEEL' },
  { href: '/admin/settings', label: 'Site settings', icon: I.set, crumb: 'Site settings' },
] as const;

export default function AdminShell({ owner, initials, counts, children }: { owner: string; initials: string; counts: { sections: number; media: number; unread: number }; children: React.ReactNode }) {
  const path = usePathname();
  const active = [...NAV].reverse().find(n => n.href === '/admin' ? path === '/admin' : path.startsWith(n.href));
  const sub = path.startsWith('/admin/sections/') ? decodeURIComponent(path.split('/').pop() || '') : '';
  return (
    <div className="adm">
      <aside className="sb">
        <div className="brand"><span className="mk">{initials}</span><div><b>{owner}</b><small>ADMIN</small></div></div>
        <div className="grp">SITE</div>
        {NAV.map(n => (
          <div key={n.href}>
            {'group' in n && <div className="grp">{n.group}</div>}
            <Link className={`it ${active?.href === n.href ? 'on' : ''}`} href={n.href}>
              {n.icon}{n.label}
              {'count' in n && <span className="dt">{counts[n.count]}</span>}
              {'badge' in n && counts.unread > 0 && <span className="bd">{counts.unread}</span>}
            </Link>
          </div>
        ))}
        <a className="view" href="/" target="_blank" rel="noreferrer">View live site <span>↗</span></a>
        <div className="user"><span className="av">{initials.slice(0, 1)}</span><div><b>{owner}</b><form action={logout}><button>Sign out</button></form></div></div>
      </aside>
      <div className="main">
        <div className="top">
          <div className="crumb">{sub ? <>Sections / <b>{sub}</b></> : <b>{active?.crumb}</b>}</div>
          <div className="sp" />
          <span className="pill pub"><i />Site is live</span>
          <a className="btn out sm" href="/?preview=1" target="_blank" rel="noreferrer">Preview with drafts ↗</a>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
