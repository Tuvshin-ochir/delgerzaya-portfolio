import SectionsManager, { type Row } from '@/components/admin/SectionsManager';
import { getContent, sortedSections } from '@/lib/content';
import { THEMES, organelleColor } from '@/lib/themes';

export default async function SectionsPage() {
  const c = await getContent(), T = THEMES[c.settings.theme];
  const rows: Row[] = sortedSections(c).map(s => ({ key: s.key, label: s.label, organelle: s.organelle, title: s.title, status: s.status, inUse: s.inUse, images: s.images.length, color: organelleColor(T, s.key), fn: s.fn }));
  return <SectionsManager rows={rows} />;
}
