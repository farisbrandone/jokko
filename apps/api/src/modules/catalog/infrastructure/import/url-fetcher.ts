import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { BadRequestException } from '@nestjs/common';
import type { DraftProduct } from '@jokko/contracts';

const MAX_BYTES = 2_000_000;

/** Rejette les adresses privées / locales (anti-SSRF). */
function isBlockedAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const v = ip.toLowerCase();
  return (
    v === '::1' ||
    v === '::' ||
    v.startsWith('fc') ||
    v.startsWith('fd') || // ULA
    v.startsWith('fe80') || // link-local
    v.startsWith('::ffff:127.') ||
    v.startsWith('::ffff:10.') ||
    v.startsWith('::ffff:192.168.')
  );
}

async function safeFetchHtml(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL invalide');
  }
  if (url.protocol !== 'https:') throw new BadRequestException('Une URL https est requise');

  const { address } = await lookup(url.hostname).catch(() => {
    throw new BadRequestException('Nom de domaine introuvable');
  });
  if (isBlockedAddress(address)) throw new BadRequestException('Hôte non autorisé');

  const res = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
    headers: { 'user-agent': 'JokkoImporter/1.0 (+https://jokko.shop)', accept: 'text/html' },
  }).catch((e: Error) => {
    if (e.name === 'TimeoutError') throw new BadRequestException('La page a mis trop de temps à répondre');
    throw new BadRequestException('Page inaccessible');
  });
  if (!res.ok) throw new BadRequestException(`La page a répondu ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function firstMeta(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = re.exec(html) ?? new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    'i',
  ).exec(html);
  return m ? decodeEntities(m[1]) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string };
  offers?: { price?: string | number; priceCurrency?: string } | Array<{ price?: string | number; priceCurrency?: string }>;
}

function findJsonLdProduct(html: string): JsonLdProduct | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    const candidates: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && '@graph' in parsed
        ? ((parsed as { '@graph': unknown[] })['@graph'] ?? [])
        : [parsed];
    for (const c of candidates) {
      if (c && typeof c === 'object') {
        const type = (c as { '@type'?: string | string[] })['@type'];
        const isProduct = Array.isArray(type) ? type.includes('Product') : type === 'Product';
        if (isProduct) return c as JsonLdProduct;
      }
    }
  }
  return null;
}

function toImages(image: JsonLdProduct['image'], ogImage: string | null): string[] {
  const out: string[] = [];
  if (typeof image === 'string') out.push(image);
  else if (Array.isArray(image)) out.push(...image.filter((x): x is string => typeof x === 'string'));
  else if (image && typeof image === 'object' && typeof image.url === 'string') out.push(image.url);
  if (ogImage) out.push(ogImage);
  return [...new Set(out.filter((u) => /^https:\/\//.test(u)))].slice(0, 6);
}

function toAmount(price: string | number | undefined): number {
  if (price == null) return 0;
  const n = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Extrait une ébauche de produit d'un HTML (JSON-LD `Product` prioritaire, sinon OG). */
export function parseProductPage(html: string, currency: string): DraftProduct {
  const ld = findJsonLdProduct(html);
  const offer = Array.isArray(ld?.offers) ? ld?.offers[0] : ld?.offers;

  const name = ld?.name || firstMeta(html, 'og:title') || '';
  const description =
    (ld?.description || firstMeta(html, 'og:description') || firstMeta(html, 'description') || '').slice(
      0,
      5000,
    );
  const ogImage = firstMeta(html, 'og:image');
  const images = toImages(ld?.image, ogImage);
  const priceAmount = toAmount(offer?.price) || toAmount(firstMeta(html, 'product:price:amount') ?? undefined);
  const cur =
    offer?.priceCurrency || firstMeta(html, 'product:price:currency') || currency;

  if (!name) throw new BadRequestException("Impossible d'extraire un produit de cette page");

  return {
    name: name.slice(0, 140),
    description,
    category: 'Import',
    priceAmount,
    currency: cur.slice(0, 3).toUpperCase(),
    stock: 0,
    images,
  };
}

/**
 * Récupère une page produit (anti-SSRF) et en extrait une ébauche. Aucun appel
 * d'API fournisseur payante.
 */
export async function fetchDraftFromUrl(rawUrl: string, currency: string): Promise<DraftProduct> {
  const html = await safeFetchHtml(rawUrl);
  return parseProductPage(html, currency);
}
