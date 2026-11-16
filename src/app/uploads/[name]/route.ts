import { promises as fs } from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/store';

const TYPES: Record<string, string> = { webp: 'image/webp', pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' };

/** Serves files uploaded with the local storage driver (Supabase serves its own public URLs). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-z0-9-]+\.(webp|pdf|jpg|png)$/.test(name)) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': TYPES[name.split('.').pop()!], 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
