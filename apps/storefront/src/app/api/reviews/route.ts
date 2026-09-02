import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

/** Dépose un avis produit pour la boutique courante (id injecté côté serveur). */
export async function POST(req: NextRequest) {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });
  const shopId = JSON.parse(decodeURIComponent(raw)).id as string;

  const { productId, ...body } = await req.json();
  if (typeof productId !== 'string') {
    return NextResponse.json({ error: 'productId requis' }, { status: 400 });
  }
  const res = await fetch(`${apiBase}/shops/${shopId}/products/${productId}/reviews`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
