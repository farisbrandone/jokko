'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jokko/ui';
import { post } from '@/lib/client';
import type { DisputeResolution } from '@/lib/types';

export function DisputeMediateForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [resolution, setResolution] = useState<DisputeResolution>('refund');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!confirm('Clore ce litige avec cette décision ? Cette action est définitive.')) return;
    setBusy(true);
    setErr(null);
    try {
      await post(`/api/proxy/admin/disputes/${disputeId}/mediate`, {
        resolution,
        note: note.trim() || null,
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
      <select
        value={resolution}
        onChange={(e) => setResolution(e.target.value as DisputeResolution)}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
      >
        <option value="refund">Remboursement</option>
        <option value="replacement">Remplacement</option>
        <option value="rejected">Rejeter la demande</option>
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Motif de la décision"
        className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
      />
      <Button onClick={submit} disabled={busy} size="sm">
        Clore le litige
      </Button>
      {err ? <p className="w-full text-sm text-[var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
