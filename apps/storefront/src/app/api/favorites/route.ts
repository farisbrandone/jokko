import { NextResponse, type NextRequest } from 'next/server';
import { getProduct } from '@/lib/api';
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

/** Résout les fiches produit d'une liste de favoris (ids stockés côté navigateur). */
export async function POST(req: NextRequest) {
  const id = shopId(req);
  if (!id) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
  const capped = (ids as string[]).slice(0, 60);

  const products = await Promise.all(
    capped.map((pid) => getProduct(id, pid).catch(() => null)),
  );

  return NextResponse.json({
    items: products.filter((p): p is NonNullable<typeof p> => p != null),
  });
}
