import { cookies } from 'next/headers';
import { ACCESS, REFRESH } from './cookies';

export { ACCESS, REFRESH };

export async function readTokens(): Promise<{ access?: string; refresh?: string }> {
  const c = await cookies();
  return { access: c.get(ACCESS)?.value, refresh: c.get(REFRESH)?.value };
}

export async function writeTokens(access: string, refresh: string): Promise<void> {
  const c = await cookies();
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: false, path: '/' };
  c.set(ACCESS, access, { ...base, maxAge: 60 * 60 * 8 });
  c.set(REFRESH, refresh, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearTokens(): Promise<void> {
  const c = await cookies();
  c.delete(ACCESS);
  c.delete(REFRESH);
}
