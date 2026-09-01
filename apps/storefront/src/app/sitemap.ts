import type { MetadataRoute } from 'next';
import { currentShop, siteUrl } from '@/lib/shop';
import { searchProducts } from '@/lib/api';

export const revalidate = 3600;

/** Plan du site propre à la boutique du sous-domaine courant. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const shop = await currentShop();
  if (!shop) return [{ url: base, lastModified: new Date() }];

  const slugs: string[] = [];
  try {
    for (let page = 1; page <= 6; page++) {
      const res = await searchProducts(shop.id, { pageSize: 60, page, sort: 'newest' });
      slugs.push(...res.items.map((p) => p.slug));
      if (res.items.length < 60) break;
    }
  } catch {
    /* API indisponible : sitemap réduit aux pages statiques */
  }

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/search`, changeFrequency: 'weekly', priority: 0.5 },
    ...slugs.map((slug) => ({
      url: `${base}/p/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
