import { NextResponse } from 'next/server';
import { buyerFetch } from '@/lib/buyer-api';

export async function GET() {
  const res = await buyerFetch('/buyer/orders');
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
