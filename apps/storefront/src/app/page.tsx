import { currentShop } from '@/lib/shop';
import { searchProducts } from '@/lib/api';
import { ProductGrid } from '@/components/product-grid';
import { Facets } from '@/components/facets';
import { ShopUnavailable } from '@/components/shop-unavailable';

export const revalidate = 60;

export default async function HomePage() {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;

  const results = await searchProducts(shop.id, { sort: 'newest', pageSize: 24 });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-soft)] px-5 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {shop.name}
        </h1>
        <p className="mt-1 text-[var(--color-muted)]">
          Toute la gamme, en un lien. {results.total} produit
          {results.total > 1 ? 's' : ''} disponibles.
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
