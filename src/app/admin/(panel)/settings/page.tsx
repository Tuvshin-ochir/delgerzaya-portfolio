import SettingsForm from '@/components/admin/SettingsForm';
import { getContent, getMedia } from '@/lib/content';
import { store } from '@/lib/store';

export default async function SettingsPage() {
  const [c, media] = await Promise.all([getContent(), getMedia()]);
  const s = c.settings;
  return <SettingsForm initial={{ siteTitle: s.siteTitle, description: s.description, notifyEmail: s.notifyEmail, links: s.links, cvMediaId: s.cvMediaId }} documents={media.filter(m => m.kind === 'document')} driver={store().driver} emailReady={!!process.env.RESEND_API_KEY} />;
}
