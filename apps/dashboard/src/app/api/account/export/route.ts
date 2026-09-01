import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';

/** Télécharge l'archive RGPD des données du compte (proxy authentifié). */
export async function GET() {
  const res = await apiFetch('/me/export');
  const text = await res.text();
  if (!res.ok) {
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    });
  }
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(text, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="jokko-export-${day}.json"`,
    },
  });
}
