'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Order, OrderList } from '@jokko/contracts';
import { Badge, Button, formatMoney } from '@jokko/ui';
import { bffGet, bffSend } from '@/lib/bff';

const TABS: { key: string; label: string }[] = [
  { key: 'to_deliver', label: 'À livrer' },
  { key: 'paid', label: 'À expédier' },
  { key: 'fulfilled', label: 'Terminées' },
  { key: 'pending_payment', label: 'En attente' },
  { key: 'canceled', label: 'Annulées' },
];

const STATUS_TONE: Record<string, 'good' | 'brand' | 'neutral' | 'danger'> = {
  to_deliver: 'brand',
  paid: 'brand',
  fulfilled: 'good',
  pending_payment: 'neutral',
  canceled: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  to_deliver: 'à livrer',
  paid: 'à expédier',
  fulfilled: 'terminée',
  pending_payment: 'en attente',
  canceled: 'annulée',
};

export function OrdersBoard({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('to_deliver');
  const base = `/api/proxy/shops/${shopId}/orders`;

  const list = useQuery({
    queryKey: ['orders', shopId, status],
    queryFn: () => bffGet<OrderList>(`${base}?status=${status}`),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'fulfill' | 'cancel' }) =>
      bffSend(`${base}/${id}/${action}`, 'POST'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', shopId] }),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 text-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatus(tab.key)}
            className={`rounded-[var(--radius-btn)] px-3 py-1 ${
              status === tab.key
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ))}
        </div>
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Aucune commande.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.data!.items.map((o: Order) => (
            <li
              key={o.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{o.buyerName}</span>
                <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                {o.buyerPhone}
                {o.buyerEmail ? ` · ${o.buyerEmail}` : ''} ·{' '}
                {new Date(o.createdAt).toLocaleDateString('fr')}
              </p>

              <ul className="mt-2 text-sm">
                {o.lines.map((l) => (
                  <li key={l.productId}>
                    {l.qty} × {l.name} — {formatMoney(l.unitAmount * l.qty, o.currency)}
                  </li>
                ))}
              </ul>

              <div className="mt-2 rounded-[var(--radius-btn)] bg-[var(--color-surface-2)] p-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">
                    {o.deliveryZoneLabel ? `Livraison — ${o.deliveryZoneLabel}` : 'Retrait en boutique'}
                  </span>
                  <span>{o.deliveryFee > 0 ? formatMoney(o.deliveryFee, o.currency) : '—'}</span>
                </div>
                <div className="mt-1 flex justify-between font-semibold">
                  <span>
                    {o.paymentMethod === 'cash_on_delivery'
                      ? 'À encaisser à la livraison'
                      : 'Total payé'}
                  </span>
                  <span>{formatMoney(o.total, o.currency)}</span>
                </div>
                {o.deliveryAddress ? (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{o.deliveryAddress}</p>
                ) : null}
              </div>

              {o.note ? (
                <p className="mt-1 text-sm italic text-[var(--color-muted)]">« {o.note} »</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {o.status === 'paid' || o.status === 'to_deliver' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => act.mutate({ id: o.id, action: 'fulfill' })}
                      disabled={act.isPending}
                    >
                      {o.status === 'to_deliver' ? 'Marquer livrée' : 'Marquer expédiée'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => act.mutate({ id: o.id, action: 'cancel' })}
                      disabled={act.isPending}
                    >
                      Annuler
                    </Button>
                  </>
                ) : null}
                <a
                  href={`/s/${shopId}/orders/${o.id}/document`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-1 text-xs hover:bg-[var(--color-surface-2)]"
                >
                  Facture / Bon
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
