'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@jokko/ui';
import { post } from '@/lib/client';

export function BillingCheckout({ shopId, priceXof }: { shopId: string; priceXof: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Retour de la passerelle : ?tx_ref=…&status=successful → on confirme.
  useEffect(() => {
    const txRef = params.get('tx_ref');
    const status = params.get('status');
    if (!txRef || status !== 'successful') return;
    (async () => {
      try {
        await post(`/api/proxy/shops/${shopId}/billing/confirm`, { txRef });
        setMsg('Paiement confirmé. Merci !');
        router.replace(`/s/${shopId}/billing`);
        router.refresh();
      } catch {
        setMsg('Confirmation en attente — elle se fera automatiquement sous peu.');
      }
    })();
  }, [params, shopId, router]);

  const pay = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { url } = await post<{ url: string }>(
        `/api/proxy/shops/${shopId}/billing/checkout`,
        {},
      );
      window.location.href = url;
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={pay} disabled={busy} style={{ alignSelf: 'flex-start' }}>
        Payer {priceXof.toLocaleString('fr')} XOF / mois
      </Button>
      {msg ? <p className="text-xs text-[var(--color-muted)]">{msg}</p> : null}
    </div>
  );
}
