import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS } from '@/lib/cookies';

export function middleware(req: NextRequest) {
  const authed = req.cookies.has(ACCESS);
  const { pathname } = req.nextUrl;

  if (!authed && pathname !== '/login') {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
