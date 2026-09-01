import { expect, test } from '@playwright/test';
import { seedShop } from './helpers';

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
