import { cookies } from 'next/headers';

const COOKIE = 'jokko_buyer';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 jours, cohérent avec la durée du jeton API

/**
 * Domaine du cookie : `.{racine}` pour qu'il traverse tous les sous-domaines
 * boutique (compte acheteur multi-boutique) — sauf en local (`localhost`,
 * `lvh.me` fonctionne très bien avec un domaine à point, mais `localhost`
 * n'accepte aucun attribut Domain).
 */
function cookieDomain(): string | undefined {
  const root = process.env.SHOP_ROOT_DOMAIN ?? 'lvh.me';
  if (root === 'localhost') return undefined;
  return `.${root}`;
}

export async function readBuyerToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function writeBuyerToken(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: MAX_AGE,
    domain: cookieDomain(),
  });
}

export async function clearBuyerToken(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: COOKIE, path: '/', domain: cookieDomain() });
}
