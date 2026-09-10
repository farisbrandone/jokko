import { apiJson } from './api';
import type { SessionUser, ShopProfile } from './types';

/**
 * Catégories déclarées par la boutique — résolues via l'appartenance de la
 * session (shopId → slug → profil). Renvoie `[]` en cas d'échec (non bloquant :
 * le champ catégorie du formulaire produit reste en saisie libre).
 */
export async function shopCategories(shopId: string): Promise<string[]> {
  try {
    const me = await apiJson<SessionUser>('/auth/me');
    const slug = me.memberships.find((m) => m.shopId === shopId)?.slug;
    if (!slug) return [];
    const shop = await apiJson<ShopProfile>(`/shops/${slug}`);
    return shop.categories ?? [];
  } catch {
    return [];
  }
}
