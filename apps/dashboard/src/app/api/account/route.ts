import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { clearTokens } from '@/lib/session';

/** Droit à l'effacement : supprime le compte via l'API puis vide la session BFF. */
export async function DELETE() {
  const res = await apiFetch('/me', { method: 'DELETE' });
  const text = await res.text();
  if (res.ok) await clearTokens();
  return new NextResponse(text || '{}', {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
