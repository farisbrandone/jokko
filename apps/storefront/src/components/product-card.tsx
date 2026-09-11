import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { formatMoney } from '@jokko/ui';
import type { SearchHit } from '@jokko/contracts';
import { FavoriteButton } from './favorite-button';
import { PriceEstimate } from './price-estimate';

export async function ProductCard({ hit }: { hit: SearchHit }) {
  const t = await getTranslations('product');
  const img = hit.images[0];
  const hasPromo =
    hit.compareAtPriceAmount != null && hit.compareAtPriceAmount > hit.priceAmount;
  return (
    <Link
      href={`/p/${hit.slug}`}
      className="group block rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
    >
      <div className="relative aspect-square bg-[var(--color-surface-2)]">
        {img ? (
          <Image
            src={img}
            alt={hit.name}
            fill
            sizes="(max-width:640px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : null}
        {!hit.inStock ? (
          <span className="absolute top-2 left-2 rounded bg-[var(--color-ink)]/80 text-white text-xs px-2 py-0.5">
            {t('outOfStock')}
          </span>
        ) : null}
        <FavoriteButton productId={hit.id} />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium line-clamp-2">{hit.name}</p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">{formatMoney(hit.priceAmount, hit.currency)}</span>
          {hasPromo ? (
            <span className="ml-2 text-[var(--color-faint)] line-through">
              {formatMoney(hit.compareAtPriceAmount as number, hit.currency)}
            </span>
          ) : null}
          <PriceEstimate amount={hit.priceAmount} currency={hit.currency} className="text-xs text-[var(--color-faint)]" />
        </p>
      </div>
    </Link>
  );
}
