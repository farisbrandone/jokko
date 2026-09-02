import { expect, test } from '@playwright/test';
import { API, seedShop } from './helpers';

// La vitrine résout la boutique par sous-domaine (comme en production).
// `*.lvh.me` pointe sur 127.0.0.1.
const shopUrl = (slug: string) => `http://${slug}.lvh.me:3000`;

test('la vitrine affiche la boutique et sa fiche produit', async ({ page, request }) => {
  test.slow(); // indexation Meilisearch asynchrone

  const { slug, productName } = await seedShop(request);

  const card = page.getByRole('link', { name: new RegExp(productName, 'i') });
  await expect(async () => {
    await page.goto(shopUrl(slug));
    await expect(page.getByText('Boutique introuvable')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /e2e boutique/i }).first()).toBeVisible();
    await expect(card).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });

  await card.click();
  await expect(page).toHaveURL(/\/p\//);

  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { name: productName })).toBeVisible();
  await expect(article.getByText(/CFA/)).toBeVisible(); // prix formaté en XOF
  await expect(article.getByText(/Rupture de stock/)).toBeVisible();
  // Barre de contact (deep links WhatsApp/SMS/appel + partage).
  await expect(article.getByRole('button', { name: 'Partager' })).toBeVisible();
  await expect(article.getByRole('link', { name: 'WhatsApp' })).toBeVisible();
});

test("l'annuaire du domaine apex liste une boutique inscrite", async ({ page, request }) => {
  const { slug, shopId, token } = await seedShop(request);

  const patch = await request.patch(`${API}/shops/${shopId}`, {
    headers: { authorization: `Bearer ${token}` },
    data: { listed: true, tagline: 'Boutique E2E annuaire' },
  });
  expect(patch.ok()).toBeTruthy();

  await expect(async () => {
    await page.goto('http://lvh.me:3000/');
    await expect(page.getByRole('heading', { name: /boutiques Jokko/i })).toBeVisible();
    await expect(page.getByText('Boutique E2E annuaire')).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });

  await page.getByRole('link', { name: /e2e boutique/i }).first().click();
  await expect(page).toHaveURL(new RegExp(`${slug}\\.lvh\\.me`));
});
