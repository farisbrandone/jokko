import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

export async function GET(req: NextRequest) {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });
  const id = JSON.parse(decodeURIComponent(raw)).id as string;

  const orderId = req.nextUrl.searchParams.get('orderId') ?? '';
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const res = await fetch(
    `${apiBase}/shops/${id}/orders/${orderId}/track?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
