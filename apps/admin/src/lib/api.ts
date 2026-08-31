import { readTokens, writeTokens } from './session';

const BASE = process.env.JOKKO_API_URL ?? 'http://localhost:3333/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function raw(
  path: string,
  init: RequestInit,
  access: string | undefined,
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(access ? { authorization: `Bearer ${access}` } : {}),
    },
    cache: 'no-store',
  });
}

/**
 * Appel serveur → API, avec jeton d'accès du cookie dashboard. Sur 401, tente un
 * refresh (rotation) et réessaie une fois. Le navigateur ne voit jamais les jetons.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { access, refresh } = await readTokens();
  let res = await raw(path, init, access);

  if (res.status === 401 && refresh) {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: 'no-store',
    });
    if (r.ok) {
      const data = (await r.json()) as { tokens: { accessToken: string; refreshToken: string } };
      await writeTokens(data.tokens.accessToken, data.tokens.refreshToken);
      res = await raw(path, init, data.tokens.accessToken);
    }
  }
  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let msg = `API ${path} → ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      else if (body?.issues) msg = body.issues.map((i: { message: string }) => i.message).join(', ');
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export { BASE as apiBase };
