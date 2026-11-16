/**
 * Single-owner admin login. Edge-safe (Web Crypto) so it can run in middleware too.
 * Sessions are HMAC-signed cookies keyed with ADMIN_SECRET. Each carries the password generation it was
 * issued for (see password.ts), so changing the password signs out every other device.
 */
export const COOKIE = 'dz_admin';
const MAX_AGE_DAYS = 14;
const enc = new TextEncoder();

function secret(): string {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  if (process.env.ADMIN_PASSWORD) return `dz-session:${process.env.ADMIN_PASSWORD}`;
  return process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret';
}

/** The server's password: used until the owner chooses one, and the reset path if that one is forgotten. */
export function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === 'production' ? null : 'delgerzaya';
}

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSession(gen: number): Promise<{ value: string; maxAge: number }> {
  const maxAge = MAX_AGE_DAYS * 86400, payload = `v2.${gen}.${Date.now() + maxAge * 1000}`;
  return { value: `${payload}.${await sign(payload)}`, maxAge };
}

/** Checks signature and expiry; returns the password generation (v1 cookies predate it and count as 0). */
export async function readSession(token: string | undefined | null): Promise<{ gen: number } | null> {
  if (!token || !secret()) return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), sig = token.slice(i + 1), p = payload.split('.');
  const [gen, exp] = p[0] === 'v2' && p.length === 3 ? [Number(p[1]), Number(p[2])] : p[0] === 'v1' && p.length === 2 ? [0, Number(p[1])] : [NaN, NaN];
  if (!Number.isInteger(gen) || gen < 0 || !(exp > Date.now())) return null;
  return safeEqual(sig, await sign(payload)) ? { gen } : null;
}

/** Middleware check only (no storage at the edge); pages, actions and routes also compare the generation via isAdmin(). */
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  return (await readSession(token)) !== null;
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = adminPassword();
  if (!pw) return false;
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(input)), crypto.subtle.digest('SHA-256', enc.encode(pw))]);
  return safeEqual(b64url(a), b64url(b));
}
