import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

/** Collecte d'événements d'analytics : id de boutille injecté côté serveur. */
export async function POST(req: NextRequest) {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) return new NextResponse(null, { status: 204 });
  let shopId: string;
  try {
    shopId = JSON.parse(decodeURIComponent(raw)).id as string;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const res = await fetch(`${apiBase}/shops/${shopId}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await req.text(),
    cache: 'no-store',
  });
  return new NextResponse(null, { status: res.ok ? 204 : 202 });
}
