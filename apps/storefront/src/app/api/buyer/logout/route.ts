import { NextResponse } from 'next/server';
import { clearBuyerToken } from '@/lib/buyer-session';

export async function POST() {
  await clearBuyerToken();
  return NextResponse.json({ ok: true });
}
