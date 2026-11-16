import 'server-only';
import { store } from './store';
import { defaultContent, defaultSections, seedMedia, DEFAULT_SETTINGS } from './defaults';
import type { Content, Media, Message, Section, Stats } from './types';
import { THEMES } from './themes';

/** Fill in anything missing (new organelles, new settings) so older saved data keeps working. */
function normalize(c: Content): Content {
  const defs = defaultSections();
  const byKey = new Map(c.sections.map(s => [s.key, s]));
  const sections: Section[] = defs.map(d => {
    const s = byKey.get(d.key);
    return s ? { ...d, ...s, chart: { ...d.chart, ...(s.chart || {}) } } : d;
  });
  const home = sections.find(s => s.key === 'home')!;
  home.inUse = true; home.status = 'published';
  const settings = { ...DEFAULT_SETTINGS, ...c.settings };
  if (!THEMES[settings.theme]) settings.theme = 'green';
  return { settings, sections, updatedAt: c.updatedAt || new Date().toISOString() };
}

export async function getContent(): Promise<Content> {
  const s = store();
  const c = await s.getDoc<Content>('content');
  if (!c) { const d = defaultContent(); await s.setDoc('content', d); return d; }
  return normalize(c);
}

export async function saveContent(c: Content): Promise<void> {
  await store().setDoc('content', { ...normalize(c), updatedAt: new Date().toISOString() });
}

export async function updateContent(fn: (c: Content) => void | Content): Promise<Content> {
  const c = await getContent();
  const r = fn(c) || c;
  await saveContent(r);
  return r;
}

export function sortedSections(c: Content): Section[] {
  return [...c.sections].sort((a, b) => (a.key === 'home' ? -1 : b.key === 'home' ? 1 : a.order - b.order));
}

/** Sections shown on the public site (home first, then published + in-use in admin order). */
export function visibleSections(c: Content, includeDrafts = false): Section[] {
  return sortedSections(c).filter(s => s.key === 'home' || (s.inUse && (includeDrafts || s.status === 'published')));
}

export async function getMedia(): Promise<Media[]> {
  const s = store();
  const m = await s.getDoc<Media[]>('media');
  if (!m) { const seed = seedMedia(); await s.setDoc('media', seed); return seed; }
  return m;
}
export async function saveMedia(m: Media[]): Promise<void> { await store().setDoc('media', m); }

export async function getMessages(): Promise<Message[]> { return (await store().getDoc<Message[]>('messages')) ?? []; }
export async function saveMessages(m: Message[]): Promise<void> { await store().setDoc('messages', m); }

export async function getStats(): Promise<Stats> { return (await store().getDoc<Stats>('stats')) ?? { days: {} }; }
export async function bumpView(): Promise<void> {
  const st = await getStats(), day = new Date().toISOString().slice(0, 10);
  st.days[day] = (st.days[day] || 0) + 1;
  const keys = Object.keys(st.days).sort();
  while (keys.length > 400) delete st.days[keys.shift()!];
  await store().setDoc('stats', st);
}

export function uid(len = 10): string {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => a[b % a.length]).join('');
}
