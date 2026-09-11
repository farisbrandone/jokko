import { apiBase } from './api';
import { readBuyerToken } from './buyer-session';

/** Appel serveur → API avec le jeton acheteur du cookie (BFF, jamais exposé au navigateur). */
export async function buyerFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await readBuyerToken();
  return fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
}

/**
 * Renvoie `null` si non connecté, introuvable, ou si l'API est momentanément
 * injoignable — le compte acheteur est une commodité, jamais un blocage :
 * la page se rabat alors sur le formulaire de connexion.
 */
export async function buyerJson<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  try {
    const res = await buyerFetch(path, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
