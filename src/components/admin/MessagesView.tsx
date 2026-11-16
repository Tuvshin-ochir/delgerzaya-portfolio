'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { deleteMessage, markMessage } from '@/app/admin/actions';
import type { Message } from '@/lib/types';
import { useToast } from './ui';
import { fmtDateTime, fmtDay } from '@/lib/format';

export default function MessagesView({ messages: initial, openId, tz }: { messages: Message[]; openId?: string; tz: string }) {
  const [list, setList] = useState(initial);
  useEffect(() => setList(initial), [initial]);
  const [sel, setSel] = useState<string | null>(openId ?? initial[0]?.id ?? null);
  const [, start] = useTransition();
  const router = useRouter();
  const { show, node } = useToast();
  const cur = list.find(m => m.id === sel) ?? null;

  useEffect(() => {
    if (cur && !cur.read) {
      setList(l => l.map(m => m.id === cur.id ? { ...m, read: true } : m));
      start(async () => { await markMessage(cur.id, true); router.refresh(); });
    }
  }, [cur, router]);

  return (
    <>
      <div className="hd"><div><h1>Messages</h1><p>Everything sent through the contact form on your site. {list.filter(m => !m.read).length} unread.</p></div></div>
      {list.length === 0 ? <div className="panel pad"><p className="muted">No messages yet. When someone uses the contact form, it appears here{' '}(and in your email, if alerts are set up in Site settings).</p></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '380px minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          <div className="panel" style={{ overflow: 'hidden' }}>
            {list.map(m => (
              <button key={m.id} className={`msg ${m.read ? '' : 'unread'} ${sel === m.id ? 'sel' : ''}`} onClick={() => setSel(m.id)}>
                <span className="av" style={{ width: 36, height: 36, fontSize: 12 }}>{m.name.slice(0, 2).toUpperCase()}</span>
                <span style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 13.5 }}>{m.name}</b><span className="muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.topic} · {m.body}</span></span>
                <span className="muted">{fmtDay(m.createdAt, tz)}</span>
              </button>
            ))}
          </div>
          {cur && (
            <div className="panel pad">
              <div className="ph" style={{ alignItems: 'flex-start' }}>
                <div><h3 style={{ fontSize: 18 }}>{cur.name}</h3><p className="muted">{cur.email} · {cur.topic} · {fmtDateTime(cur.createdAt, tz)}</p></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a className="btn pri sm" href={`mailto:${cur.email}?subject=${encodeURIComponent(`Re: ${cur.topic}`)}`}>Reply by email</a>
                  <button className="btn out sm" onClick={() => { setList(l => l.map(m => m.id === cur.id ? { ...m, read: false } : m)); start(async () => { await markMessage(cur.id, false); router.refresh(); }); setSel(null); }}>Mark unread</button>
                  <button className="btn out sm danger" onClick={() => { if (!confirm('Delete this message?')) return; start(async () => { const r = await deleteMessage(cur.id); if (r.ok) { setList(l => l.filter(m => m.id !== cur.id)); setSel(null); show('Deleted'); router.refresh(); } else show(r.error, true); }); }}>Delete</button>
                </div>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 14.5, lineHeight: 1.6, borderTop: '1px solid var(--line)', paddingTop: 14 }}>{cur.body}</p>
            </div>
          )}
        </div>
      )}
      {node}
    </>
  );
}
