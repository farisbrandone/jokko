'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@jokko/ui';
import { post } from '@/lib/client';
import type { Product } from '@/lib/types';

const BADGE: Record<Product['status'], string> = {
  draft: 'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
  published: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
  archived: 'bg-[var(--color-surface-2)] text-[var(--color-faint)]',
};

export function ProductRow({
  shopId,
  product,
  variant = 'row',
  lowStockThreshold = 3,
}: {
  shopId: string;
  product: Product;
  variant?: 'row' | 'card';
  lowStockThreshold?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const published = product.status === 'published';

  const stockUnits =
    product.variants && product.variants.length > 0
      ? product.variants.map((v) => v.stock)
      : [product.stock];
  const stockState: 'out' | 'low' | 'ok' = stockUnits.every((n) => n <= 0)
    ? 'out'
    : stockUnits.some((n) => n > 0 && n <= lowStockThreshold)
      ? 'low'
      : 'ok';
  const stockBadge =
    stockState === 'out' ? (
      <span className="rounded bg-[var(--color-danger)]/15 px-2 py-0.5 text-xs text-[var(--color-danger)]">
        rupture
      </span>
    ) : stockState === 'low' ? (
      <span className="rounded bg-[var(--color-danger)]/12 px-2 py-0.5 text-xs text-[var(--color-danger)]">
        stock bas
      </span>
    ) : null;

  const toggle = async () => {
    setBusy(true);
    try {
      await post(
        `/api/proxy/shops/${shopId}/products/${product.id}/${published ? 'unpublish' : 'publish'}`,
      );
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const badge = (
    <span className={`rounded px-2 py-0.5 text-xs ${BADGE[product.status]}`}>{product.status}</span>
  );
  const toggleBtn = (
    <button
      onClick={toggle}
      disabled={busy}
      className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-1 text-xs disabled:opacity-60"
    >
      {published ? 'Dépublier' : 'Publier'}
    </button>
  );

  if (variant === 'card') {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/s/${shopId}/products/${product.id}`}
            className="font-medium hover:underline"
          >
            {product.name}
          </Link>
          <div className="flex shrink-0 gap-1">
            {stockBadge}
            {badge}
          </div>
        </div>
        <div className="mt-1 text-xs capitalize text-[var(--color-muted)]">
          {product.category.replace(/-/g, ' ')}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm tabular-nums">
            {formatMoney(product.price.amount, product.price.currency)}
            <span className="ml-2 text-xs text-[var(--color-muted)]">stock {product.stock}</span>
          </span>
          {toggleBtn}
        </div>
      </div>
    );
  }

  return (
    <tr className="border-t border-[var(--color-border)]">
      <td className="px-3 py-2">
        <Link
          href={`/s/${shopId}/products/${product.id}`}
          className="font-medium hover:underline"
        >
          {product.name}
        </Link>
        <div className="text-xs capitalize text-[var(--color-muted)]">
          {product.category.replace(/-/g, ' ')}
        </div>
      </td>
      <td className="py-2 pr-3 tabular-nums">
        {formatMoney(product.price.amount, product.price.currency)}
      </td>
      <td className="py-2 pr-3 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          {product.stock}
          {stockBadge}
        </span>
      </td>
      <td className="py-2 pr-3">{badge}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right">{toggleBtn}</td>
    </tr>
  );
}
