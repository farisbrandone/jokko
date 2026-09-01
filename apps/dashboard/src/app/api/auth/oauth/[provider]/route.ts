import { NextResponse, type NextRequest } from 'next/server';

// URL publique de l'API (atteignable par le navigateur). En dev, JOKKO_API_URL
// (http://localhost:3333/api) fait l'affaire ; en prod, définir PUBLIC_API_BASE_URL
// (ex. https://api.jokko.shop/api).
const PUBLIC_API = (
  process.env.PUBLIC_API_BASE_URL ??
  process.env.JOKKO_API_URL ??
  'http://localhost:3333/api'
).replace(/\/$/, '');

const PROVIDERS = new Set(['google', 'facebook', 'fake']);

type Ctx = { params: Promise<{ provider: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { provider } = await params;
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'fournisseur inconnu' }, { status: 404 });
  }
  return NextResponse.redirect(`${PUBLIC_API}/auth/oauth/${provider}/start`);
}
