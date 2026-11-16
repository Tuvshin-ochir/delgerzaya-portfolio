/**
 * Single-owner admin login. Edge-safe (Web Crypto) so it can run in middleware too.
 * Password comes from ADMIN_PASSWORD; sessions are HMAC-signed cookies keyed with ADMIN_SECRET.
 */
export const COOKIE = 'dz_admin';
const MAX_AGE_DAYS = 14;
const enc = new TextEncoder();

function secret(): string {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  if (process.env.ADMIN_PASSWORD) return `dz-session:${process.env.ADMIN_PASSWORD}`;
  return process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret';
}

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

export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const maxAge = MAX_AGE_DAYS * 86400, payload = `v1.${Date.now() + maxAge * 1000}`;
  return { value: `${payload}.${await sign(payload)}`, maxAge };
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token || !secret()) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const payload = token.slice(0, i), sig = token.slice(i + 1), exp = Number(payload.split('.')[1]);
  if (!exp || exp < Date.now()) return false;
  return safeEqual(sig, await sign(payload));
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = adminPassword();
  if (!pw) return false;
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(input)), crypto.subtle.digest('SHA-256', enc.encode(pw))]);
  return safeEqual(b64url(a), b64url(b));
}
