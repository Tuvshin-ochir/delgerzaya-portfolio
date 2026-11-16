'use client';
import { useState } from 'react';

const TOPICS = ['Research', 'Internship', 'Collaboration', 'Just saying hi'];

export default function ContactForm() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState('sending'); setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.get('name'), email: f.get('email'), topic, body: f.get('body'), website: f.get('website') }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Something went wrong');
      setState('sent'); (e.target as HTMLFormElement).reset();
    } catch (err) { setState('error'); setError((err as Error).message); }
  }

  if (state === 'sent') return <div className="cform"><div className="h" style={{ marginBottom: 6 }}>Signal received ✓</div><p className="formmsg">Thank you — I&apos;ll reply soon.</p><button className="send" style={{ marginTop: 12 }} onClick={() => setState('idle')}>Send another</button></div>;

  return (
    <form className="cform" onSubmit={submit}>
      <div className="h" style={{ marginBottom: 4 }}>Send a message</div>
      <label htmlFor="cf-name">Name</label>
      <input id="cf-name" name="name" required maxLength={120} autoComplete="name" />
      <label htmlFor="cf-email">Email</label>
      <input id="cf-email" name="email" type="email" required maxLength={200} autoComplete="email" />
      <label>Topic</label>
      <div className="topics">{TOPICS.map(t => <button type="button" key={t} className={t === topic ? 'on' : ''} onClick={() => setTopic(t)}>{t}</button>)}</div>
      <label htmlFor="cf-body">Message</label>
      <textarea id="cf-body" name="body" required minLength={5} maxLength={4000} />
      <div className="hp" aria-hidden="true"><label htmlFor="cf-web">Website</label><input id="cf-web" name="website" tabIndex={-1} autoComplete="off" /></div>
      <button className="send" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send signal →'}</button>
      {state === 'error' && <p className="formmsg err">{error}</p>}
    </form>
  );
}
