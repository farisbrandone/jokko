'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jokko/ui';
import { post } from '@/lib/client';

export function VerificationActions({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const decide = async (action: 'approve' | 'reject') => {
    let note: string | null = null;
    if (action === 'reject') {
      note = prompt('Motif du refus (visible par le vendeur, facultatif) :');
      if (note === null) return; // annulé
    } else if (!confirm('Approuver cette demande et afficher le badge « Boutique vérifiée » ?')) {
      return;
    }
    setBusy(true);
    try {
      await post(`/api/proxy/admin/shop-verifications/${shopId}/decide`, { action, note });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={() => decide('approve')} disabled={busy} size="sm">
        Approuver
      </Button>
      <Button onClick={() => decide('reject')} disabled={busy} size="sm" variant="danger">
        Refuser
      </Button>
    </div>
  );
}
