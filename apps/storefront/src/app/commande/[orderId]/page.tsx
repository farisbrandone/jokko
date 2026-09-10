'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@jokko/ui';
import type { Order } from '@jokko/contracts';
import { recallOrder } from '@/lib/cart';

const LABELS: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  to_deliver: 'À livrer',
  paid: 'Payée — à expédier',
  fulfilled: 'Terminée',
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

  const cod = order.paymentMethod === 'cash_on_delivery';

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

      <div className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-muted)]">Sous-total</span>
          <span>{formatMoney(order.subtotal, order.currency)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[var(--color-muted)]">
            {order.deliveryZoneLabel ? `Livraison — ${order.deliveryZoneLabel}` : 'Retrait en boutique'}
          </span>
          <span>{order.deliveryFee > 0 ? formatMoney(order.deliveryFee, order.currency) : 'Gratuit'}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 text-base font-semibold">
          <span>{cod ? 'À régler à la livraison' : 'Total'}</span>
          <span>{formatMoney(order.total, order.currency)}</span>
        </div>
      </div>

      {order.deliveryAddress ? (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Adresse : {order.deliveryAddress}
        </p>
      ) : null}

      {order.status === 'pending_payment' ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Le paiement n&apos;a pas encore été confirmé. Cette page se mettra à jour.
        </p>
      ) : null}
      {order.status === 'to_deliver' ? (
        <p className="mt-4 text-sm text-[var(--color-good)]">
          Commande enregistrée. Le vendeur vous contacte pour la livraison ; vous
          réglerez {formatMoney(order.total, order.currency)} à la réception.
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
