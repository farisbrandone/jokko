import type { Metadata } from 'next';
import { currentShop } from '@/lib/shop';
import { searchProducts } from '@/lib/api';
import { ProductGrid } from '@/components/product-grid';
import { Facets } from '@/components/facets';
import { ShopUnavailable } from '@/components/shop-unavailable';

export const revalidate = 60;

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const label = decodeURIComponent(category).replace(/-/g, ' ');
  return { title: label.charAt(0).toUpperCase() + label.slice(1) };
}

export default async function CategoryPage({ params }: Params) {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;

  const category = decodeURIComponent((await params).category);
  const results = await searchProducts(shop.id, { category, pageSize: 48, sort: 'newest' });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold capitalize">
        {category.replace(/-/g, ' ')}
      </h1>
      <div className="grid md:grid-cols-[180px_1fr] gap-6">
        <aside className="hidden md:block">
          <Facets basePath="/" facets={results.facets} activeCategory={category} />
        </aside>
        <ProductGrid hits={results.items} />
      </div>
    </div>
  );
}
