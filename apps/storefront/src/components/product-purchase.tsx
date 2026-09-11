'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@jokko/ui';
import { AddToCart } from './add-to-cart';
import { QuickOrder } from './quick-order';
import { PriceEstimate } from './price-estimate';

type Variant = { id?: string; label: string; priceAmount?: number | null; stock: number };

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    priceAmount: number;
    compareAtAmount: number | null;
    currency: string;
    image: string | null;
    stock: number;
    category: string;
    variants: Variant[];
  };
  shopName: string;
  whatsapp: string | null;
  productUrl: string;
  siteUrl: string;
}

export function ProductPurchase({ product, shopName, whatsapp, productUrl, siteUrl }: Props) {
  const t = useTranslations('product');
  const hasVariants = product.variants.length > 0;
  const [variantId, setVariantId] = useState<string>(
    hasVariants ? (product.variants[0]?.id ?? '') : '',
  );
  const selected = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? null,
    [product.variants, variantId],
  );

  const unitAmount =
    hasVariants && selected
      ? (selected.priceAmount ?? product.priceAmount)
      : product.priceAmount;
  const stock = hasVariants ? (selected?.stock ?? 0) : product.stock;
  const hasPromo = product.compareAtAmount != null && product.compareAtAmount > unitAmount;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xl">
        <span className="font-semibold">{formatMoney(unitAmount, product.currency)}</span>
        {hasPromo ? (
          <span className="ml-2 text-[var(--color-faint)] line-through">
            {formatMoney(product.compareAtAmount as number, product.currency)}
          </span>
        ) : null}
        <PriceEstimate amount={unitAmount} currency={product.currency} className="text-sm text-[var(--color-faint)]" />
      </p>

      {hasVariants ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Déclinaison</span>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            {product.variants.map((v) => (
              <option key={v.id ?? v.label} value={v.id} disabled={v.stock <= 0}>
                {v.label}
                {v.priceAmount != null ? ` — ${formatMoney(v.priceAmount, product.currency)}` : ''}
                {v.stock <= 0 ? ' (épuisé)' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">
        {stock > 0 ? t('inStock') : t('outOfStock')} · {product.category}
      </p>

      <AddToCart
        item={{
          productId: product.id,
          variantId: hasVariants ? (selected?.id ?? null) : null,
          variantLabel: hasVariants ? (selected?.label ?? null) : null,
          slug: product.slug,
          name: product.name,
          unitAmount,
          currency: product.currency,
          image: product.image,
        }}
        stock={stock}
      />

      <QuickOrder
        shopName={shopName}
        whatsapp={whatsapp}
        productId={product.id}
        productName={
          hasVariants && selected ? `${product.name} — ${selected.label}` : product.name
        }
        productUrl={productUrl}
        unitAmount={unitAmount}
        currency={product.currency}
        stock={stock}
        siteUrl={siteUrl}
      />
    </div>
  );
}
