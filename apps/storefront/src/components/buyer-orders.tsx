'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@jokko/ui';
import type { BuyerOrder } from '@jokko/contracts';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  to_deliver: 'À livrer',
  paid: 'Payée',
  fulfilled: 'Terminée',
  canceled: 'Annulée',
};

export function BuyerOrders() {
  const t = useTranslations('account');
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null);

  useEffect(() => {
    fetch('/api/buyer/orders')
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  if (orders === null) return <p className="text-sm text-[var(--color-muted)]">…</p>;
  if (orders.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">{t('ordersEmpty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/compte/commandes/${o.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 text-sm hover:bg-[var(--color-surface-2)]"
          >
            <span className="font-medium">{t('orderAt', { shop: o.shopName })}</span>
            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-[var(--color-muted)]">
              {STATUS_LABEL[o.status] ?? o.status}
            </span>
            <span className="ml-auto tabular-nums">{formatMoney(o.total, o.currency)}</span>
            <span className="w-full text-xs text-[var(--color-faint)] sm:w-auto">
              {new Date(o.createdAt).toLocaleDateString('fr', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
