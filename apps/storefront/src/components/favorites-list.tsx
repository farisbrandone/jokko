'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@jokko/ui';
import type { ProductView } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { FavoriteButton } from './favorite-button';

export function FavoritesList() {
  const t = useTranslations('favorites');
  const tp = useTranslations('product');
  const ids = useFavorites();
  const [items, setItems] = useState<ProductView[] | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setItems(null);
    fetch('/api/favorites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (items === null) {
    return <p className="py-16 text-center text-[var(--color-muted)]">{t('loading')}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-muted)]">{t('empty')}</p>
        <Link href="/" className="mt-2 inline-block text-[var(--color-brand)] underline">
          {t('emptyCta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => {
        const hasPromo = p.compareAtPrice != null && p.compareAtPrice.amount > p.price.amount;
        return (
          <Link
            key={p.id}
            href={`/p/${p.slug}`}
            className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <div className="relative aspect-square bg-[var(--color-surface-2)]">
              {p.images[0] ? (
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="(max-width:640px) 50vw, 25vw"
                  className="object-cover transition-transform group-hover:scale-[1.03]"
                />
              ) : null}
              {p.stock <= 0 ? (
                <span className="absolute left-2 top-2 rounded bg-[var(--color-ink)]/80 px-2 py-0.5 text-xs text-white">
                  {tp('outOfStock')}
                </span>
              ) : null}
              <FavoriteButton productId={p.id} />
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">{formatMoney(p.price.amount, p.price.currency)}</span>
                {hasPromo ? (
                  <span className="ml-2 text-[var(--color-faint)] line-through">
                    {formatMoney(p.compareAtPrice!.amount, p.price.currency)}
                  </span>
                ) : null}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
