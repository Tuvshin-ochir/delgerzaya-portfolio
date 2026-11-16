import { NextResponse } from 'next/server';
import { getContent, getMessages, saveMessages, uid } from '@/lib/content';
import type { Message } from '@/lib/types';

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60_000);
  recent.push(now); hits.set(ip, recent);
  return recent.length > 5;
}
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  // honeypot: real people never fill the hidden "website" field
  if (clean(body.website, 200)) return NextResponse.json({ ok: true });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (limited(ip)) return NextResponse.json({ error: 'Too many messages — please try again later.' }, { status: 429 });

  const msg: Message = {
    id: uid(), name: clean(body.name, 120), email: clean(body.email, 200), topic: clean(body.topic, 60) || 'Message',
    body: clean(body.body, 4000), createdAt: new Date().toISOString(), read: false,
  };
  if (!msg.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email) || msg.body.length < 5)
    return NextResponse.json({ error: 'Please fill in your name, a valid email and a message.' }, { status: 400 });

  const all = await getMessages();
  all.unshift(msg);
  await saveMessages(all.slice(0, 2000));
  await notify(msg).catch(e => console.error('[contact] email notification failed:', e));
  return NextResponse.json({ ok: true });
}

/** Optional e-mail alert through Resend (set RESEND_API_KEY and an email in Admin → Site settings). */
async function notify(m: Message) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const to = (await getContent()).settings.notifyEmail || process.env.CONTACT_TO;
  if (!to) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Portfolio <onboarding@resend.dev>', to: [to], reply_to: m.email,
      subject: `New message (${m.topic}) from ${m.name}`,
      html: `<p><b>${esc(m.name)}</b> &lt;${esc(m.email)}&gt; · ${esc(m.topic)}</p><p style="white-space:pre-wrap">${esc(m.body)}</p>`,
    }),
  }).then(r => { if (!r.ok) throw new Error(`Resend ${r.status}`); });
}
