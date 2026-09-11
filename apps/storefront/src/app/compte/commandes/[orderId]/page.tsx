import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatMoney } from '@jokko/ui';
import type { BuyerOrder } from '@jokko/contracts';
import { buyerJson } from '@/lib/buyer-api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false } };

const LABELS: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  to_deliver: 'À livrer',
  paid: 'Payée — à expédier',
  fulfilled: 'Terminée',
  canceled: 'Annulée',
};

type Props = { params: Promise<{ orderId: string }> };

export default async function BuyerOrderPage({ params }: Props) {
  const { orderId } = await params;
  const order = await buyerJson<BuyerOrder>(`/buyer/orders/${orderId}`);
  if (!order) notFound();

  const cod = order.paymentMethod === 'cash_on_delivery';

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/compte" className="text-sm text-[var(--color-muted)]">
        ← Mon compte
      </Link>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">
        Commande chez {order.shopName}
      </h1>
      <p className="mt-1 text-sm">
        Statut : <strong>{LABELS[order.status] ?? order.status}</strong>
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {order.lines.map((l) => (
          <li key={l.productId + (l.variantId ?? '')} className="flex justify-between text-sm">
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
        {order.discountAmount > 0 ? (
          <div className="mt-1 flex justify-between text-[var(--color-good)]">
            <span>Remise{order.discountCode ? ` (${order.discountCode})` : ''}</span>
            <span>− {formatMoney(order.discountAmount, order.currency)}</span>
          </div>
        ) : null}
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
        <p className="mt-3 text-sm text-[var(--color-muted)]">Adresse : {order.deliveryAddress}</p>
      ) : null}
    </div>
  );
}
