import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { currentShop, siteUrl } from '@/lib/shop';
import { getProduct, getReviews, searchProducts, type ProductView } from '@/lib/api';
import { ProductGallery } from '@/components/product-gallery';
import { ProductPurchase } from '@/components/product-purchase';
import { ContactBar } from '@/components/contact-bar';
import { ProductReviews } from '@/components/product-reviews';
import { ProductCard } from '@/components/product-card';
import { FavoriteButton } from '@/components/favorite-button';
import { ReportButton } from '@/components/report-button';
import { TrackOnMount } from '@/components/track-event';
import { ShopUnavailable } from '@/components/shop-unavailable';

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<{ shop: NonNullable<Awaited<ReturnType<typeof currentShop>>>; product: ProductView } | null> {
  const shop = await currentShop();
  if (!shop) return null;
  try {
    const product = await getProduct(shop.id, slug);
    return { shop, product };
  } catch {
    return { shop, product: null as unknown as ProductView };
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data?.product) return { title: 'Produit' };
  const { shop, product } = data;
  const path = `/p/${product.slug}`;
  const desc = product.description.slice(0, 160) || `${product.name} chez ${shop.name}`;
  // Le visuel de partage est fourni par `opengraph-image.tsx` (carte générée).
  return {
    title: product.name,
    description: desc,
    alternates: { canonical: path },
    openGraph: { title: product.name, description: desc, url: path, type: 'website' },
    twitter: { card: 'summary_large_image', title: product.name, description: desc },
  };
}

export default async function ProductPage({ params }: Params) {
  const data = await load((await params).slug);
  if (!data) return <ShopUnavailable />;
  const { shop, product } = data;
  if (!product) notFound();

  const base = await siteUrl();
  const url = `${base}/p/${product.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    category: product.category,
    offers: {
      '@type': 'Offer',
      priceCurrency: product.price.currency,
      price: product.price.amount,
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
      seller: { '@type': 'Organization', name: shop.name },
    },
  };

  const reviews = await getReviews(shop.id, product.id).catch(() => ({
    summary: { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] as [number, number, number, number, number] },
    items: [],
  }));

  const related = await searchProducts(shop.id, { category: product.category, pageSize: 5 })
    .then((r) => r.items.filter((h) => h.id !== product.id).slice(0, 4))
    .catch(() => []);
  const t = await getTranslations('product');
  if (reviews.summary.count > 0) {
    (jsonLd as Record<string, unknown>).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviews.summary.average,
      reviewCount: reviews.summary.count,
    };
  }

  return (
    <>
    <article className="grid md:grid-cols-2 gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TrackOnMount name="product_view" props={{ slug: product.slug, name: product.name }} />

      <ProductGallery images={product.images} alt={product.name} />

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-[var(--color-heading)] text-2xl font-bold">
            {product.name}
          </h1>
          <FavoriteButton productId={product.id} variant="inline" />
        </div>

        <ProductPurchase
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            priceAmount: product.price.amount,
            compareAtAmount: product.compareAtPrice?.amount ?? null,
            currency: product.price.currency,
            image: product.images[0] ?? null,
            stock: product.stock,
            category: product.category,
            variants: product.variants ?? [],
          }}
          shopName={shop.name}
          whatsapp={shop.whatsapp}
          productUrl={url}
          siteUrl={base}
        />

        <p className="whitespace-pre-line leading-relaxed">{product.description}</p>

        <ContactBar
          shopName={shop.name}
          whatsapp={shop.whatsapp}
          productId={product.id}
          productName={product.name}
          productUrl={url}
        />

        <div className="pt-1">
          <ReportButton targetType="product" targetId={product.id} />
        </div>
      </div>
    </article>
    <ProductReviews productId={product.id} initial={reviews} />
    {related.length > 0 ? (
      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          {t('related')}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {related.map((hit) => (
            <ProductCard key={hit.id} hit={hit} />
          ))}
        </div>
      </section>
    ) : null}
    </>
  );
}
