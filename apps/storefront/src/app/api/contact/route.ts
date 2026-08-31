import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

/** Ouvre une conversation avec la boutique (id injecté côté serveur). */
export async function POST(req: NextRequest) {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });
  const shopId = JSON.parse(decodeURIComponent(raw)).id as string;

  const body = await req.json();
  const res = await fetch(`${apiBase}/shops/${shopId}/conversations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
