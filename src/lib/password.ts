import 'server-only';
import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { store } from './store';
import { adminPassword, checkPassword } from './auth';

/**
 * The password the owner chooses in Admin → Site settings, kept as an scrypt hash in the `auth` doc.
 * Until one is chosen, the server's ADMIN_PASSWORD is used. Setting a *new* ADMIN_PASSWORD on the
 * server later overrides the chosen one — the recovery path if it is forgotten.
 * `gen` goes up on every change; sessions issued for an older generation stop working.
 */
interface AuthDoc { hash: string; envFp: string; gen: number; changedAt: string }

const PARAMS = { N: 16384, r: 8, p: 1 };

const scryptAsync = (pw: string, salt: Buffer, len: number, o: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scrypt(pw.normalize('NFC'), salt, len, o, (e, key) => (e ? rej(e) : res(key))));

async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16), key = await scryptAsync(pw, salt, 32, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function matches(pw: string, stored: string): Promise<boolean> {
  try {
    const [algo, N, r, p, salt, hash] = stored.split('$');
    if (algo !== 'scrypt' || !salt || !hash) return false;
    const want = Buffer.from(hash, 'base64');
    const got = await scryptAsync(pw, Buffer.from(salt, 'base64'), want.length, { N: Number(N), r: Number(r), p: Number(p) });
    return timingSafeEqual(got, want);
  } catch { return false; }
}

/** Fingerprint of the server password, to notice when it has been replaced. */
const envFp = () => createHash('sha256').update(`dz-env:${adminPassword() ?? ''}`).digest('base64url');

async function state() {
  const doc = await store().getDoc<AuthDoc>('auth');
  if (!doc) return { doc: null, custom: false, gen: 0, envChanged: false };
  const envChanged = adminPassword() !== null && doc.envFp !== envFp();
  return { doc, custom: !!doc.hash && !envChanged, gen: envChanged ? doc.gen + 1 : doc.gen, envChanged };
}

export async function currentGen(): Promise<number> {
  return (await state()).gen;
}

export async function passwordInfo(): Promise<{ custom: boolean; changedAt: string | null }> {
  const s = await state();
  return { custom: s.custom, changedAt: s.custom && s.doc ? s.doc.changedAt : null };
}

/** The session generation to sign in with, or null when the password is wrong. */
export async function verifyLogin(pw: string): Promise<number | null> {
  const s = await state();
  if (s.custom && s.doc) return (await matches(pw, s.doc.hash)) ? s.gen : null;
  if (!(await checkPassword(pw))) return null;
  // First sign-in after the server password was replaced: forget the old chosen password for good.
  if (s.envChanged) await store().setDoc<AuthDoc>('auth', { hash: '', envFp: envFp(), gen: s.gen, changedAt: new Date().toISOString() });
  return s.gen;
}

/** Store a new password; returns the new session generation (all older sessions stop working). */
export async function setPassword(next: string, gen: number): Promise<number> {
  const doc: AuthDoc = { hash: await hashPassword(next), envFp: envFp(), gen: gen + 1, changedAt: new Date().toISOString() };
  await store().setDoc('auth', doc);
  return doc.gen;
}
