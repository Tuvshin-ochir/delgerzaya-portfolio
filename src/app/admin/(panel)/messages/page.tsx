import MessagesView from '@/components/admin/MessagesView';
import { getContent, getMessages } from '@/lib/content';

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [{ id }, messages, c] = await Promise.all([searchParams, getMessages(), getContent()]);
  return <MessagesView messages={messages} openId={id} tz={c.settings.timezone} />;
}
