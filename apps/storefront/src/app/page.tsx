import { getTranslations } from 'next-intl/server';
import { currentShop } from '@/lib/shop';
import { getDirectory, searchProducts } from '@/lib/api';
import { ProductGrid } from '@/components/product-grid';
import { Facets } from '@/components/facets';
import { ShopDirectory } from '@/components/shop-directory';

export const revalidate = 60;

type Params = { searchParams: Promise<{ q?: string; vertical?: string; page?: string }> };

export default async function HomePage({ searchParams }: Params) {
  const shop = await currentShop();

  // Hors d'une boutique (domaine apex) : annuaire public des boutiques inscrites.
  if (!shop) {
    const sp = await searchParams;
    const query = { q: sp.q, vertical: sp.vertical };
    const data = await getDirectory({
      ...query,
      page: sp.page ? Number(sp.page) : undefined,
    }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24 }));
    return <ShopDirectory data={data} query={query} />;
  }

  const [results, t] = await Promise.all([
    searchProducts(shop.id, { sort: 'newest', pageSize: 24 }),
    getTranslations('home'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-soft)] px-5 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {shop.name}
        </h1>
        <p className="mt-1 text-[var(--color-muted)]">
          {t('tagline')} {t('productsAvailable', { count: results.total })}
        </p>
      </section>

      <div className="grid md:grid-cols-[180px_1fr] gap-6">
        <aside className="hidden md:block">
          <Facets basePath="/" facets={results.facets} />
        </aside>
        <ProductGrid hits={results.items} />
      </div>
    </div>
  );
}
