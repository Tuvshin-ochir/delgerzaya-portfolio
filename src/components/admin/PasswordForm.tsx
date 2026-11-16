'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { changePassword } from '@/app/admin/actions';
import { fmtDate } from '@/lib/format';
import { MIN_PASSWORD } from '@/lib/limits';

export default function PasswordForm({ custom, changedAt, tz }: { custom: boolean; changedAt: string | null; tz: string }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [rep, setRep] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const short = next.length > 0 && next.length < MIN_PASSWORD, differ = rep.length > 0 && rep !== next;
  const ready = !!cur && next.length >= MIN_PASSWORD && next === rep && !pending;
  const type = show ? 'text' : 'password';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setMsg(null);
    start(async () => {
      const r = await changePassword(cur, next, rep);
      if (r.ok) { setCur(''); setNext(''); setRep(''); setMsg({ ok: true, text: 'Password changed ✓ Other devices are signed out.' }); router.refresh(); }
      else setMsg({ ok: false, text: r.error });
    });
  }

  return (
    <form className="panel pad grid" style={{ gap: 10 }} onSubmit={submit}>
      <div className="ph" style={{ marginBottom: 2 }}><h3>Admin password</h3><small>{custom && changedAt ? `changed ${fmtDate(changedAt, tz)}` : 'starting password from the server'}</small></div>
      <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
      <div className="fl"><label htmlFor="pw-cur">Current password</label><input id="pw-cur" className="in" type={type} autoComplete="current-password" value={cur} onChange={e => setCur(e.target.value)} /></div>
      <div className="fl"><label htmlFor="pw-new">New password <span className={short ? 'warn' : ''}>· at least {MIN_PASSWORD} characters</span></label><input id="pw-new" className="in" type={type} autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} /></div>
      <div className="fl"><label htmlFor="pw-rep">Repeat new password {differ && <span className="warn">· doesn’t match yet</span>}</label><input id="pw-rep" className="in" type={type} autoComplete="new-password" value={rep} onChange={e => setRep(e.target.value)} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn pri sm" disabled={!ready}>{pending ? 'Changing…' : 'Change password'}</button>
        <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show passwords</label>
      </div>
      {msg && <p className={msg.ok ? 'okmsg' : 'err'} role="status">{msg.text}</p>}
      <p className="hint">Changing it signs out every other device. Forgot it? The developer can reset it on the server (ADMIN_PASSWORD).</p>
    </form>
  );
}
