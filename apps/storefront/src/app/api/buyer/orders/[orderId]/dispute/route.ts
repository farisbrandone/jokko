import { NextResponse, type NextRequest } from 'next/server';
import { buyerFetch } from '@/lib/buyer-api';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const res = await buyerFetch(`/buyer/orders/${encodeURIComponent(orderId)}/dispute`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const body = await req.text();
  const res = await buyerFetch(`/buyer/orders/${encodeURIComponent(orderId)}/dispute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
