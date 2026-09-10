import type { DirectoryResult, ProductSearchResult, PublicReviews } from '@jokko/contracts';

const BASE = process.env.JOKKO_API_URL ?? 'http://localhost:3333/api';

export interface ShopView {
  id: string;
  slug: string;
  name: string;
  verticals: string[];
  whatsapp: string | null;
  themePreset: string;
  brandColor: string | null;
  locale: string;
  currency: string;
  customDomain: string | null;
  categories: string[];
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  announcement: string | null;
  status: string;
}

export interface ProductView {
  id: string;
  shopId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: { amount: number; currency: string };
  compareAtPrice: { amount: number; currency: string } | null;
  stock: number;
  images: string[];
  attributes: Record<string, string | number | boolean | string[]>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function apiGet<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
  if (!res.ok) {
    const err = new Error(`API ${path} -> ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export function getShopBySlug(slug: string): Promise<ShopView> {
  return apiGet<ShopView>(`/shops/${encodeURIComponent(slug)}`, 120);
}

export function searchProducts(
  shopId: string,
  params: Record<string, string | number | undefined>,
): Promise<ProductSearchResult> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  return apiGet<ProductSearchResult>(`/shops/${shopId}/search?${qs.toString()}`, 30);
}

export function getProduct(shopId: string, idOrSlug: string): Promise<ProductView> {
  return apiGet<ProductView>(
    `/shops/${shopId}/products/${encodeURIComponent(idOrSlug)}`,
    60,
  );
}

export function getReviews(shopId: string, productId: string): Promise<PublicReviews> {
  return apiGet<PublicReviews>(`/shops/${shopId}/products/${productId}/reviews`, 60);
}

export function getDirectory(
  params: { q?: string; vertical?: string; page?: number } = {},
): Promise<DirectoryResult> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const suffix = qs.toString();
  return apiGet<DirectoryResult>(`/directory${suffix ? `?${suffix}` : ''}`, 120);
}

export const apiBase = BASE;
