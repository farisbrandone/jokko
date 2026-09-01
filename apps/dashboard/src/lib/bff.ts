'use client';

/** Fetchers navigateur → route handlers du dashboard (le BFF ajoute le jeton). */

export class BffError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new BffError(res.status, data?.error ?? data?.message ?? `Erreur ${res.status}`);
  }
  return data as T;
}

export function bffGet<T>(path: string): Promise<T> {
  return fetch(path, { cache: 'no-store' }).then((r) => parse<T>(r));
}

export function bffSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  return fetch(path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => parse<T>(r));
}
