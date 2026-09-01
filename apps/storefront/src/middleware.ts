import { NextResponse, type NextRequest } from 'next/server';
import { SHOP_HEADER } from '@/lib/shop';

const API = process.env.JOKKO_API_URL ?? 'http://localhost:3333/api';
const ROOT = process.env.SHOP_ROOT_DOMAIN ?? 'lvh.me';
const DEFAULT_SLUG = process.env.DEFAULT_SHOP_SLUG ?? '';

/** Détermine le slug de boutique : sous-domaine → préfixe /s/<slug> → défaut dev. */
function resolveSlug(req: NextRequest): { slug: string | null; strippedPath: string | null } {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  if (host.endsWith(`.${ROOT}`)) {
    const sub = host.slice(0, -1 * (ROOT.length + 1));
    if (sub && sub !== 'www' && !sub.includes('.')) return { slug: sub, strippedPath: null };
  }
  const m = req.nextUrl.pathname.match(/^\/s\/([a-z0-9-]+)(\/.*)?$/i);
  if (m) return { slug: m[1], strippedPath: m[2] || '/' };

  return { slug: DEFAULT_SLUG || null, strippedPath: null };
}

export async function middleware(req: NextRequest) {
  const { slug, strippedPath } = resolveSlug(req);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete(SHOP_HEADER);

  if (slug) {
    try {
      const res = await fetch(`${API}/shops/${encodeURIComponent(slug)}`, {
        next: { revalidate: 120 },
      });
      if (res.ok) {
        const shop = await res.json();
        requestHeaders.set(SHOP_HEADER, encodeURIComponent(JSON.stringify(shop)));
      }
    } catch {
      /* API injoignable : la page rendra l'état « boutique indisponible » */
    }
  }

  if (strippedPath !== null) {
    const url = req.nextUrl.clone();
    url.pathname = strippedPath;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sw.js).*)'],
};
