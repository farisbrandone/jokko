import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { currentShop, siteUrl } from '@/lib/shop';
import { getDirectory, searchProducts } from '@/lib/api';
import { landingContent } from '@/lib/landing-content';
import { ProductBrowser } from '@/components/product-browser';
import { ShopHero } from '@/components/shop-hero';
import { LandingPage } from '@/components/landing/landing-page';
import type { AppLocale } from '@/i18n/request';

export const revalidate = 60;

type Params = { searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const shop = await currentShop();
  if (shop) return {}; // la home de boutique hérite des métadonnées du layout

  const [base, locale] = await Promise.all([siteUrl(), getLocale()]);
  const c = landingContent(locale as AppLocale);
  return {
    title: c.meta.title,
    description: c.meta.description,
    keywords: c.meta.keywords,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: 'Jokko',
      title: c.meta.title,
      description: c.meta.description,
      url: base,
      locale: locale.replace('-', '_'),
    },
    twitter: { card: 'summary_large_image', title: c.meta.title, description: c.meta.description },
  };
}

export default async function HomePage({ searchParams }: Params) {
  const shop = await currentShop();

  // Domaine apex : page d'accueil marketing + aperçu de l'annuaire.
  if (!shop) {
    const [base, locale, directory] = await Promise.all([
      siteUrl(),
      getLocale(),
      getDirectory({ page: 1 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24 })),
    ]);
    return <LandingPage locale={locale as AppLocale} apex={base} featured={directory.items} />;
  }

  const sp = await searchParams;
  const params = {
    q: sp.q,
    category: sp.category,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    inStock: sp.inStock,
    sort: sp.sort ?? 'newest',
  };
  const results = await searchProducts(shop.id, { ...params, pageSize: 24 });

  return (
    <div className="flex flex-col gap-6">
      <ShopHero shop={shop} productCount={results.total} />

      <ProductBrowser
        initial={results}
        currency={shop.currency}
        shopCategories={shop.categories ?? []}
        preset={shop.themePreset}
        initialParams={{
          q: sp.q,
          category: sp.category,
          minPrice: sp.minPrice,
          maxPrice: sp.maxPrice,
          inStock: sp.inStock === 'true',
          sort: sp.sort ?? 'newest',
        }}
      />
    </div>
  );
}
