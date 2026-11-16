import { NextResponse } from 'next/server';
import { getMedia, saveMedia } from '@/lib/content';
import { isAdmin } from '@/lib/session';
import { processUpload, UploadError } from '@/lib/upload';
import type { Media } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Upload failed — file may be too large' }, { status: 400 }); }
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: 'No files received' }, { status: 400 });

  const added: Media[] = [], errors: string[] = [];
  for (const f of files) {
    try { added.push(await processUpload(f)); }
    catch (e) { errors.push(e instanceof UploadError ? e.message : `${f.name}: upload failed`); if (!(e instanceof UploadError)) console.error('[upload]', e); }
  }
  if (added.length) { const media = await getMedia(); await saveMedia([...added, ...media]); }
  return NextResponse.json({ added, errors }, { status: added.length ? 200 : 400 });
}
