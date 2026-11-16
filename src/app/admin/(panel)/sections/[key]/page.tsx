import { notFound } from 'next/navigation';
import SectionEditor from '@/components/admin/SectionEditor';
import { getContent, getMedia } from '@/lib/content';

export default async function EditSection({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const [c, media] = await Promise.all([getContent(), getMedia()]);
  const section = c.sections.find(s => s.key === key);
  if (!section) notFound();
  return <SectionEditor key={section.key} section={section} media={media} />;
}
