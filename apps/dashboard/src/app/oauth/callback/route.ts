import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { writeTokens } from '@/lib/session';

/** Retour OAuth : troque le ticket court contre une session, puis redirige. */
export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('ticket');
  const home = new URL('/', req.url);
  const fail = new URL('/login?error=oauth', req.url);
  if (!ticket) return NextResponse.redirect(fail);

  try {
    const res = await fetch(`${apiBase}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket }),
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.redirect(fail);
    const data = await res.json();
    await writeTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return NextResponse.redirect(home);
  } catch {
    return NextResponse.redirect(fail);
  }
}
