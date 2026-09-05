import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { formatMoney } from '@jokko/ui';
import { currentShop, siteUrl } from '@/lib/shop';
import { getProduct, getReviews, type ProductView } from '@/lib/api';
import { AddToCart } from '@/components/add-to-cart';
import { ProductGallery } from '@/components/product-gallery';
import { ContactBar } from '@/components/contact-bar';
import { ProductReviews } from '@/components/product-reviews';
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

  const t = await getTranslations('product');
  const url = `${await siteUrl()}/p/${product.slug}`;

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

  const hasPromo =
    product.compareAtPrice && product.compareAtPrice.amount > product.price.amount;

  const reviews = await getReviews(shop.id, product.id).catch(() => ({
    summary: { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] as [number, number, number, number, number] },
    items: [],
  }));
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
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {product.name}
        </h1>
        <p className="text-xl">
          <span className="font-semibold">
            {formatMoney(product.price.amount, product.price.currency)}
          </span>
          {hasPromo ? (
            <span className="ml-2 text-[var(--color-faint)] line-through">
              {formatMoney(product.compareAtPrice!.amount, product.compareAtPrice!.currency)}
            </span>
          ) : null}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {product.stock > 0 ? t('inStock') : t('outOfStock')} · {product.category}
        </p>
        <p className="whitespace-pre-line leading-relaxed">{product.description}</p>

        <AddToCart
          item={{
            productId: product.id,
            slug: product.slug,
            name: product.name,
            unitAmount: product.price.amount,
            currency: product.price.currency,
            image: product.images[0] ?? null,
          }}
          stock={product.stock}
        />

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
    </>
  );
}
