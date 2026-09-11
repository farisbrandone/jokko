import { NextResponse, type NextRequest } from 'next/server';
import { buyerFetch } from '@/lib/buyer-api';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.text();
  const res = await buyerFetch(`/buyer/disputes/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body || '{}',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
