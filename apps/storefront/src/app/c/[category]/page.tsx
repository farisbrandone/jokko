import type { Metadata } from 'next';
import { currentShop } from '@/lib/shop';
import { searchProducts } from '@/lib/api';
import { ProductBrowser } from '@/components/product-browser';
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
  const results = await searchProducts(shop.id, { category, pageSize: 24, sort: 'newest' });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold capitalize">
        {category.replace(/-/g, ' ')}
      </h1>
      <ProductBrowser
        initial={results}
        currency={shop.currency}
        shopCategories={shop.categories ?? []}
        initialParams={{ category, sort: 'newest' }}
      />
    </div>
  );
}
