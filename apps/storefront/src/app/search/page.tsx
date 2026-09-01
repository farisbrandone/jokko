import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { currentShop } from '@/lib/shop';
import { searchProducts } from '@/lib/api';
import { ProductGrid } from '@/components/product-grid';
import { TrackOnMount } from '@/components/track-event';
import { ShopUnavailable } from '@/components/shop-unavailable';

export const revalidate = 0;

type Search = { searchParams: Promise<Record<string, string | undefined>> };

export function generateMetadata(): Metadata {
  return { title: 'Recherche', robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Search) {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;

  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const [results, t] = await Promise.all([
    searchProducts(shop.id, {
      q,
      category: sp.category,
      minPrice: sp.minPrice,
      maxPrice: sp.maxPrice,
      sort: sp.sort,
      pageSize: 48,
    }),
    getTranslations('search'),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {q ? <TrackOnMount name="search" props={{ term: q, results: results.total }} /> : null}
      <h1 className="text-lg">
        {q ? t('title', { query: q }) : t('count', { count: results.total })}
      </h1>
      <ProductGrid hits={results.items} />
    </div>
  );
}
