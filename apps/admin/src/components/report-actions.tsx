'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jokko/ui';
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
      <Button onClick={() => act('takedown')} disabled={busy} size="sm" variant="danger">
        {targetType === 'product' ? 'Retirer le produit' : 'Suspendre la boutique'}
      </Button>
      <Button onClick={() => act('dismiss')} disabled={busy} size="sm" variant="secondary">
        Rejeter
      </Button>
    </div>
  );
}
