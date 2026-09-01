import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { formatMoney } from '@jokko/ui';
import { currentShop, siteUrl } from '@/lib/shop';
import { getProduct, type ProductView } from '@/lib/api';
import { ContactBar } from '@/components/contact-bar';
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

  return (
    <article className="grid md:grid-cols-2 gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TrackOnMount name="product_view" props={{ slug: product.slug, name: product.name }} />

      <div className="flex flex-col gap-3">
        <div className="relative aspect-square rounded-[var(--radius-card)] overflow-hidden bg-[var(--color-surface-2)]">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              priority
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : null}
        </div>
        {product.images.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(1, 5).map((src) => (
              <div
                key={src}
                className="relative aspect-square rounded-md overflow-hidden bg-[var(--color-surface-2)]"
              >
                <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

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
          {product.stock > 0 ? 'En stock' : 'Rupture de stock'} · {product.category}
        </p>
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
  );
}
