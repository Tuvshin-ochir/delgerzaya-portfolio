import 'server-only';
import sharp from 'sharp';
import { store } from './store';
import { uid } from './content';
import type { Media } from './types';
import { MAX_UPLOAD_MB } from './limits';

export const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif'];
const DOC_EXT = ['pdf'];

export class UploadError extends Error {}

/** Resize + convert photos to WebP (incl. iPhone HEIC) and store them; PDFs are stored as-is. */
export async function processUpload(file: File): Promise<Media> {
  if (file.size > MAX_BYTES) throw new UploadError(`${file.name} is larger than ${MAX_UPLOAD_MB} MB`);
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const isHeic = ext === 'heic' || ext === 'heif' || /heic|heif/.test(file.type);
  const isImage = IMAGE_EXT.includes(ext) || file.type.startsWith('image/');
  const isDoc = DOC_EXT.includes(ext) || file.type === 'application/pdf';
  if (!isImage && !isDoc) throw new UploadError(`${file.name}: only JPG, PNG, WebP, HEIC, GIF, AVIF or PDF`);
  const id = uid(12), s = store(), now = new Date().toISOString();
  let buf: Buffer = Buffer.from(await file.arrayBuffer());

  if (isDoc && !isImage) {
    const url = await s.putFile(`${id}.pdf`, buf, 'application/pdf');
    return { id, kind: 'document', name: file.name, url, thumb: url, mime: 'application/pdf', size: buf.length, width: 0, height: 0, caption: '', alt: '', createdAt: now };
  }

  if (isHeic) {
    const { default: convert } = await import('heic-convert');
    buf = Buffer.from(await convert({ buffer: buf as unknown as ArrayBufferLike, format: 'JPEG', quality: 0.92 }));
  }
  let full, thumb;
  try {
    full = await sharp(buf, { animated: ext === 'gif' }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    thumb = await sharp(buf).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
  } catch {
    throw new UploadError(`${file.name} could not be read as an image`);
  }
  const [url, turl] = await Promise.all([s.putFile(`${id}.webp`, full.data, 'image/webp'), s.putFile(`${id}-t.webp`, thumb, 'image/webp')]);
  return { id, kind: 'image', name: file.name, url, thumb: turl, mime: 'image/webp', size: full.data.length, width: full.info.width, height: full.info.height, caption: '', alt: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), createdAt: now };
}

export async function removeFiles(m: Media): Promise<void> {
  const s = store();
  await s.deleteFile(m.url);
  if (m.thumb !== m.url) await s.deleteFile(m.thumb);
}
