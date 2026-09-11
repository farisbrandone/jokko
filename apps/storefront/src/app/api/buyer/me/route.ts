import { NextResponse, type NextRequest } from 'next/server';
import { buyerFetch } from '@/lib/buyer-api';

export async function GET() {
  const res = await buyerFetch('/buyer/me');
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest) {
  const body = await req.text();
  const res = await buyerFetch('/buyer/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
