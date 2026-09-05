import type { NextRequest } from 'next/server';

/**
 * Origine publique de la requête. `req.nextUrl`/`req.url` reflètent l'adresse
 * d'écoute interne du serveur Next (ex. localhost:3001 derrière pm2), pas
 * l'hôte public vu par le navigateur derrière un reverse proxy — même
 * correctif que apps/storefront/src/app/api/orders/route.ts.
 */
export function publicOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const local = /localhost|127\.0\.0\.1|lvh\.me/.test(host);
  const proto = req.headers.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}
