import AppearanceForm from '@/components/admin/AppearanceForm';
import { getContent } from '@/lib/content';

export default async function AppearancePage() {
  const c = await getContent(), s = c.settings;
  const look = { theme: s.theme, owner: s.owner, initials: s.initials, code: s.code, tagline: s.tagline, specimen: s.specimen, location: s.location, timezone: s.timezone, autoRotate: s.autoRotate, rotateSpeed: s.rotateSpeed, glow: s.glow, particles: s.particles, intro: s.intro, calmMotion: s.calmMotion };
  return <AppearanceForm initial={look} sections={c.sections.filter(x => x.inUse && x.status === 'published' && x.key !== 'home').length} />;
}
