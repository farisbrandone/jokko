'use client';

import { useEffect, useState } from 'react';
import type { Dispute, DisputeReason } from '@jokko/contracts';

const REASON_LABEL: Record<DisputeReason, string> = {
  not_received: 'Commande non reçue',
  not_as_described: 'Non conforme à la description',
  damaged: 'Article endommagé',
  wrong_item: 'Mauvais article reçu',
  other: 'Autre problème',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Ouvert — en attente du vendeur',
  seller_responded: 'Réponse du vendeur reçue',
  resolved: 'Résolu par le vendeur',
  escalated: 'Transmis à la médiation Jokko',
  closed: 'Clos par Jokko',
};

const RESOLUTION_LABEL: Record<string, string> = {
  refund: 'Remboursement',
  replacement: 'Remplacement',
  rejected: 'Demande refusée',
};

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm';

export function DisputeSection({ orderId, canOpen }: { orderId: string; canOpen: boolean }) {
  const [dispute, setDispute] = useState<Dispute | null | undefined>(undefined); // undefined = chargement
  const [reason, setReason] = useState<DisputeReason>('not_received');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/buyer/orders/${orderId}/dispute`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setDispute)
      .catch(() => setDispute(null));
  };

  useEffect(load, [orderId]);

  const open = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/buyer/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Envoi impossible');
      setDispute(data);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const escalate = async () => {
    if (!dispute) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/buyer/disputes/${dispute.id}/escalate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Envoi impossible');
      setDispute(data);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (dispute === undefined) return null;

  if (dispute === null) {
    if (!canOpen) return null;
    return (
      <div className="mt-6 border-t border-[var(--color-border)] pt-4">
        <h2 className="font-medium">Un problème avec cette commande ?</h2>
        <form onSubmit={open} className="mt-2 flex flex-col gap-2">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as DisputeReason)}
            className={field}
          >
            {Object.entries(REASON_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            required
            rows={3}
            minLength={10}
            placeholder="Décrivez le problème (10 caractères minimum)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={field}
          />
          {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
          <button
            type="submit"
            disabled={busy || description.trim().length < 10}
            className="w-fit rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? '…' : 'Signaler le problème'}
          </button>
        </form>
      </div>
    );
  }

  const canEscalate = dispute.status === 'open' || dispute.status === 'seller_responded';

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-sm">
      <h2 className="font-medium">Litige — {REASON_LABEL[dispute.reason]}</h2>
      <p className="mt-1 rounded-full inline-block bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
        {STATUS_LABEL[dispute.status] ?? dispute.status}
      </p>
      <p className="mt-2 text-[var(--color-muted)]">{dispute.description}</p>
      {dispute.sellerResponse ? (
        <p className="mt-2">
          <strong>Réponse du vendeur :</strong> {dispute.sellerResponse}
        </p>
      ) : null}
      {dispute.resolution ? (
        <p className="mt-2 text-[var(--color-good)]">
          Décision : {RESOLUTION_LABEL[dispute.resolution] ?? dispute.resolution}
          {dispute.resolutionNote ? ` — ${dispute.resolutionNote}` : ''}
          {dispute.adminNote ? ` — ${dispute.adminNote}` : ''}
        </p>
      ) : null}
      {err ? <p className="mt-2 text-[var(--color-danger)]">{err}</p> : null}
      {canEscalate ? (
        <button
          type="button"
          onClick={escalate}
          disabled={busy}
          className="mt-3 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? '…' : 'Transmettre à Jokko pour médiation'}
        </button>
      ) : null}
    </div>
  );
}
