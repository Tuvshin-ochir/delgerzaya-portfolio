'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSession, COOKIE, adminPassword } from '@/lib/auth';
import { passwordInfo, setPassword, verifyLogin } from '@/lib/password';
import { requireAdmin } from '@/lib/session';
import { getMedia, getMessages, saveMessages, updateContent, updateMediaList, uid } from '@/lib/content';
import { MAX_SECTION_PHOTOS, MIN_PASSWORD } from '@/lib/limits';
import { removeFiles } from '@/lib/upload';
import { THEMES } from '@/lib/themes';
import type { OrganelleKey, Section, SiteSettings } from '@/lib/types';

export type Result = { ok: true } | { ok: false; error: string };

/* ---------------- auth ---------------- */
/** 8 wrong passwords per IP per 10 minutes — shared by sign-in and password change. */
const attempts = new Map<string, number[]>();
async function limiter() {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const now = Date.now(), recent = (attempts.get(ip) || []).filter(t => now - t < 10 * 60_000);
  return { blocked: recent.length >= 8, fail: () => { attempts.set(ip, [...recent, now]); }, clear: () => { attempts.delete(ip); } };
}
const TOO_MANY = 'Too many attempts. Wait 10 minutes and try again.';

async function startSession(gen: number) {
  const s = await createSession(gen);
  (await cookies()).set(COOKIE, s.value, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: s.maxAge });
}

export async function login(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const lim = await limiter();
  if (lim.blocked) return { error: TOO_MANY };
  const gen = await verifyLogin(String(form.get('password') || ''));
  if (gen === null) {
    if (!adminPassword() && !(await passwordInfo()).custom) return { error: 'ADMIN_PASSWORD is not set on the server.' };
    lim.fail();
    return { error: 'Wrong password' };
  }
  lim.clear();
  await startSession(gen);
  redirect('/admin');
}

export async function changePassword(current: string, next: string, repeat: string): Promise<Result> {
  await requireAdmin();
  const lim = await limiter();
  if (lim.blocked) return { ok: false, error: TOO_MANY };
  if (typeof current !== 'string' || typeof next !== 'string' || typeof repeat !== 'string') return { ok: false, error: 'Invalid input' };
  if (next.length < MIN_PASSWORD) return { ok: false, error: `Use at least ${MIN_PASSWORD} characters` };
  if (next.length > 200) return { ok: false, error: 'Use at most 200 characters' };
  if (next !== repeat) return { ok: false, error: 'The two new passwords don’t match' };
  const gen = await verifyLogin(current);
  if (gen === null) { lim.fail(); return { ok: false, error: 'Current password is wrong' }; }
  if (next === current) return { ok: false, error: 'That is already your password — choose a new one' };
  lim.clear();
  try { await startSession(await setPassword(next, gen)); return { ok: true }; }
  catch (e) { console.error('[admin] password', e); return { ok: false, error: 'Could not save the new password' }; }
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
  redirect('/admin/login');
}

/* ---------------- helpers ---------------- */
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, min: number, max: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
const refresh = () => { revalidatePath('/', 'layout'); };
async function guard<T>(fn: () => Promise<T>): Promise<Result> {
  await requireAdmin();
  try { await fn(); refresh(); return { ok: true }; }
  catch (e) { console.error('[admin]', e); return { ok: false, error: (e as Error).message || 'Could not save' }; }
}

function cleanSection(p: Partial<Section>): Partial<Section> {
  const o: Partial<Section> = {};
  if ('organelle' in p) o.organelle = str(p.organelle, 80);
  if ('short' in p) o.short = str(p.short, 40);
  if ('label' in p) o.label = str(p.label, 40);
  if ('title' in p) o.title = str(p.title, 120);
  if ('status' in p) o.status = p.status === 'published' ? 'published' : 'draft';
  if ('showTelemetry' in p) o.showTelemetry = !!p.showTelemetry;
  if ('mag' in p) o.mag = Math.round(num(p.mag, 1, 1_000_000, 1000));
  if ('objective' in p) o.objective = str(p.objective, 60);
  if ('channels' in p) o.channels = (Array.isArray(p.channels) ? p.channels : []).map(c => str(c, 30)).filter(Boolean).slice(0, 6);
  if ('size' in p) o.size = str(p.size, 40);
  if ('fn' in p) o.fn = str(p.fn, 60);
  if ('entries' in p) o.entries = (Array.isArray(p.entries) ? p.entries : []).slice(0, 60).map(e => ({ id: str(e.id, 40) || uid(), date: str(e.date, 60), title: str(e.title, 200), detail: str(e.detail, 400) }));
  if ('chart' in p && p.chart) o.chart = { enabled: !!p.chart.enabled, title: str(p.chart.title, 80), rows: (Array.isArray(p.chart.rows) ? p.chart.rows : []).slice(0, 12).map(r => ({ label: str(r.label, 30), value: num(r.value, -1e9, 1e9, 0) })) };
  if ('tags' in p) o.tags = (Array.isArray(p.tags) ? p.tags : []).map(t => str(t, 30)).filter(Boolean).slice(0, 12);
  if ('images' in p) o.images = (Array.isArray(p.images) ? p.images : []).slice(0, MAX_SECTION_PHOTOS).map(i => ({ mediaId: str(i.mediaId, 40), caption: str(i.caption, 160) })).filter(i => i.mediaId);
  if ('layout' in p) o.layout = p.layout === 'grid' ? 'grid' : 'strip';
  if ('showForm' in p) o.showForm = !!p.showForm;
  return o;
}

/* ---------------- sections ---------------- */
export async function saveSection(key: OrganelleKey, patch: Partial<Section>): Promise<Result> {
  return guard(() => updateContent(c => {
    const s = c.sections.find(x => x.key === key);
    if (!s) throw new Error('Unknown section');
    Object.assign(s, cleanSection(patch));
    if (key === 'home') s.status = 'published';
  }));
}

export async function setStatus(key: OrganelleKey, status: 'published' | 'draft'): Promise<Result> {
  return saveSection(key, { status });
}

export async function reorder(keys: OrganelleKey[]): Promise<Result> {
  return guard(() => updateContent(c => {
    keys.forEach((k, i) => { const s = c.sections.find(x => x.key === k); if (s) s.order = i + 1; });
  }));
}

export async function setInUse(key: OrganelleKey, inUse: boolean): Promise<Result> {
  if (key === 'home') return { ok: false, error: 'The home section is always on' };
  return guard(() => updateContent(c => {
    const s = c.sections.find(x => x.key === key);
    if (!s) throw new Error('Unknown section');
    s.inUse = inUse;
    if (inUse) { s.status = 'draft'; s.order = Math.max(0, ...c.sections.filter(x => x.inUse && x !== s).map(x => x.order)) + 1; }
  }));
}

/* ---------------- settings ---------------- */
export async function saveSettings(patch: Partial<SiteSettings>): Promise<Result> {
  return guard(() => updateContent(c => {
    const s = c.settings, p = patch;
    if (p.theme && p.theme in THEMES) s.theme = p.theme;
    for (const k of ['owner', 'initials', 'code', 'tagline', 'specimen', 'location', 'timezone', 'siteTitle', 'description', 'notifyEmail'] as const) if (k in p) s[k] = str(p[k], k === 'description' ? 300 : 120);
    if ('initials' in p) s.initials = s.initials.slice(0, 3).toUpperCase();
    for (const k of ['autoRotate', 'particles', 'intro', 'calmMotion'] as const) if (k in p) s[k] = !!p[k];
    if ('rotateSpeed' in p) s.rotateSpeed = num(p.rotateSpeed, 0, 1, 0.4);
    if ('glow' in p) s.glow = num(p.glow, 0, 1, 0.65);
    if ('links' in p) s.links = (Array.isArray(p.links) ? p.links : []).slice(0, 8).map(l => ({ label: str(l.label, 30), url: str(l.url, 300) })).filter(l => l.label || l.url);
    if ('cvMediaId' in p) s.cvMediaId = p.cvMediaId ? str(p.cvMediaId, 40) : null;
    if ('seoImageId' in p) s.seoImageId = p.seoImageId ? str(p.seoImageId, 40) : null;
    if (s.timezone) { try { new Intl.DateTimeFormat('en', { timeZone: s.timezone }); } catch { throw new Error(`Unknown time zone: ${s.timezone}`); } }
  }));
}

/* ---------------- media ---------------- */
export async function updateMedia(id: string, patch: { caption?: string; alt?: string }): Promise<Result> {
  return guard(() => updateMediaList(media => {
    const m = media.find(x => x.id === id);
    if (!m) throw new Error('File not found');
    if ('caption' in patch) m.caption = str(patch.caption, 160);
    if ('alt' in patch) m.alt = str(patch.alt, 200);
  }));
}

export async function deleteMedia(id: string): Promise<Result> {
  return guard(async () => {
    const m = (await getMedia()).find(x => x.id === id);
    if (!m) return;
    await updateContent(c => {
      c.sections.forEach(s => { s.images = s.images.filter(i => i.mediaId !== id); });
      if (c.settings.cvMediaId === id) c.settings.cvMediaId = null;
      if (c.settings.seoImageId === id) c.settings.seoImageId = null;
    });
    await updateMediaList(media => media.filter(x => x.id !== id));
    if (!id.startsWith('seed-')) await removeFiles(m);
  });
}

/* ---------------- messages ---------------- */
export async function markMessage(id: string, read: boolean): Promise<Result> {
  return guard(async () => { const all = await getMessages(), m = all.find(x => x.id === id); if (m) { m.read = read; await saveMessages(all); } });
}
export async function deleteMessage(id: string): Promise<Result> {
  return guard(async () => { await saveMessages((await getMessages()).filter(x => x.id !== id)); });
}
