'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Order, OrderList } from '@jokko/contracts';
import { Badge, Button, formatMoney } from '@jokko/ui';
import { bffGet, bffSend } from '@/lib/bff';

const TABS: { key: string; label: string }[] = [
  { key: 'paid', label: 'À expédier' },
  { key: 'fulfilled', label: 'Expédiées' },
  { key: 'pending_payment', label: 'En attente' },
  { key: 'canceled', label: 'Annulées' },
];

const STATUS_TONE: Record<string, 'good' | 'brand' | 'neutral' | 'danger'> = {
  paid: 'brand',
  fulfilled: 'good',
  pending_payment: 'neutral',
  canceled: 'danger',
};

export function OrdersBoard({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('paid');
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
        <p className="text-sm text-[var(--color-muted)]">Chargement…</p>
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Aucune commande.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.data!.items.map((o: Order) => (
            <li
              key={o.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.buyerName}</span>
                <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>{o.status}</Badge>
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
              {o.note ? (
                <p className="mt-1 text-sm italic text-[var(--color-muted)]">« {o.note} »</p>
              ) : null}
              <p className="mt-2 font-semibold">
                Total : {formatMoney(o.subtotal, o.currency)}
              </p>
              {o.status === 'paid' ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => act.mutate({ id: o.id, action: 'fulfill' })}
                    disabled={act.isPending}
                  >
                    Marquer expédiée
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => act.mutate({ id: o.id, action: 'cancel' })}
                    disabled={act.isPending}
                  >
                    Annuler
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
