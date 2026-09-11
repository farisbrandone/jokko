'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cart, type CartItem } from '@/lib/cart';
import { track } from '@/lib/track';

export function AddToCart({ item, stock }: { item: Omit<CartItem, 'qty'>; stock: number }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (stock <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-[var(--radius-btn)] border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="px-3 py-2 text-sm"
          aria-label="Moins"
        >
          −
        </button>
        <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(stock, q + 1))}
          className="px-3 py-2 text-sm"
          aria-label="Plus"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          cart.add(item, qty);
          setAdded(true);
          track('add_to_cart', { productId: item.productId, qty });
        }}
        className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)]"
      >
        Ajouter au panier
      </button>
      {added ? (
        <Link href="/panier" className="text-sm text-[var(--color-brand)] underline">
          Voir le panier
        </Link>
      ) : null}
    </div>
  );
}
