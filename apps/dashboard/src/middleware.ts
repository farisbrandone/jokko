import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS } from '@/lib/cookies';

export function middleware(req: NextRequest) {
  const authed = req.cookies.has(ACCESS);
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === '/login' ||
    pathname === '/oauth/callback' ||
    pathname.startsWith('/legal/');
  if (!authed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (authed && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // `impersonate` : point d'entrée d'une session support, pose lui-même le cookie.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|impersonate).*)'],
};
