import { NextResponse } from 'next/server';
import { apiBase } from '@/lib/api';

export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${apiBase}/auth/otp/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = res.status === 202 ? { sent: true } : await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
