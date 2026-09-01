import { headers } from 'next/headers';
import type { ShopView } from './api';

export const SHOP_HEADER = 'x-jokko-shop';

/** Boutique résolue par le middleware pour la requête courante (ou null). */
export async function currentShop(): Promise<ShopView | null> {
  const raw = (await headers()).get(SHOP_HEADER);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as ShopView;
  } catch {
    return null;
  }
}

/**
 * URL publique de la requête courante — dérivée de l'hôte (chaque boutique a son
 * propre sous-domaine / domaine). Repli sur `NEXT_PUBLIC_SITE_URL`.
 */
export async function siteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (host) {
    const local = /localhost|127\.0\.0\.1|lvh\.me/.test(host);
    const proto = h.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}
