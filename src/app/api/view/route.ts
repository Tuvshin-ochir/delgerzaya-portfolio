import { NextResponse } from 'next/server';
import { bumpView } from '@/lib/content';

export async function POST() {
  try { await bumpView(); } catch (e) { console.error('[view]', e); }
  return NextResponse.json({ ok: true });
}
