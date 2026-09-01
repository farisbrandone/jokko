import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { ACCESS, REFRESH } from '@/lib/cookies';

/**
 * Point d'entrée d'une session support : la console plateforme redirige ici avec
 * un jeton d'usurpation. On vérifie qu'il s'agit bien d'un jeton `act` (usurpation)
 * puis on le pose en cookie court, sans refresh.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const shopId = req.nextUrl.searchParams.get('shopId');
  const login = new URL('/login', req.url);

  if (!token) return NextResponse.redirect(login);

  const res = await fetch(`${apiBase}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.redirect(login);
  const me = (await res.json()) as { impersonatedBy?: string | null };
  if (!me.impersonatedBy) return NextResponse.redirect(login);

  const dest = new URL(shopId ? `/s/${shopId}` : '/', req.url);
  const out = NextResponse.redirect(dest);
  out.cookies.set(ACCESS, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 900,
  });
  out.cookies.delete(REFRESH);
  return out;
}
