import { NextResponse } from 'next/server';
import { apiBase } from '@/lib/api';

/** Options d'assertion WebAuthn (connexion) — aucune session requise. */
export async function POST() {
  const res = await fetch(`${apiBase}/auth/webauthn/login/options`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  });
  const text = await res.text();
  return new NextResponse(text || '{}', {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
