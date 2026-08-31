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
