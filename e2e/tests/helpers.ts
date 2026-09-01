import { expect, type APIRequestContext } from '@playwright/test';

export const API = 'http://localhost:3333/api';
export const STOREFRONT = 'http://localhost:3000';

export const rnd = () => Math.random().toString(36).slice(2, 9);

/** Crée un vendeur + une boutique publiée avec un produit, via l'API. Retourne le slug. */
export async function seedShop(
  request: APIRequestContext,
  opts: { productName?: string } = {},
): Promise<{ slug: string; shopId: string; token: string; productName: string }> {
  const email = `e2e-${rnd()}@example.com`;
  const reg = await request.post(`${API}/auth/register`, {
    data: { email, password: 'motdepasse1', name: 'E2E Vendeur' },
  });
  expect(reg.ok()).toBeTruthy();
  const token = (await reg.json()).tokens.accessToken as string;
  const auth = { authorization: `Bearer ${token}` };

  const shopRes = await request.post(`${API}/shops`, {
    headers: auth,
    data: { name: `E2E Boutique ${rnd()}`, verticals: ['electronique'], whatsapp: '+221770000000' },
  });
  expect(shopRes.ok()).toBeTruthy();
  const shop = (await shopRes.json()).shop as { id: string; slug: string };

  const productName = opts.productName ?? `Casque E2E ${rnd()}`;
  const p = await request.post(`${API}/shops/${shop.id}/products`, {
    headers: auth,
    data: {
      name: productName,
      category: 'electronique',
      price: { amount: 12000 },
      images: ['https://picsum.photos/seed/e2e/600'],
    },
  });
  expect(p.ok()).toBeTruthy();
  const productId = (await p.json()).id as string;
  const pub = await request.post(`${API}/shops/${shop.id}/products/${productId}/publish`, {
    headers: auth,
  });
  expect(pub.ok()).toBeTruthy();

  // Attend l'indexation Meilisearch (outbox rejoué toutes les 2 s).
  await expect
    .poll(
      async () => {
        const r = await request.get(
          `${API}/shops/${shop.id}/search?q=${encodeURIComponent(productName)}`,
        );
        return r.ok() ? ((await r.json()).total as number) : -1;
      },
      { timeout: 30_000, intervals: [1000] },
    )
    .toBeGreaterThan(0);

  return { slug: shop.slug, shopId: shop.id, token, productName };
}
