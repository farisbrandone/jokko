import { expect, test } from '@playwright/test';
import { rnd } from './helpers';

test('inscription e-mail → boutique en un clic → boutique listée', async ({ page }) => {
  const email = `e2e-${rnd()}@example.com`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Pas encore de compte ?' }).click();
  await page.getByPlaceholder('Votre nom').fill('Awa E2E');
  await page.getByPlaceholder('E-mail').fill(email);
  await page.getByPlaceholder('Mot de passe').fill('motdepasse1');
  await page.getByRole('button', { name: 'Créer le compte' }).click();

  // Compte créé → on quitte /login (redirection vers l'accueil ou l'onboarding).
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto('/onboarding');
  const shopName = `E2E Boutique ${rnd()}`;
  await page.getByLabel('Nom de la boutique').fill(shopName);
  await page.getByLabel(/Num.ro WhatsApp/).fill('+221771234567');
  await page.getByRole('button', { name: 'Créer la boutique' }).click();

  await expect(page).toHaveURL(/\/s\/[0-9a-f-]{36}$/);

  await page.goto('/');
  await expect(page.getByText(/e2e-boutique/i)).toBeVisible();
});

test('connexion par SMS (OTP) avec le code de dev', async ({ page }) => {
  const phone = `+22177${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Téléphone' }).click();
  await page.getByPlaceholder('+221 77 123 45 67').fill(phone);
  await page.getByRole('button', { name: 'Recevoir un code' }).click();

  await page.getByPlaceholder('Code à 6 chiffres').fill('000000');
  await page.getByPlaceholder(/Votre nom/).fill('Client OTP');
  await page.getByRole('button', { name: 'Valider' }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText('Jokko · vendeur')).toBeVisible();
});

test('équipe : inviter un membre depuis le dashboard', async ({ page }) => {
  const email = `e2e-${rnd()}@example.com`;
  const mate = `e2e-mate-${rnd()}@example.com`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Pas encore de compte ?' }).click();
  await page.getByPlaceholder('Votre nom').fill('Owner E2E');
  await page.getByPlaceholder('E-mail').fill(email);
  await page.getByPlaceholder('Mot de passe').fill('motdepasse1');
  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto('/onboarding');
  await page.getByLabel('Nom de la boutique').fill(`E2E Boutique ${rnd()}`);
  await page.getByLabel(/Num.ro WhatsApp/).fill('+221771234567');
  await page.getByRole('button', { name: 'Créer la boutique' }).click();
  await expect(page).toHaveURL(/\/s\/[0-9a-f-]{36}$/);

  await page.getByRole('link', { name: 'Équipe' }).click();
  await expect(page.getByRole('heading', { name: 'Équipe' })).toBeVisible();

  await page.getByPlaceholder('adresse e-mail').fill(mate);
  await page.getByRole('button', { name: 'Envoyer' }).click();

  // L'invitation en attente apparaît dans la liste.
  await expect(page.getByText(new RegExp(`${mate}.*en attente`))).toBeVisible();
});
