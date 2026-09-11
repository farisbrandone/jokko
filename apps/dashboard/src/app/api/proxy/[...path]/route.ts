import { NextResponse, type NextRequest } from 'next/server';
import { apiFetch } from '@/lib/api';

/** Proxy authentifié : /api/proxy/<chemin> → API Jokko avec le jeton du cookie. */
async function forward(req: NextRequest, path: string[]) {
  const target = `/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const method = req.method;
  const bodyText =
    method === 'GET' || method === 'HEAD' ? '' : await req.text();
  const res = await apiFetch(target, {
    method,
    headers: bodyText ? { 'content-type': 'application/json' } : {},
    body: bodyText || undefined,
  });
  const text = await res.text();
  const headers: Record<string, string> = {
    'content-type': res.headers.get('content-type') ?? 'application/json',
  };
  const disposition = res.headers.get('content-disposition');
  if (disposition) headers['content-disposition'] = disposition;
  return new NextResponse(text, { status: res.status, headers });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
