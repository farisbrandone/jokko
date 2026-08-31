import { NextResponse } from 'next/server';
import { apiBase } from '@/lib/api';
import { clearTokens, readTokens } from '@/lib/session';

export async function POST() {
  const { refresh } = await readTokens();
  if (refresh) {
    await fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: 'no-store',
    }).catch(() => undefined);
  }
  await clearTokens();
  return NextResponse.json({ ok: true });
}
