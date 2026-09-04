'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';

export function CartButton() {
  const items = useCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  if (count === 0) return null;
  return (
    <Link
      href="/panier"
      className="relative shrink-0 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
      aria-label={`Panier (${count})`}
    >
      Panier
      <span className="ml-1 rounded-full bg-[var(--color-brand)] px-1.5 text-xs text-[var(--color-brand-ink)]">
        {count}
      </span>
    </Link>
  );
}
