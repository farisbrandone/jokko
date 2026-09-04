import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

export async function POST(req: NextRequest) {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });
  const id = JSON.parse(decodeURIComponent(raw)).id as string;

  const { orderId, token, txRef } = await req.json();
  const res = await fetch(`${apiBase}/shops/${id}/orders/${orderId}/confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, txRef }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
