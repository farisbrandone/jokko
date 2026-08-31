import { NextResponse, type NextRequest } from 'next/server';
import { apiBase } from '@/lib/api';
import { SHOP_HEADER } from '@/lib/shop';

function shopIdFrom(req: NextRequest): string | null {
  const raw = req.headers.get(SHOP_HEADER);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)).id as string;
  } catch {
    return null;
  }
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const shopId = shopIdFrom(req);
  if (!shopId) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const res = await fetch(
    `${apiBase}/shops/${shopId}/conversations/${id}?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const shopId = shopIdFrom(req);
  if (!shopId) return NextResponse.json({ error: 'Boutique non résolue' }, { status: 404 });
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const res = await fetch(
    `${apiBase}/shops/${shopId}/conversations/${id}/messages?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
