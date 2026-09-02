import { NextResponse } from 'next/server';
import { apiBase } from '@/lib/api';
import { writeTokens } from '@/lib/session';

/** Vérifie l'assertion WebAuthn puis ouvre la session BFF. */
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${apiBase}/auth/webauthn/login/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message ?? 'Connexion par passkey refusée' },
      { status: res.status },
    );
  }
  await writeTokens(data.tokens.accessToken, data.tokens.refreshToken);
  return NextResponse.json({ user: data.user });
}
