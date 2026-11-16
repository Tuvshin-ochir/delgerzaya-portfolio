import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Tiny storage layer with two drivers:
 *  - local    : JSON documents in ./data and uploaded files in ./data/uploads (served by /uploads/*).
 *               Works out of the box with `npm run dev` / `npm start` on any server with a disk.
 *  - supabase : used automatically when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *               (needed for Vercel, whose file system is read-only). See supabase/schema.sql.
 */
export interface Store {
  driver: 'local' | 'supabase';
  getDoc<T>(key: string): Promise<T | null>;
  setDoc<T>(key: string, value: T): Promise<void>;
  putFile(name: string, data: Buffer, contentType: string): Promise<string>;
  deleteFile(url: string): Promise<void>;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const locks = new Map<string, Promise<unknown>>();
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => undefined));
  return next;
}

const local: Store = {
  driver: 'local',
  async getDoc<T>(key: string) {
    try { return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${key}.json`), 'utf8')) as T; }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
  },
  async setDoc<T>(key: string, value: T) {
    await withLock(key, async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const file = path.join(DATA_DIR, `${key}.json`), tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(value, null, 2));
      await fs.rename(tmp, file);
    });
  },
  async putFile(name, data) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, path.basename(name)), data);
    return `/uploads/${path.basename(name)}`;
  },
  async deleteFile(url) {
    if (!url.startsWith('/uploads/')) return;
    await fs.rm(path.join(UPLOAD_DIR, path.basename(url)), { force: true });
  },
};

let sb: SupabaseClient | null = null;
const BUCKET = process.env.SUPABASE_BUCKET || 'media';
function supa(): Store {
  sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const client = sb;
  return {
    driver: 'supabase',
    async getDoc<T>(key: string) {
      const { data, error } = await client.from('kv').select('value').eq('key', key).maybeSingle();
      if (error) throw new Error(`Supabase read failed: ${error.message}`);
      return (data?.value as T) ?? null;
    },
    async setDoc<T>(key: string, value: T) {
      const { error } = await client.from('kv').upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw new Error(`Supabase write failed: ${error.message}`);
    },
    async putFile(name, data, contentType) {
      const { error } = await client.storage.from(BUCKET).upload(name, data, { contentType, upsert: true, cacheControl: '31536000' });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      return client.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
    },
    async deleteFile(url) {
      const marker = `/object/public/${BUCKET}/`, i = url.indexOf(marker);
      if (i < 0) return;
      await client.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
    },
  };
}

export function store(): Store {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? supa() : local;
}

/** Free / total bytes on the disk holding content and uploads (local driver only). */
export async function diskSpace(): Promise<{ free: number; total: number } | null> {
  if (store().driver !== 'local') return null;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const s = await fs.statfs(DATA_DIR);
    return { free: s.bavail * s.bsize, total: s.blocks * s.bsize };
  } catch { return null; }
}
