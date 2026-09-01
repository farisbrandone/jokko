import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/shop';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteUrl();
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/m/', '/api/'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
