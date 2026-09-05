import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS } from '@/lib/cookies';
import { publicOrigin } from '@/lib/origin';

export function middleware(req: NextRequest) {
  const authed = req.cookies.has(ACCESS);
  const { pathname } = req.nextUrl;

  if (!authed && pathname !== '/login') {
    const url = new URL('/login', publicOrigin(req));
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (authed && pathname === '/login') {
    const url = new URL('/', publicOrigin(req));
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
