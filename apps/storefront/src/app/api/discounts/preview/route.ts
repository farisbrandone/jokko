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

/** Vérifie un code de réduction pour le panier courant. */
export async function POST(req: NextRequest) {
  const id = shopId(req);
  if (!id) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${apiBase}/shops/${id}/discounts/preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
