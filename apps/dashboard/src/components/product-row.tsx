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

export function ProductRow({ shopId, product }: { shopId: string; product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const published = product.status === 'published';

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

  return (
    <tr className="border-t border-[var(--color-border)]">
      <td className="py-2 pr-3">
        <Link
          href={`/s/${shopId}/products/${product.id}`}
          className="font-medium hover:underline"
        >
          {product.name}
        </Link>
        <div className="text-xs text-[var(--color-muted)] capitalize">
          {product.category.replace(/-/g, ' ')}
        </div>
      </td>
      <td className="py-2 pr-3 tabular-nums">
        {formatMoney(product.price.amount, product.price.currency)}
      </td>
      <td className="py-2 pr-3 tabular-nums">{product.stock}</td>
      <td className="py-2 pr-3">
        <span className={`rounded px-2 py-0.5 text-xs ${BADGE[product.status]}`}>
          {product.status}
        </span>
      </td>
      <td className="py-2 text-right whitespace-nowrap">
        <button
          onClick={toggle}
          disabled={busy}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-1 text-xs disabled:opacity-60"
        >
          {published ? 'Dépublier' : 'Publier'}
        </button>
      </td>
    </tr>
  );
}
