import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS, REFRESH } from '@/lib/cookies';
import { publicOrigin } from '@/lib/origin';

const API = process.env.JOKKO_API_URL ?? 'http://localhost:3333/api';

/**
 * Le cookie ACCESS peut être présent mais périmé (accès + refresh tous deux
 * invalides) — dans ce cas apiFetch() ne peut pas purger les cookies lui-même
 * (les Server Components ne peuvent pas modifier les cookies, seule une
 * Server Action / Route Handler / le middleware le peuvent). Sans cette
 * vérification, `authed` reste "true" indéfiniment : le middleware renvoie
 * /login → / en boucle pendant que chaque page échoue son appel /auth/me et
 * renvoie vers /login (ERR_TOO_MANY_REDIRECTS). On ne fait cet appel réseau
 * que pour /login (page peu visitée), pas sur chaque navigation.
 */
async function hasValidSession(access: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/auth/me`, { headers: { authorization: `Bearer ${access}` } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS)?.value;
  const authed = Boolean(access);
  const { pathname } = req.nextUrl;

  if (!authed && pathname !== '/login') {
    const url = new URL('/login', publicOrigin(req));
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (authed && pathname === '/login') {
    if (await hasValidSession(access!)) {
      return NextResponse.redirect(new URL('/', publicOrigin(req)));
    }
    const res = NextResponse.next();
    res.cookies.delete(ACCESS);
    res.cookies.delete(REFRESH);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
