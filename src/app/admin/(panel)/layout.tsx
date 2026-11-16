import AdminShell from '@/components/admin/AdminShell';
import { getContent, getMedia, getMessages } from '@/lib/content';
import { requireAdmin } from '@/lib/session';
import '../admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [c, media, messages] = await Promise.all([getContent(), getMedia(), getMessages()]);
  const counts = { sections: c.sections.filter(s => s.inUse && s.key !== 'home').length, media: media.length, unread: messages.filter(m => !m.read).length };
  return <AdminShell owner={c.settings.owner} initials={c.settings.initials} counts={counts}>{children}</AdminShell>;
}
