import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { currentShop, siteUrl } from '@/lib/shop';
import { getDirectory } from '@/lib/api';
import { landingContent } from '@/lib/landing-content';
import { ShopDirectory } from '@/components/shop-directory';
import type { AppLocale } from '@/i18n/request';

export const revalidate = 60;

type Params = { searchParams: Promise<{ q?: string; vertical?: string; page?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const shop = await currentShop();
  if (shop) return {};
  const [base, locale] = await Promise.all([siteUrl(), getLocale()]);
  const c = landingContent(locale as AppLocale);
  const title = `${c.featured.title} · Jokko`;
  return {
    title,
    description: c.featured.subtitle,
    alternates: { canonical: '/boutiques' },
    openGraph: { type: 'website', siteName: 'Jokko', title, description: c.featured.subtitle, url: `${base}/boutiques` },
  };
}

export default async function BoutiquesPage({ searchParams }: Params) {
  const sp = await searchParams;
  const query = { q: sp.q, vertical: sp.vertical };
  const data = await getDirectory({
    ...query,
    page: sp.page ? Number(sp.page) : undefined,
  }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24 }));

  return <ShopDirectory data={data} query={query} />;
}
