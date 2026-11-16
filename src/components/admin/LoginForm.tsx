'use client';
import { useActionState } from 'react';
import { login } from '@/app/admin/actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action}>
      <h1 style={{ font: '600 28px var(--fd)', letterSpacing: '-.05em' }}>Welcome back 👋</h1>
      <p className="muted" style={{ fontSize: 14, marginTop: -6 }}>Sign in to the admin panel</p>
      <div className="fl"><label htmlFor="pw">Password</label><input id="pw" className="in" type="password" name="password" autoComplete="current-password" required autoFocus style={{ height: 48 }} /></div>
      {state?.error && <p className="err">{state.error}</p>}
      <button className="btn pri" style={{ height: 50 }} disabled={pending}>{pending ? 'Signing in…' : 'Sign in →'}</button>
      <p className="hint">Forgot the password? The developer can reset it on the server (ADMIN_PASSWORD).</p>
    </form>
  );
}
