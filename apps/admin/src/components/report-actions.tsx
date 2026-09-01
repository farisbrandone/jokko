'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';

export function ReportActions({
  reportId,
  targetType,
}: {
  reportId: string;
  targetType: 'product' | 'shop';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: 'dismiss' | 'takedown') => {
    if (
      action === 'takedown' &&
      !confirm(
        targetType === 'product'
          ? 'Archiver ce produit et le retirer de la recherche ?'
          : 'Suspendre cette boutique ? Elle ne sera plus servie.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await post(`/api/proxy/admin/reports/${reportId}/resolve`, { action });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => act('takedown')}
        disabled={busy}
        className="rounded-[var(--radius-btn)] border border-[var(--color-danger)] text-[var(--color-danger)] px-2.5 py-1 text-xs disabled:opacity-60"
      >
        {targetType === 'product' ? 'Retirer le produit' : 'Suspendre la boutique'}
      </button>
      <button
        onClick={() => act('dismiss')}
        disabled={busy}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-1 text-xs disabled:opacity-60"
      >
        Rejeter
      </button>
    </div>
  );
}
