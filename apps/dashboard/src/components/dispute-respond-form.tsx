'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';
import type { Dispute, DisputeResolution } from '@/lib/types';

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';

export function DisputeRespondForm({ shopId, dispute }: { shopId: string; dispute: Dispute }) {
  const router = useRouter();
  const [response, setResponse] = useState('');
  const [resolution, setResolution] = useState<DisputeResolution | ''>('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await post(`/api/proxy/shops/${shopId}/disputes/${dispute.id}/respond`, {
        response: response.trim(),
        resolution: resolution || undefined,
        resolutionNote: resolutionNote.trim() || null,
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
      <textarea
        rows={2}
        placeholder="Votre réponse à l'acheteur"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        className={field}
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value as DisputeResolution | '')}
          className={field}
        >
          <option value="">Pas encore de résolution</option>
          <option value="refund">Remboursement</option>
          <option value="replacement">Remplacement</option>
          <option value="rejected">Refuser la demande</option>
        </select>
        {resolution ? (
          <input
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Précision (ex. remboursement effectué le...)"
            className={`${field} flex-1`}
          />
        ) : null}
      </div>
      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={busy || response.trim().length < 2}
        className="w-fit rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
      >
        {busy ? '…' : resolution ? 'Répondre et clore' : 'Envoyer la réponse'}
      </button>
    </div>
  );
}
