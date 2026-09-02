import { expect, test } from '@playwright/test';
import { rnd } from './helpers';

test('passkey : enregistrement puis connexion sans mot de passe', async ({ page }) => {
  test.slow();

  // Authentificateur virtuel (WebAuthn) piloté via CDP.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  // 1. Inscription e-mail → session ouverte.
  const email = `e2e-pk-${rnd()}@example.com`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Pas encore de compte ?' }).click();
  await page.getByPlaceholder('Votre nom').fill('Passkey E2E');
  await page.getByPlaceholder('E-mail').fill(email);
  await page.getByPlaceholder('Mot de passe').fill('motdepasse1');
  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  // 2. Ajout d'une passkey depuis « Mon compte ».
  await page.goto('/account');
  await page.getByRole('button', { name: 'Ajouter une passkey' }).click();
  await expect(page.getByText(/ajoutée le \d{4}-\d{2}-\d{2}/)).toBeVisible({ timeout: 15_000 });

  // 3. Déconnexion.
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login/);

  // 4. Connexion par passkey → retour au tableau de bord.
  await page.getByRole('button', { name: 'Se connecter avec une passkey' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText('Jokko · vendeur')).toBeVisible();
});
