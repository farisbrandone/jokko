import { NextResponse, type NextRequest } from 'next/server';
import type { BuyerAuthResult } from '@jokko/contracts';
import { apiBase } from '@/lib/api';
import { writeBuyerToken } from '@/lib/buyer-session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${apiBase}/buyer/otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) await writeBuyerToken((data as BuyerAuthResult).token);
  return NextResponse.json(data, { status: res.status });
}
