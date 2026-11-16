import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { getMedia } from '@/lib/content';
import { UPLOAD_DIR } from '@/lib/store';

export const runtime = 'nodejs';

/** Share image for link previews: a library photo cropped to 1200 × 630 JPEG, which every platform accepts. */
const cache = new Map<string, Buffer>();

async function source(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith('/uploads/')) return await fs.readFile(path.join(UPLOAD_DIR, path.basename(url)));
    if (url.startsWith('/seed/')) return await fs.readFile(path.join(process.cwd(), 'public', 'seed', path.basename(url)));
    if (url.startsWith('https://')) { const r = await fetch(url); return r.ok ? Buffer.from(await r.arrayBuffer()) : null; }
  } catch { /* file missing */ }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const id = /^([a-z0-9-]{1,40})\.jpg$/.exec((await params).name)?.[1];
  const m = id ? (await getMedia()).find(x => x.id === id && x.kind === 'image') : undefined;
  if (!id || !m) return new Response('Not found', { status: 404 });
  let jpg = cache.get(id);
  if (!jpg) {
    const src = await source(m.url);
    if (!src) return new Response('Not found', { status: 404 });
    jpg = await sharp(src, m.url.endsWith('.svg') ? { density: 300 } : {})
      .resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention })
      .flatten({ background: '#020806' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    cache.set(id, jpg);
    if (cache.size > 12) cache.delete(cache.keys().next().value!);
  }
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
