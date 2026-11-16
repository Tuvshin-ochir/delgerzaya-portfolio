import type { Metadata } from 'next';
import { headers } from 'next/headers';
import CellExperience from '@/components/site/CellExperience';
import type { PublicData, PublicSection } from '@/components/site/publicTypes';
import { getContent, getMedia, visibleSections } from '@/lib/content';
import { isAdmin } from '@/lib/session';
import { THEMES } from '@/lib/themes';
import './site.css';

export const dynamic = 'force-dynamic';

/** Absolute site address for link previews, taken from the domain the page was requested on. */
function origin(h: { get(name: string): string | null }): URL | undefined {
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim() || (host?.startsWith('localhost') ? 'http' : 'https');
  try { return host ? new URL(`${proto}://${host}`) : undefined; } catch { return undefined; }
}

export async function generateMetadata(): Promise<Metadata> {
  const [{ settings: s }, media, h] = await Promise.all([getContent(), getMedia(), headers()]);
  const title = s.siteTitle || s.owner, description = s.description;
  const img = s.seoImageId ? media.find(m => m.id === s.seoImageId && m.kind === 'image') : undefined;
  const images = img ? [{ url: `/og/${img.id}.jpg`, width: 1200, height: 630, alt: img.alt || title }] : undefined;
  return {
    metadataBase: origin(h),
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description, type: 'website', url: '/', siteName: s.owner, images },
    twitter: { card: img ? 'summary_large_image' : 'summary', title, description, images },
    other: { 'theme-color': THEMES[s.theme]?.bg ?? '#020806' },
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const preview = sp.preview === '1' && (await isAdmin());
  const [content, media] = await Promise.all([getContent(), getMedia()]);
  const byId = new Map(media.map(m => [m.id, m]));
  const s = content.settings;

  const sections: PublicSection[] = visibleSections(content, preview).map(x => ({
    key: x.key, organelle: x.organelle, short: x.short || x.organelle, label: x.label, title: x.title, draft: x.key !== 'home' && x.status !== 'published',
    showTelemetry: x.showTelemetry, mag: x.mag || 1000, objective: x.objective, channels: x.channels.filter(Boolean), size: x.size, fn: x.fn,
    entries: x.entries, chart: x.chart, tags: x.tags.filter(Boolean), layout: x.layout, showForm: x.showForm,
    images: x.images.flatMap(i => { const m = byId.get(i.mediaId); return m && m.kind === 'image' ? [{ url: m.url, thumb: m.thumb, caption: i.caption || m.caption, alt: m.alt }] : []; }),
  }));

  const cv = s.cvMediaId ? byId.get(s.cvMediaId) : undefined;
  const data: PublicData = {
    settings: { theme: s.theme, owner: s.owner, initials: s.initials, code: s.code, tagline: s.tagline, specimen: s.specimen, location: s.location, timezone: s.timezone, autoRotate: s.autoRotate, rotateSpeed: s.rotateSpeed, glow: s.glow, particles: s.particles, intro: s.intro, calmMotion: s.calmMotion },
    sections,
    links: s.links.filter(l => l.label && /^https?:\/\//.test(l.url)),
    cvUrl: cv?.url ?? null,
    preview,
  };
  return <CellExperience data={data} />;
}
