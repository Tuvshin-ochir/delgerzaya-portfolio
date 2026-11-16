import MediaLibrary from '@/components/admin/MediaLibrary';
import { getContent, getMedia } from '@/lib/content';

export default async function MediaPage() {
  const [c, media] = await Promise.all([getContent(), getMedia()]);
  const usage: Record<string, string[]> = {};
  c.sections.filter(s => s.inUse).forEach(s => s.images.forEach(i => { (usage[i.mediaId] ||= []).includes(s.label) || usage[i.mediaId].push(s.label); }));
  if (c.settings.cvMediaId) (usage[c.settings.cvMediaId] ||= []).push('CV button');
  return <MediaLibrary media={media} usage={usage} tz={c.settings.timezone} />;
}
