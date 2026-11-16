import type { Metadata } from 'next';
import CellExperience from '@/components/site/CellExperience';
import type { PublicData, PublicSection } from '@/components/site/publicTypes';
import { getContent, getMedia, visibleSections } from '@/lib/content';
import { isAdmin } from '@/lib/session';
import { THEMES } from '@/lib/themes';
import './site.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return {
    title: settings.siteTitle || settings.owner,
    description: settings.description,
    openGraph: { title: settings.siteTitle || settings.owner, description: settings.description, type: 'website' },
    other: { 'theme-color': THEMES[settings.theme]?.bg ?? '#020806' },
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
