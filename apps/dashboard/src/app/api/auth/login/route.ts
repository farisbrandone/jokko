import { NextResponse } from 'next/server';
import { apiBase } from '@/lib/api';
import { writeTokens } from '@/lib/session';

export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data?.message ?? 'Échec de connexion' }, { status: res.status });
  }
  await writeTokens(data.tokens.accessToken, data.tokens.refreshToken);
  return NextResponse.json({ user: data.user });
}
