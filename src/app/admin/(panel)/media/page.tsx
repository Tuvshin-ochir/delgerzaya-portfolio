import MediaLibrary from '@/components/admin/MediaLibrary';
import { getContent, getMedia } from '@/lib/content';
import { diskSpace } from '@/lib/store';

export default async function MediaPage() {
  const [c, media, disk] = await Promise.all([getContent(), getMedia(), diskSpace()]);
  const usage: Record<string, string[]> = {};
  c.sections.filter(s => s.inUse).forEach(s => s.images.forEach(i => { (usage[i.mediaId] ||= []).includes(s.label) || usage[i.mediaId].push(s.label); }));
  if (c.settings.cvMediaId) (usage[c.settings.cvMediaId] ||= []).push('CV button');
  if (c.settings.seoImageId) (usage[c.settings.seoImageId] ||= []).push('Share image');
  return <MediaLibrary media={media} usage={usage} tz={c.settings.timezone} disk={disk} />;
}
