import { NextResponse, type NextRequest } from 'next/server';
import { searchProducts } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

/** BFF de recherche : injecte l'id de boutique résolu côté serveur, jamais fourni par le client. */
export async function GET(req: NextRequest) {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) {
    return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });
  }
  let shopId: string;
  try {
    shopId = JSON.parse(decodeURIComponent(raw)).id as string;
  } catch {
    return NextResponse.json({ error: 'Boutique invalide' }, { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const result = await searchProducts(shopId, {
    q: sp.get('q') ?? undefined,
    category: sp.get('category') ?? undefined,
    minPrice: sp.get('minPrice') ?? undefined,
    maxPrice: sp.get('maxPrice') ?? undefined,
    inStock: sp.get('inStock') ?? undefined,
    sort: sp.get('sort') ?? undefined,
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
  });
  return NextResponse.json(result);
}
