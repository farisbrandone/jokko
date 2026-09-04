'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@jokko/ui';
import type { Order } from '@jokko/contracts';
import { recallOrder } from '@/lib/cart';

const LABELS: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  paid: 'Payée',
  fulfilled: 'Expédiée',
  canceled: 'Annulée',
};

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = recallOrder();
    const token = pending?.orderId === orderId ? pending.buyerToken : null;
    if (!token) {
      setError('Cette commande ne peut pas être affichée sur cet appareil.');
      return;
    }
    fetch(`/api/orders/track?orderId=${orderId}&token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('introuvable'))))
      .then(setOrder)
      .catch(() => setError('Commande introuvable.'));
  }, [orderId]);

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-muted)]">{error}</p>
        <Link href="/" className="mt-2 inline-block text-[var(--color-brand)] underline">
          Retour à la boutique
        </Link>
      </div>
    );
  }
  if (!order) return <p className="py-16 text-center text-[var(--color-muted)]">Chargement…</p>;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Votre commande</h1>
      <p className="mt-1 text-sm">
        Statut : <strong>{LABELS[order.status] ?? order.status}</strong>
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {order.lines.map((l) => (
          <li key={l.productId} className="flex justify-between text-sm">
            <span>
              {l.qty} × {l.name}
            </span>
            <span>{formatMoney(l.unitAmount * l.qty, order.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-right font-semibold">
        Total : {formatMoney(order.subtotal, order.currency)}
      </p>

      {order.status === 'pending_payment' ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Le paiement n'a pas encore été confirmé. Cette page se mettra à jour.
        </p>
      ) : null}
      {order.status === 'paid' ? (
        <p className="mt-4 text-sm text-[var(--color-good)]">
          Merci ! Le vendeur a été prévenu et vous recontactera pour la livraison.
        </p>
      ) : null}
    </div>
  );
}
