import { NextResponse } from 'next/server';
import { buyerFetch } from '@/lib/buyer-api';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const res = await buyerFetch(`/buyer/orders/${encodeURIComponent(orderId)}`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
