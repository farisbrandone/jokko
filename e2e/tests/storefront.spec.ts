import { expect, test } from '@playwright/test';
import { API, rnd, seedShop } from './helpers';

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
  // Commande en un message : le canal e-mail est toujours proposé.
  const orderEmail = article.getByRole('button', { name: /Commander par e-mail/i });
  await expect(orderEmail).toBeVisible();
  await orderEmail.click();
  await expect(article.getByPlaceholder(/Adresse de livraison/i)).toBeVisible();
});

test("l'annuaire du domaine apex liste une boutique inscrite", async ({ page, request }) => {
  const { slug, shopId, token } = await seedShop(request);
  const marker = `annuaire${rnd()}`;
  const tagline = `Boutique test ${marker}`;

  const patch = await request.patch(`${API}/shops/${shopId}`, {
    headers: { authorization: `Bearer ${token}` },
    data: { listed: true, tagline },
  });
  expect(patch.ok()).toBeTruthy();

  // Recherche par marqueur unique → l'annuaire ne renvoie que cette boutique.
  await expect(async () => {
    await page.goto(`http://lvh.me:3000/boutiques?q=${marker}`);
    await expect(page.getByRole('heading', { name: /boutiques Jokko/i })).toBeVisible();
    await expect(page.getByText(tagline)).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });

  await page.getByRole('link', { name: /e2e boutique/i }).first().click();
  await expect(page).toHaveURL(new RegExp(`${slug}\\.lvh\\.me`));
});

test('achat : panier → paiement (fake) → commande payée', async ({ page, request }) => {
  test.slow();
  const { slug, productName } = await seedShop(request, { stock: 5 });

  const card = page.getByRole('link', { name: new RegExp(productName, 'i') });
  await expect(async () => {
    await page.goto(shopUrl(slug));
    await expect(card).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
  await card.click();
  await expect(page).toHaveURL(/\/p\//);

  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByRole('link', { name: 'Voir le panier' }).click();
  await expect(page).toHaveURL(/\/panier/);

  await page.getByPlaceholder('Votre nom').fill('Awa Cliente');
  await page.getByPlaceholder(/Téléphone/).fill('+221771234567');
  await page.getByRole('button', { name: /Payer/ }).click();

  // Passerelle fake → retour immédiat → confirmation → page commande
  await expect(page).toHaveURL(/\/commande\/[0-9a-f-]{36}/, { timeout: 15_000 });
  await expect(page.getByText(/Statut :/)).toContainText('Payée');
});

test('achat : paiement à la livraison → commande à livrer', async ({ page, request }) => {
  test.slow();
  const { slug, productName } = await seedShop(request, { stock: 3 });

  const card = page.getByRole('link', { name: new RegExp(productName, 'i') });
  await expect(async () => {
    await page.goto(shopUrl(slug));
    await expect(card).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
  await card.click();
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByRole('link', { name: 'Voir le panier' }).click();
  await expect(page).toHaveURL(/\/panier/);

  await page.getByPlaceholder('Votre nom').fill('Bina Cliente');
  await page.getByPlaceholder(/Téléphone/).fill('+221771234500');
  await page.getByText('Paiement à la livraison').click();
  await page.getByRole('button', { name: /Commander/ }).click();

  await expect(page).toHaveURL(/\/commande\/[0-9a-f-]{36}/, { timeout: 15_000 });
  await expect(page.getByText(/Statut :/)).toContainText('À livrer');
});
