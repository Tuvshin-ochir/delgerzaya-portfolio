import { headers } from 'next/headers';
import SettingsForm from '@/components/admin/SettingsForm';
import { getContent, getMedia } from '@/lib/content';
import { passwordInfo } from '@/lib/password';
import { diskSpace, store } from '@/lib/store';

export default async function SettingsPage() {
  const [c, media, password, disk, h] = await Promise.all([getContent(), getMedia(), passwordInfo(), diskSpace(), headers()]);
  const s = c.settings;
  return (
    <SettingsForm
      initial={{ siteTitle: s.siteTitle, description: s.description, seoImageId: s.seoImageId, notifyEmail: s.notifyEmail, links: s.links, cvMediaId: s.cvMediaId }}
      media={media} owner={s.owner} host={h.get('x-forwarded-host') ?? h.get('host') ?? ''} tz={s.timezone}
      password={password} disk={disk} driver={store().driver} emailReady={!!process.env.RESEND_API_KEY} />
  );
}
