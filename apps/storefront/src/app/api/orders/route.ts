import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

function shopId(req: NextRequest): string | null {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)).id as string;
  } catch {
    return null;
  }
}

/** Origine publique de la requête (chaque boutique a son propre hôte). */
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const local = /localhost|127\.0\.0\.1|lvh\.me/.test(host);
  const proto = req.headers.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

/** Passe une commande sur la boutique courante. */
export async function POST(req: NextRequest) {
  const id = shopId(req);
  if (!id) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });

  const body = await req.json();
  const res = await fetch(`${apiBase}/shops/${id}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, returnUrl: `${publicOrigin(req)}/commande/return` }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 201 : res.status });
}
